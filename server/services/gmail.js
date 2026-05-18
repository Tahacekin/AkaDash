const { google } = require('googleapis');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} = require('../config');
const { updateGoogleTokens } = require('../store/userStore');

class GmailScopeError extends Error {
  constructor(message = 'Gmail scope not granted') {
    super(message);
    this.code = 'GMAIL_NEEDS_RECONSENT';
  }
}

class GmailNotConnectedError extends Error {
  constructor(message = 'Gmail not connected') {
    super(message);
    this.code = 'GMAIL_NOT_CONNECTED';
  }
}

const GMAIL_QUERY = [
  'newer_than:30d',
  '(',
  'from:moodle',
  'OR from:noreply',
  'OR from:@atlas.edu.tr',
  'OR subject:(assignment OR homework OR deadline OR exam',
  'OR ödev OR sınav OR teslim OR duyuru OR ders',
  'OR proje OR project)',
  ')',
].join(' ');

const MAIL_CATEGORIES = ['homework', 'project', 'exam', 'deadline', 'other'];

function categorizeMail(subject, snippet) {
  const haystack = `${subject || ''} ${snippet || ''}`.toLocaleLowerCase('tr');
  if (haystack.includes('ödev') || haystack.includes('homework')) return 'homework';
  if (haystack.includes('proje') || haystack.includes('project')) return 'project';
  if (
    haystack.includes('sınav') ||
    haystack.includes('exam') ||
    haystack.includes('quiz') ||
    haystack.includes('vize') ||
    haystack.includes('final')
  ) {
    return 'exam';
  }
  if (
    haystack.includes('deadline') ||
    haystack.includes('teslim') ||
    haystack.includes('son tarih')
  ) {
    return 'deadline';
  }
  return 'other';
}

function buildOAuthClient(user) {
  if (!user || (!user.googleRefreshToken && !user.googleAccessToken)) {
    throw new GmailNotConnectedError();
  }
  if (!(user.googleScopes || []).some((s) => s.endsWith('/gmail.readonly'))) {
    throw new GmailScopeError();
  }

  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL
  );
  client.setCredentials({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken || undefined,
    expiry_date: user.googleAccessTokenExpiresAt || undefined,
    scope: (user.googleScopes || []).join(' ') || undefined,
  });

  client.on('tokens', (tokens) => {
    try {
      const expiresInSec =
        typeof tokens.expiry_date === 'number'
          ? Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000))
          : null;
      updateGoogleTokens(user.sub, {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        expiresInSec,
        scopes: user.googleScopes,
      });
    } catch (err) {
      console.error('[gmail] failed to persist refreshed token:', err.message);
    }
  });

  return client;
}

function pickHeader(headers, name) {
  const lower = name.toLowerCase();
  const found = headers.find((h) => (h.name || '').toLowerCase() === lower);
  return found ? found.value : '';
}

function normalizeMessage(msg) {
  const headers = msg.payload?.headers || [];
  const subject = pickHeader(headers, 'Subject') || '(no subject)';
  const from = pickHeader(headers, 'From') || '';
  const dateHeader = pickHeader(headers, 'Date');
  const internalDate = msg.internalDate ? Number(msg.internalDate) : null;
  const receivedAt = internalDate
    ? new Date(internalDate).toISOString()
    : dateHeader
    ? new Date(dateHeader).toISOString()
    : new Date().toISOString();
  const snippet = (msg.snippet || '').replace(/\s+/g, ' ').trim();
  return {
    id: msg.id,
    source: 'mail',
    title: subject,
    snippet,
    from,
    receivedAt,
    link: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    category: categorizeMail(subject, snippet),
  };
}

async function listAcademicMessages(user, { max = 20 } = {}) {
  const auth = buildOAuthClient(user);
  const gmail = google.gmail({ version: 'v1', auth });

  let listRes;
  try {
    listRes = await gmail.users.messages.list({
      userId: 'me',
      q: GMAIL_QUERY,
      maxResults: max,
    });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new GmailScopeError(
        'Gmail responded ' + status + ' — re-consent likely needed'
      );
    }
    throw err;
  }

  const ids = (listRes.data.messages || []).map((m) => m.id);
  if (ids.length === 0) return [];

  const metaPromises = ids.map((id) =>
    gmail.users.messages
      .get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })
      .then((r) => r.data)
      .catch((err) => {
        console.error('[gmail] message fetch failed:', err.message || err);
        return null;
      })
  );

  const settled = await Promise.all(metaPromises);
  return settled.filter(Boolean).map(normalizeMessage);
}

module.exports = {
  GmailScopeError,
  GmailNotConnectedError,
  listAcademicMessages,
  MAIL_CATEGORIES,
  categorizeMail,
};
