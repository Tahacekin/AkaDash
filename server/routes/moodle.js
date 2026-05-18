const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { MOODLE_DEFAULT_BASE_URL } = require('../config');
const {
  getSiteInfo,
  getAssignments,
  getUpcoming,
  fetchTokenWithCredentials,
  normalizeBaseUrl,
  MoodleError,
  MoodleNotConnectedError,
} = require('../services/moodle');
const {
  getUser,
  setMoodleConnection,
  clearMoodleConnection,
  hasMoodle,
} = require('../store/userStore');

const router = express.Router();

router.get('/status', requireAuth, (req, res) => {
  const record = req.userRecord;
  res.json({
    connected: hasMoodle(record),
    baseUrl: record?.moodleBaseUrl || null,
    defaultBaseUrl: MOODLE_DEFAULT_BASE_URL,
    siteName: record?.moodleSiteName || null,
    fullName: record?.moodleFullName || null,
  });
});

router.post('/connect', requireAuth, async (req, res) => {
  const { token, baseUrl } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing Moodle token' });
  }
  const resolvedBaseUrl =
    (typeof baseUrl === 'string' && baseUrl.trim()) || MOODLE_DEFAULT_BASE_URL;

  try {
    const info = await getSiteInfo(token.trim(), resolvedBaseUrl);
    if (!info || typeof info !== 'object' || !info.userid) {
      return res
        .status(400)
        .json({ error: 'Unexpected response from Moodle (no userid)' });
    }
    setMoodleConnection(req.auth.sub, {
      token: token.trim(),
      baseUrl: resolvedBaseUrl.replace(/\/+$/, ''),
      siteName: info.sitename || null,
      fullName: info.fullname || null,
      moodleUserId: info.userid,
    });
    res.json({
      connected: true,
      siteName: info.sitename || null,
      fullName: info.fullname || null,
      baseUrl: resolvedBaseUrl,
    });
  } catch (err) {
    if (err instanceof MoodleError) {
      return res.status(400).json({ error: err.message, errorcode: err.errorcode });
    }
    console.error('[moodle] /connect failed:', err.message || err);
    res.status(502).json({ error: 'Failed to validate Moodle token' });
  }
});

const MAX_USERNAME_LEN = 256;
const MAX_PASSWORD_LEN = 1024;

router.post('/login', requireAuth, async (req, res) => {
  const body = req.body || {};
  const rawBaseUrl = typeof body.baseUrl === 'string' ? body.baseUrl : '';
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username.trim() || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.length > MAX_USERNAME_LEN) {
    return res.status(400).json({ error: 'Username is too long.' });
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return res.status(400).json({ error: 'Password is too long.' });
  }

  const resolvedBaseUrl =
    (rawBaseUrl && rawBaseUrl.trim()) || MOODLE_DEFAULT_BASE_URL;

  try {
    const { token, baseUrl: cleanedBase } = await fetchTokenWithCredentials({
      baseUrl: resolvedBaseUrl,
      username: username.trim(),
      password,
    });

    const info = await getSiteInfo(token, cleanedBase);
    if (!info || typeof info !== 'object' || !info.userid) {
      return res
        .status(400)
        .json({ error: 'Unexpected response from Moodle (no userid)' });
    }

    setMoodleConnection(req.auth.sub, {
      token,
      baseUrl: normalizeBaseUrl(cleanedBase),
      siteName: info.sitename || null,
      fullName: info.fullname || null,
      moodleUserId: info.userid,
    });

    return res.json({
      connected: true,
      siteName: info.sitename || null,
      fullname: info.fullname || null,
    });
  } catch (err) {
    if (err instanceof MoodleError) {
      return res
        .status(err.status || 400)
        .json({ error: err.message, errorcode: err.errorcode || null });
    }
    console.error('[moodle] /login failed:', err && err.message ? err.message : 'unknown');
    return res.status(502).json({ error: 'Failed to sign in to Moodle.' });
  }
});

router.post('/disconnect', requireAuth, (req, res) => {
  clearMoodleConnection(req.auth.sub);
  res.json({ connected: false });
});

router.get('/assignments', requireAuth, async (req, res) => {
  const user = getUser(req.auth.sub);
  if (!hasMoodle(user)) {
    return res
      .status(412)
      .json({ items: [], connected: false, error: 'Moodle not connected' });
  }
  try {
    const items = await getAssignments(user);
    res.json({ items, connected: true });
  } catch (err) {
    if (err instanceof MoodleNotConnectedError) {
      return res
        .status(412)
        .json({ items: [], connected: false, error: 'Moodle not connected' });
    }
    if (err instanceof MoodleError) {
      console.error('[moodle] /assignments failed:', err.message);
      return res
        .status(err.status || 502)
        .json({ items: [], connected: true, error: err.message });
    }
    console.error('[moodle] /assignments failed:', err.message || err);
    res
      .status(502)
      .json({ items: [], connected: true, error: 'Failed to load assignments' });
  }
});

router.get('/deadlines', requireAuth, async (req, res) => {
  const user = getUser(req.auth.sub);
  if (!hasMoodle(user)) {
    return res
      .status(412)
      .json({ items: [], connected: false, error: 'Moodle not connected' });
  }
  try {
    const items = await getUpcoming(user);
    res.json({ items, connected: true });
  } catch (err) {
    if (err instanceof MoodleNotConnectedError) {
      return res
        .status(412)
        .json({ items: [], connected: false, error: 'Moodle not connected' });
    }
    if (err instanceof MoodleError) {
      console.error('[moodle] /deadlines failed:', err.message);
      return res
        .status(err.status || 502)
        .json({ items: [], connected: true, error: err.message });
    }
    console.error('[moodle] /deadlines failed:', err.message || err);
    res
      .status(502)
      .json({ items: [], connected: true, error: 'Failed to load deadlines' });
  }
});

module.exports = router;
