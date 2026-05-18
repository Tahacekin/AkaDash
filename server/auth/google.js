const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const {
  ALLOWED_DOMAIN,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SCOPES,
  googleConfigured,
} = require('../config');

let initialized = false;

function initGoogleStrategy() {
  if (initialized || !googleConfigured) return;
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      (accessToken, refreshToken, params, profile, done) => {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
          return done(null, false, { message: 'INVALID_DOMAIN' });
        }
        const scopeStr =
          (params && typeof params.scope === 'string' && params.scope) || '';
        const grantedScopes = scopeStr ? scopeStr.split(/\s+/).filter(Boolean) : [];
        return done(null, {
          sub: profile.id,
          email,
          displayName: profile.displayName || email.split('@')[0],
          tokens: {
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            expiresInSec:
              params && typeof params.expires_in === 'number'
                ? params.expires_in
                : null,
            scopes: grantedScopes,
          },
        });
      }
    )
  );
  initialized = true;
}

const authenticateOptions = {
  scope: GOOGLE_SCOPES,
  accessType: 'offline',
  prompt: 'consent',
  session: false,
  includeGrantedScopes: true,
};

module.exports = {
  initGoogleStrategy,
  authenticateOptions,
};
