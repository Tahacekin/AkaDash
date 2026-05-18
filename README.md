# AkaDash

A dashboard for Atlas University students that pulls **academic mail from their
school Google account** and **assignments & deadlines from Moodle** into one
live view, so they stop tab-hopping between Gmail and Moodle to track work.

## What it does

- Signs you in with your `@st.atlas.edu.tr` Google Workspace account
  (other domains are rejected at the OAuth callback).
- Uses the Gmail API (read-only) to surface recent academic-looking messages
  from your school inbox (assignments, exams, course announcements).
- Uses the Moodle Web Services REST API to fetch your enrolled courses,
  upcoming assignments, and calendar events.
- Aggregates both sources on one dashboard with relative time labels and
  due-soon / overdue highlighting. The dashboard refreshes itself every 60
  seconds and you can hit Refresh at any time.

## Architecture

```
client/                 React 19 + Vite app (port 5173)
  src/
    pages/              Login + Dashboard
    components/         Dashboard sections, Connect cards, AppShell
    lib/api.js          fetch wrapper that always sends the JWT cookie
    utils/time.js       Relative time + urgency helpers

server.js               Thin entry point that boots server/app.js
server/
  config.js             Loads env, validates, exports config
  app.js                Wires Express + routes + Passport
  auth/google.js        Passport Google strategy (gmail.readonly scope)
  middleware/auth.js    JWT cookie verification
  store/userStore.js    In-memory user store (TODO: replace with a DB)
  services/gmail.js     googleapis client + academic-mail heuristics
  services/moodle.js    Moodle REST helper + assignment/calendar fetchers
  routes/
    auth.js             /api/auth/{status,google,google/callback,me,logout}
    mail.js             /api/mail/items
    moodle.js           /api/moodle/{status,connect,disconnect,assignments,deadlines}
    dashboard.js        /api/dashboard (aggregate, never 500s)

scripts/dev.cjs         Spawns API (Express) + Vite together for `npm run dev`
```

## Setup

### 1. Install deps

```bash
npm install
npm install --prefix client
```

### 2. Configure Google Cloud (OAuth 2.0 + Gmail API)

