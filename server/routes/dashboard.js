const express = require('express');

const { requireAuth } = require('../middleware/auth');
const {
  listAcademicMessages,
  GmailScopeError,
  GmailNotConnectedError,
} = require('../services/gmail');
const {
  getAssignments,
  getUpcoming,
  MoodleError,
  MoodleNotConnectedError,
} = require('../services/moodle');
const { getUser, hasGmail, hasMoodle } = require('../store/userStore');

const router = express.Router();

async function loadMail(user) {
  if (!hasGmail(user)) {
    return { items: [], error: 'Gmail not connected', needsReconsent: true };
  }
  try {
    const items = await listAcademicMessages(user, { max: 20 });
    return { items, needsReconsent: false };
  } catch (err) {
    if (err instanceof GmailScopeError || err instanceof GmailNotConnectedError) {
      return { items: [], error: err.message, needsReconsent: true };
    }
    console.error('[dashboard] gmail load failed:', err.message || err);
    return { items: [], error: 'Failed to load mail' };
  }
}

async function loadMoodle(user) {
  if (!hasMoodle(user)) {
    return {
      assignments: [],
      deadlines: [],
      error: 'Moodle not connected',
    };
  }
  const result = { assignments: [], deadlines: [] };
  const errors = [];

  try {
    result.assignments = await getAssignments(user);
  } catch (err) {
    if (err instanceof MoodleNotConnectedError) {
      return {
        assignments: [],
        deadlines: [],
        error: 'Moodle not connected',
      };
    }
    const msg = err instanceof MoodleError ? err.message : 'assignments failed';
    console.error('[dashboard] moodle assignments failed:', msg);
    errors.push(`assignments: ${msg}`);
  }

  try {
    result.deadlines = await getUpcoming(user);
  } catch (err) {
    const msg = err instanceof MoodleError ? err.message : 'deadlines failed';
    console.error('[dashboard] moodle deadlines failed:', msg);
    errors.push(`deadlines: ${msg}`);
  }

  if (errors.length > 0) result.error = errors.join('; ');
  return result;
}

router.get('/', requireAuth, async (req, res) => {
  const user = getUser(req.auth.sub);
  const connections = {
    gmail: hasGmail(user),
    moodle: hasMoodle(user),
  };

  const [mail, moodle] = await Promise.all([loadMail(user), loadMoodle(user)]);

  res.json({
    user: { email: req.auth.email, name: req.auth.name },
    connections,
    mail,
    moodle,
    fetchedAt: new Date().toISOString(),
  });
});

module.exports = router;
