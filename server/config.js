const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function envTrim(key) {
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = envTrim('CLIENT_URL') || 'http://localhost:5173';
const JWT_SECRET = envTrim('JWT_SECRET') || 'dev-only-change-in-production';
const NODE_ENV = envTrim('NODE_ENV') || 'development';
const ALLOWED_DOMAIN = '@st.atlas.edu.tr';

const GOOGLE_CLIENT_ID = envTrim('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = envTrim('GOOGLE_CLIENT_SECRET');
const GOOGLE_CALLBACK_URL =
  envTrim('GOOGLE_CALLBACK_URL') ||
  `http://localhost:${PORT}/api/auth/google/callback`;

const MOODLE_DEFAULT_BASE_URL =
  envTrim('MOODLE_DEFAULT_BASE_URL') || 'https://mylms.atlas.edu.tr';

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const googleConfigured = Boolean(GOOGLE_CLIENT_ID) && Boolean(GOOGLE_CLIENT_SECRET);

module.exports = {
  PORT,
  CLIENT_URL,
  JWT_SECRET,
  NODE_ENV,
  ALLOWED_DOMAIN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  GOOGLE_SCOPES,
  MOODLE_DEFAULT_BASE_URL,
  googleConfigured,
  isProduction: NODE_ENV === 'production',
};
