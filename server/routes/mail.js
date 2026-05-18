const express = require('express');

const { requireAuth } = require('../middleware/auth');
const {
  listAcademicMessages,
  GmailScopeError,
  GmailNotConnectedError,
} = require('../services/gmail');

const router = express.Router();

router.get('/items', requireAuth, async (req, res) => {
  const user = req.userRecord;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const items = await listAcademicMessages(user, { max: 25 });
    res.json({ items, needsReconsent: false });
  } catch (err) {
    if (err instanceof GmailScopeError) {
      return res.status(412).json({
        items: [],
        needsReconsent: true,
        error: 'Gmail scope not granted',
      });
    }
    if (err instanceof GmailNotConnectedError) {
      return res.status(412).json({
        items: [],
        needsReconsent: true,
        error: 'Gmail not connected',
      });
    }
    console.error('[mail] /items failed:', err.message || err);
    res
      .status(502)
      .json({ items: [], needsReconsent: false, error: 'Failed to load mail' });
  }
});

module.exports = router;
