const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production';
const ALLOWED_DOMAIN = '@st.atlas.edu.tr';

function envTrim(key) {
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

const googleClientId = envTrim('GOOGLE_CLIENT_ID');
const googleClientSecret = envTrim('GOOGLE_CLIENT_SECRET');
const googleCallbackUrl =
  envTrim('GOOGLE_CALLBACK_URL') ||
  `http://localhost:${port}/api/auth/google/callback`;

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

const googleConfigured = Boolean(googleClientId) && Boolean(googleClientSecret);

if (googleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
          return done(null, false, { message: 'INVALID_DOMAIN' });
        }
        return done(null, {
          id: profile.id,
          email,
          name: profile.displayName || email.split('@')[0],
        });
      }
    )
  );
} else {
  console.warn(
    '[Brief] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
  );
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/api/auth/status', (_req, res) => {
  res.json({ googleConfigured });
});

app.get('/api/auth/google', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect(`${CLIENT_URL}/login?error=config`);
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect(`${CLIENT_URL}/login?error=config`);
  }
  passport.authenticate(
      'google',
      { session: false },
      (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          const code = info?.message === 'INVALID_DOMAIN' ? 'domain' : 'auth';
          return res.redirect(`${CLIENT_URL}/login?error=${code}`);
        }
        const token = signToken(user);
        res.cookie('token', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.redirect(`${CLIENT_URL}/`);
      }
    )(req, res, next);
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      email: req.user.email,
      name: req.user.name,
    },
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ ok: true });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API at http://localhost:${port}`);
});
