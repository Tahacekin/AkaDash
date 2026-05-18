const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const { CLIENT_URL, googleConfigured } = require('./config');
const { initGoogleStrategy } = require('./auth/google');

const authRoutes = require('./routes/auth');
const mailRoutes = require('./routes/mail');
const moodleRoutes = require('./routes/moodle');
const dashboardRoutes = require('./routes/dashboard');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  if (googleConfigured) {
    initGoogleStrategy();
  } else {
    console.warn(
      '[AkaDash] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
    );
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/mail', mailRoutes);
  app.use('/api/moodle', moodleRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.get('/health', (_req, res) => res.json({ ok: true }));

  return app;
}

module.exports = { createApp };