1. Open the [Google Cloud Console](https://console.cloud.google.com/),
   pick (or create) a project.
2. **APIs & Services → Library →** enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: Internal (for an Atlas Workspace project) or External (testing).
   - Add scopes: `openid`, `email`, `profile`, and
     `https://www.googleapis.com/auth/gmail.readonly`.
   - If you stay in test mode, add your `@st.atlas.edu.tr` address as a test user.
4. **APIs & Services → Credentials → Create credentials → OAuth Client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
     (must match `GOOGLE_CALLBACK_URL` in your `.env`).

### 3. Fill in `.env`

Copy `.env.example` to `.env` and fill in:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=<long random string>
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
MOODLE_DEFAULT_BASE_URL=https://moodle.atlas.edu.tr
NODE_ENV=development
```

### 4. Run

```bash
npm run dev
```

This starts the Express API on `http://localhost:3000` and the Vite dev server
on `http://localhost:5173`. Open the Vite URL and sign in with your school
Google account.

> When you sign in for the first time, Google will ask you to grant the Gmail
> read-only scope on top of basic profile. If you previously signed in with the
> old (profile-only) build, click **Connect with Google** on the dashboard to
> re-consent with the new scopes.

## Connecting Moodle

Moodle does not federate through Google, so AkaDash signs in for you on the
backend the first time:

1. On the dashboard, fill in the **Connect Moodle** card with your Moodle
   username and password. The base URL field is pre-filled with
   `MOODLE_DEFAULT_BASE_URL` (default `https://mylms.atlas.edu.tr`) and only
   needs to change if you're on a different instance.
2. Click **Sign in to Moodle**. The AkaDash backend POSTs your credentials to
   Moodle's `/login/token.php`, exchanges them for a personal access token,
   validates the token via `core_webservice_get_site_info`, and stores **only
   the token** in the in-memory user store. Your password is never logged,
   never returned to the client, and never persisted.
3. If credential login fails (for example, Web Services aren't enabled for
   your account), expand **Use an existing token instead** and paste a
   pre-existing token from **Profile → Preferences → User account → Security
   keys** in Moodle.

AkaDash validates the token by calling `core_webservice_get_site_info`. On
success the dashboard immediately fetches:

- `core_enrol_get_users_courses` → your enrolled courses
- `mod_assign_get_assignments` → upcoming / past assignments
- `core_calendar_get_calendar_upcoming_view` → calendar events

## API surface

All endpoints below require the JWT cookie set during Google sign-in
(`401 Unauthorized` otherwise), except `/api/auth/status`.

| Method | Path                          | Purpose                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/auth/status`            | Whether Google OAuth is configured.      |
| GET    | `/api/auth/google`            | Start Google sign-in (offline+consent).  |
| GET    | `/api/auth/google/callback`   | OAuth redirect target, sets JWT cookie.  |
| GET    | `/api/auth/me`                | Current user + connection flags.         |
| POST   | `/api/auth/logout`            | Clear the JWT cookie.                    |
| GET    | `/api/mail/items`             | Recent academic mail (412 if no scope).  |
| GET    | `/api/moodle/status`          | Whether Moodle is connected.             |
| POST   | `/api/moodle/login`           | `{ baseUrl?, username, password }` → exchanges credentials for a Moodle token server-side and persists the token. Password is never logged or stored. |
| POST   | `/api/moodle/connect`         | `{ token, baseUrl? }` → validate + save. |
| POST   | `/api/moodle/disconnect`      | Forget the stored Moodle token.          |
| GET    | `/api/moodle/assignments`     | Normalized assignment list.              |
| GET    | `/api/moodle/deadlines`       | Upcoming calendar events.                |
| GET    | `/api/dashboard`              | Aggregated mail + Moodle + connections.  |

## Known limitations / TODO

- **Dev server is plain HTTP.** That's fine on localhost, but Moodle credentials
  should only be entered when the dev server is running locally. Use HTTPS in
  production before exposing the credential-login flow over the network.
- **Moodle TLS workaround.** Atlas Moodle (`mylms.atlas.edu.tr`) currently serves
  an incomplete TLS chain — it omits the `Sectigo Public Server Authentication
  CA DV R36` intermediate, so Node's default `fetch` rejects the handshake with
  `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. We bundle that public intermediate at
  `server/certs/sectigo-public-server-auth-ca-dv-r36.pem` and trust it **only**
  for outbound calls to Moodle, via a scoped `undici` dispatcher inside
  `server/services/moodle.js`. Node's global trust store is untouched, no
  `NODE_TLS_REJECT_UNAUTHORIZED` flag is set, and no other outbound HTTP traffic
  is affected. Delete the PEM and the dispatcher once Atlas IT serves the
  intermediate themselves.
- **In-memory user store.** Tokens live in `server/store/userStore.js` and are
  lost on every server restart. After a restart you may need to sign in again
  to refresh the Google session, and you will need to re-paste your Moodle
  token. Replace with a real DB before deploying.
- **Polling, not push.** The dashboard polls `/api/dashboard` every 60s. There
  is no websocket / push channel yet. The Gmail Watch API could replace this.
- **Gmail heuristic.** Academic mail detection is a query for "newer_than:30d
  and (from Moodle / @atlas.edu.tr / subject contains assignment / homework /
  deadline / exam / ödev / sınav / teslim / duyuru / ders / proje / project)".
  Each returned item also gets a `category` (`homework`, `project`, `exam`,
  `deadline`, or `other`), derived from the subject + snippet so the dashboard
  can filter without re-querying Gmail. Tune `GMAIL_QUERY` and the
  `categorizeMail` helper in `server/services/gmail.js` for your environment.
- **No SSO bridge to Moodle.** If Atlas exposes SAML/OIDC for Moodle in the
  future, swap the token form for a federated flow; the rest of the Moodle
  service code stays unchanged.

## Scripts

- `npm run dev` — API + Vite together (the script you actually want).
- `npm run dev:server` — just the Express API.
- `npm run dev:client` — just the Vite client.
- `npm start` — Express API alone (production-style).
- `npm run build` — Build the client for production.
