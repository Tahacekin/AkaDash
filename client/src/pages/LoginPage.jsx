import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

async function fetchAuthStatus() {
  const parse = async (res) => {
    if (!res.ok) throw new Error('bad status');
    return res.json();
  };
  try {
    return await parse(await fetch('/api/auth/status'));
  } catch {
    return await parse(await fetch('http://127.0.0.1:3000/api/auth/status'));
  }
}

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [flashError] = useState(() => searchParams.get('error'));
  const [apiStatus, setApiStatus] = useState(
    /** @type {'loading' | 'ok' | 'no_oauth' | 'error'} */ ('loading')
  );

  useEffect(() => {
    if (searchParams.get('error')) {
      setSearchParams({}, { replace: true });
    }
    // Intentionally only run on mount: we snapshot the URL error once via the
    // initial state above, then strip the query so it does not stick around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAuthStatus()
      .then((d) => {
        if (cancelled) return;
        setApiStatus(d.googleConfigured ? 'ok' : 'no_oauth');
      })
      .catch(() => {
        if (!cancelled) setApiStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const errorMessage = useMemo(() => {
    const error = flashError;
    if (!error) return null;
    if (error === 'domain') {
      return 'Only @st.atlas.edu.tr school accounts can sign in.';
    }
    if (error === 'config') {
      return 'Sign-in is not configured on the server yet. Add Google OAuth credentials to .env (see .env.example).';
    }
    return 'Sign-in failed. Try again or use your school Google account.';
  }, [flashError]);

  if (loading) {
    return (
      <div className="login-loading">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-page__panel login-page__panel--brand">
        <p className="login-brand__eyebrow">Atlas · Brief</p>
        <h1 className="login-brand__title">
          Every assignment,
          <br />
          one calm view.
        </h1>
        <p className="login-brand__body">
          Pull Moodle due dates and deadline hints from your school inbox into a
          single countdown dashboard—no more tab-hopping.
        </p>
      </div>
      <div className="login-page__panel login-page__panel--action">
        <div className="login-card">
          <h2 className="login-card__title">Sign in</h2>
          <p className="login-card__hint">
            Use your <strong>@st.atlas.edu.tr</strong> Google Workspace account.
          </p>

          {apiStatus === 'loading' ? (
            <p className="login-hint login-hint--muted">Checking server…</p>
          ) : null}

          {apiStatus === 'error' ? (
            <div className="login-error" role="status">
              Cannot reach the API (port 3000). Run <code>npm run dev</code> from
              the project root and keep the terminal open. If the server exits
              immediately, use the latest <code>package.json</code> dev script
              (includes <code>concurrently -r</code>).
            </div>
          ) : null}

          {apiStatus === 'no_oauth' && !errorMessage ? (
            <div className="login-error" role="alert">
              Google OAuth is not loaded on the server. Set{' '}
              <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>{' '}
              in <code>.env</code> next to <code>server.js</code>, then restart
              the dev server.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="login-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {apiStatus === 'ok' && !flashError ? (
            <p className="login-hint login-hint--ok">Server ready — you can sign in.</p>
          ) : null}

          <a className="btn-google" href="/api/auth/google">
            <GoogleIcon />
            Continue with Google (school account)
          </a>

          <p className="login-card__footer">
            By continuing you agree to use only your university-provided account.
          </p>
        </div>
        <p className="login-page__back text-dim">
          After sign-in you will land on your deadline dashboard.
        </p>
      </div>
    </div>
  );
}
