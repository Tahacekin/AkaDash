const express = require('express');
const passport = require('passport');

const {
  CLIENT_URL,
  googleConfigured,
  isProduction,
} = require('../config');
const { authenticateOptions } = require('../auth/google');
const { signToken, requireAuth } = require('../middleware/auth');
const { upsertUser, updateGoogleTokens, hasGmail, hasMoodle } = require('../store/userStore');

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
};

router.get('/status', (_req, res) => {
  res.json({ googleConfigured });
});

router.get('/google', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect(`${CLIENT_URL}/login?error=config`);
  }
  passport.authenticate('google', authenticateOptions)(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect(`${CLIENT_URL}/login?error=config`);
  }
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[auth] google callback error:', err.message || err);
      return res.redirect(`${CLIENT_URL}/login?error=auth`);
    }
    if (!user) {
      const code = info?.message === 'INVALID_DOMAIN' ? 'domain' : 'auth';
      return res.redirect(`${CLIENT_URL}/login?error=${code}`);
    }

    try {
      upsertUser(user.sub, {
        email: user.email,
        displayName: user.displayName,
      });
      updateGoogleTokens(user.sub, {
        accessToken: user.tokens.accessToken,
        refreshToken: user.tokens.refreshToken,
        expiresInSec: user.tokens.expiresInSec,
        scopes: user.tokens.scopes,
      });
    } catch (storeErr) {
      console.error('[auth] store error:', storeErr.message || storeErr);
    }

    const token = signToken({
      sub: user.sub,
      email: user.email,
      displayName: user.displayName,
    });
    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(`${CLIENT_URL}/`);
  })(req, res, next);
});

router.get('/me', requireAuth, (req, res) => {
  const record = req.userRecord;
  res.json({
    user: {
      email: req.auth.email,
      name: req.auth.name,
    },
    connections: {
      gmail: hasGmail(record),
      moodle: hasMoodle(record),
    },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ ok: true });
});

module.exports = router;
