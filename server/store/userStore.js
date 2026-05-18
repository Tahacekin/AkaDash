/**
 * In-memory user store. Resets on server restart.
 * TODO: replace with a real database (Postgres / SQLite / Redis) so connections
 * survive restarts and multiple instances. Never log token values from here.
 *
 * Record shape (per user, keyed by Google `sub`):
 *   {
 *     sub: string,                    // Google subject id (stable per user)
 *     email: string,                  // lowercased school email
 *     displayName: string,
 *     googleAccessToken: string|null,
 *     googleRefreshToken: string|null,
 *     googleAccessTokenExpiresAt: number|null,  // epoch ms
 *     googleScopes: string[],         // scopes granted on last sign-in
 *     moodleToken: string|null,
 *     moodleBaseUrl: string|null,
 *     moodleSiteName: string|null,
 *     moodleFullName: string|null,
 *     moodleUserId: number|null,
 *   }
 */

const users = new Map();

function emptyRecord(sub) {
  return {
    sub,
    email: '',
    displayName: '',
    googleAccessToken: null,
    googleRefreshToken: null,
    googleAccessTokenExpiresAt: null,
    googleScopes: [],
    moodleToken: null,
    moodleBaseUrl: null,
    moodleSiteName: null,
    moodleFullName: null,
    moodleUserId: null,
  };
}

function upsertUser(sub, patch) {
  if (!sub) throw new Error('upsertUser requires sub');
  const existing = users.get(sub) || emptyRecord(sub);
  const next = { ...existing, ...patch, sub };
  users.set(sub, next);
  return next;
}

function getUser(sub) {
  if (!sub) return null;
  return users.get(sub) || null;
}

function updateGoogleTokens(sub, { accessToken, refreshToken, expiresInSec, scopes }) {
  const existing = users.get(sub) || emptyRecord(sub);
  const patch = {
    googleAccessToken: accessToken ?? existing.googleAccessToken ?? null,
    googleRefreshToken:
      refreshToken && refreshToken.length > 0
        ? refreshToken
        : existing.googleRefreshToken ?? null,
    googleAccessTokenExpiresAt:
      typeof expiresInSec === 'number'
        ? Date.now() + Math.max(0, expiresInSec - 60) * 1000
        : existing.googleAccessTokenExpiresAt ?? null,
    googleScopes: Array.isArray(scopes) ? scopes : existing.googleScopes,
  };
  return upsertUser(sub, patch);
}

function setMoodleConnection(sub, { token, baseUrl, siteName, fullName, moodleUserId }) {
  return upsertUser(sub, {
    moodleToken: token,
    moodleBaseUrl: baseUrl,
    moodleSiteName: siteName ?? null,
    moodleFullName: fullName ?? null,
    moodleUserId: moodleUserId ?? null,
  });
}

function clearMoodleConnection(sub) {
  return upsertUser(sub, {
    moodleToken: null,
    moodleBaseUrl: null,
    moodleSiteName: null,
    moodleFullName: null,
    moodleUserId: null,
  });
}

function hasGmail(user) {
  if (!user) return false;
  if (!user.googleRefreshToken && !user.googleAccessToken) return false;
  return (user.googleScopes || []).some((s) => s.endsWith('/gmail.readonly'));
}

function hasMoodle(user) {
  return Boolean(user && user.moodleToken && user.moodleBaseUrl);
}

module.exports = {
  upsertUser,
  getUser,
  updateGoogleTokens,
  setMoodleConnection,
  clearMoodleConnection,
  hasGmail,
  hasMoodle,
};
