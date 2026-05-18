const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { Agent } = require('undici');

const MOODLE_REQUEST_TIMEOUT_MS = 15_000;
const MOODLE_USER_AGENT = 'AkaDash/1.0 (+https://github.com)';

const SECTIGO_PEM_PATH = path.join(
  __dirname,
  '..',
  'certs',
  'sectigo-public-server-auth-ca-dv-r36.pem'
);

let moodleDispatcher = null;
try {
  const sectigoPem = fs.readFileSync(SECTIGO_PEM_PATH, 'utf8');
  const caBundle = [...tls.rootCertificates, sectigoPem];
  moodleDispatcher = new Agent({ connect: { ca: caBundle } });
} catch (err) {
  console.warn(
    `[moodle] Sectigo intermediate PEM missing at ${SECTIGO_PEM_PATH} (${err.code || err.message}); falling back to Node default trust store. Atlas Moodle requests may fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE until the file is restored.`
  );
}

class MoodleError extends Error {
  constructor(message, { status = 502, errorcode = null } = {}) {
    super(message);
    this.status = status;
    this.errorcode = errorcode;
    this.code = 'MOODLE_ERROR';
  }
}

class MoodleNotConnectedError extends Error {
  constructor(message = 'Moodle not connected') {
    super(message);
    this.code = 'MOODLE_NOT_CONNECTED';
  }
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string') return '';
  let cleaned = baseUrl.trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/webservice\/rest\/server\.php$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

function isValidHttpUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

function appendArrayParams(params, key, values) {
  values.forEach((v, i) => {
    params.append(`${key}[${i}]`, String(v));
  });
}

function describeFetchFailure(err, hostname) {
  const cause = err && err.cause;
  const causeCode = cause && cause.code;
  const causeMsg = cause && cause.message;
  const target = hostname || 'Moodle';
  switch (causeCode) {
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `Could not reach Moodle (${causeCode} ${target}). Check the base URL.`;
    case 'ECONNREFUSED':
      return `Moodle refused the connection (${causeCode} ${target}). Check the base URL and server status.`;
    case 'ECONNRESET':
      return `Moodle reset the connection (${causeCode}). The server may be overloaded or behind a strict WAF.`;
    case 'ETIMEDOUT':
    case 'UND_ERR_CONNECT_TIMEOUT':
      return `Connection to Moodle timed out (${causeCode} ${target}).`;
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
    case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
    case 'CERT_HAS_EXPIRED':
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
      return `Moodle TLS error: ${causeCode}. The Moodle server appears to be missing an intermediate certificate; ask the Moodle admin to fix the chain.`;
    default:
      if (causeCode) return `Network error calling Moodle: ${causeCode}${causeMsg ? ` (${causeMsg})` : ''}`;
      if (err && err.name === 'AbortError') {
        return `Connection to Moodle timed out after ${MOODLE_REQUEST_TIMEOUT_MS}ms.`;
      }
      return `Network error calling Moodle: ${(err && err.message) || 'unknown error'}`;
  }
}

async function callMoodleRaw(baseUrl, token, wsfunction, params = {}) {
  const cleanedBase = normalizeBaseUrl(baseUrl);
  if (!cleanedBase) throw new MoodleError('Missing Moodle base URL', { status: 400 });
  if (!isValidHttpUrl(cleanedBase)) {
    throw new MoodleError(
      'Invalid Moodle base URL. It must start with http:// or https://',
      { status: 400 }
    );
  }
  if (!token) throw new MoodleError('Missing Moodle token', { status: 400 });

  const body = new URLSearchParams();
  body.set('wstoken', token);
  body.set('moodlewsrestformat', 'json');
  body.set('wsfunction', wsfunction);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      appendArrayParams(body, key, value);
    } else if (value !== undefined && value !== null) {
      body.set(key, String(value));
    }
  });

  const endpoint = `${cleanedBase}/webservice/rest/server.php`;
  let hostname = '';
  try {
    hostname = new URL(endpoint).hostname;
  } catch {
    hostname = '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOODLE_REQUEST_TIMEOUT_MS);

  let res;
  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: 'application/json',
        'User-Agent': MOODLE_USER_AGENT,
      },
      body,
      signal: controller.signal,
    };
    if (moodleDispatcher) fetchOptions.dispatcher = moodleDispatcher;
    res = await fetch(endpoint, fetchOptions);
  } catch (err) {
    throw new MoodleError(describeFetchFailure(err, hostname), { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new MoodleError(`Moodle HTTP ${res.status}`, { status: 502 });
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new MoodleError('Moodle returned non-JSON response', { status: 502 });
  }

  if (data && typeof data === 'object' && data.exception) {
    throw new MoodleError(data.message || data.errorcode || 'Moodle error', {
      status: 400,
      errorcode: data.errorcode || null,
    });
  }

  return data;
}

async function callMoodle(user, wsfunction, params) {
  if (!user || !user.moodleToken || !user.moodleBaseUrl) {
    throw new MoodleNotConnectedError();
  }
  return callMoodleRaw(user.moodleBaseUrl, user.moodleToken, wsfunction, params);
}

async function getSiteInfo(token, baseUrl) {
  return callMoodleRaw(baseUrl, token, 'core_webservice_get_site_info');
}

const MOODLE_LOGIN_ERROR_MAP = {
  invalidlogin: 'Wrong username or password.',
  enablewsdescription:
    "This Moodle account isn't allowed to use Web Services. Ask Atlas IT to enable the Moodle Mobile service for your account.",
  wsaccessusernotallowed:
    "This Moodle account isn't allowed to use Web Services. Ask Atlas IT to enable the Moodle Mobile service for your account.",
};

async function fetchTokenWithCredentials({ baseUrl, username, password }) {
  const cleanedBase = normalizeBaseUrl(baseUrl);
  if (!cleanedBase) throw new MoodleError('Missing Moodle base URL', { status: 400 });
  if (!isValidHttpUrl(cleanedBase)) {
    throw new MoodleError(
      'Invalid Moodle base URL. It must start with http:// or https://',
      { status: 400 }
    );
  }

  const body = new URLSearchParams();
  body.set('username', username);
  body.set('password', password);
  body.set('service', 'moodle_mobile_app');

  const endpoint = `${cleanedBase}/login/token.php`;
  let hostname = '';
  try {
    hostname = new URL(endpoint).hostname;
  } catch {
    hostname = '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOODLE_REQUEST_TIMEOUT_MS);

  let res;
  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: 'application/json',
        'User-Agent': MOODLE_USER_AGENT,
      },
      body,
      signal: controller.signal,
    };
    if (moodleDispatcher) fetchOptions.dispatcher = moodleDispatcher;
    res = await fetch(endpoint, fetchOptions);
  } catch (err) {
    throw new MoodleError(describeFetchFailure(err, hostname), { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new MoodleError(`Moodle HTTP ${res.status}`, { status: 502 });
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new MoodleError('Moodle returned non-JSON response', { status: 502 });
  }

  if (data && typeof data === 'object' && data.error) {
    const code = (data.errorcode || '').toString();
    const friendly = MOODLE_LOGIN_ERROR_MAP[code];
    const message = friendly || `Moodle: ${data.error}`;
    throw new MoodleError(message, { status: 400, errorcode: code || null });
  }

  if (!data || typeof data !== 'object' || !data.token) {
    throw new MoodleError('Moodle did not return a token', { status: 502 });
  }

  return {
    token: data.token,
    privatetoken: data.privatetoken || null,
    baseUrl: cleanedBase,
  };
}

function toIsoFromUnix(seconds) {
  if (!seconds || typeof seconds !== 'number') return null;
  if (seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function statusForAssignment(dueIso) {
  if (!dueIso) return 'no-due';
  const due = new Date(dueIso).getTime();
  if (Number.isNaN(due)) return 'no-due';
  if (due < Date.now()) return 'overdue';
  return 'upcoming';
}

async function getAssignments(user) {
  if (!user.moodleUserId) {
    const info = await callMoodle(user, 'core_webservice_get_site_info');
    user.moodleUserId = info.userid;
  }

  const courses = await callMoodle(user, 'core_enrol_get_users_courses', {
    userid: user.moodleUserId,
  });

  if (!Array.isArray(courses) || courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);
  const courseNameById = new Map(
    courses.map((c) => [c.id, c.fullname || c.shortname || `Course ${c.id}`])
  );

  const data = await callMoodle(user, 'mod_assign_get_assignments', {
    courseids: courseIds,
  });

  const items = [];
  const baseUrl = normalizeBaseUrl(user.moodleBaseUrl);

  for (const courseEntry of data?.courses || []) {
    const courseName =
      courseEntry.fullname ||
      courseNameById.get(courseEntry.id) ||
      `Course ${courseEntry.id}`;
    for (const a of courseEntry.assignments || []) {
      const dueIso = toIsoFromUnix(a.duedate);
      const url = a.cmid
        ? `${baseUrl}/mod/assign/view.php?id=${a.cmid}`
        : `${baseUrl}/course/view.php?id=${courseEntry.id}`;
      items.push({
        id: `moodle-assign-${a.id}`,
        source: 'moodle',
        courseId: courseEntry.id,
        courseName,
        title: a.name || 'Untitled assignment',
        dueAt: dueIso,
        url,
        status: statusForAssignment(dueIso),
      });
    }
  }

  return items;
}

async function getUpcoming(user) {
  let data;
  try {
    data = await callMoodle(
      user,
      'core_calendar_get_calendar_upcoming_view',
      { courseid: 1 }
    );
  } catch (err) {
    if (err instanceof MoodleError && err.status === 400) {
      data = await callMoodle(user, 'core_calendar_get_calendar_upcoming_view');
    } else {
      throw err;
    }
  }

  const events = data?.events || [];
  const baseUrl = normalizeBaseUrl(user.moodleBaseUrl);

  return events.map((ev) => {
    const dueIso = toIsoFromUnix(ev.timestart);
    return {
      id: `moodle-event-${ev.id}`,
      source: 'moodle',
      title: ev.name || 'Calendar event',
      dueAt: dueIso,
      url:
        ev.url ||
        (ev.course?.id
          ? `${baseUrl}/course/view.php?id=${ev.course.id}`
          : `${baseUrl}/calendar/view.php?view=upcoming`),
      courseName: ev.course?.fullname || null,
    };
  });
}

module.exports = {
  MoodleError,
  MoodleNotConnectedError,
  callMoodle,
  callMoodleRaw,
  getSiteInfo,
  getAssignments,
  getUpcoming,
  fetchTokenWithCredentials,
  normalizeBaseUrl,
};
