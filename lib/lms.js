/**
 * Atlas LMS (Moodle) — ödev listesi.
 * MOODLE_TOKEN yoksa mock veri; varsa webservice/rest/server.php üzerinden canlı veri.
 * Site yöneticisi gerekli wsfunction'ları hizmete eklemelidir.
 */

const MOODLE_BASE =
  process.env.MOODLE_URL?.replace(/\/$/, '') || 'https://mylms.atlas.edu.tr';

const REQUIRED_FUNCTIONS =
  'core_webservice_get_site_info, core_enrol_get_users_courses, mod_assign_get_assignments';

function mockAssignments() {
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  return [
    {
      id: 'mock-1',
      courseName: 'Örnek ders',
      title: 'Ödev 1 — Mock veri',
      dueAt: inThreeDays,
      assignmentUrl: `${MOODLE_BASE}/`,
    },
    {
      id: 'mock-2',
      courseName: 'Atlas LMS',
      title: 'MOODLE_TOKEN eklenince canlı veri gelecek',
      dueAt: nextWeek,
      assignmentUrl: `${MOODLE_BASE}/`,
    },
  ];
}

/**
 * @param {string} token
 * @param {string} wsfunction
 * @param {Record<string, string | number | string[] | number[]>} params
 */
async function moodleCall(token, wsfunction, params = {}) {
  const u = new URL(`${MOODLE_BASE}/webservice/rest/server.php`);
  u.searchParams.set('wstoken', token);
  u.searchParams.set('wsfunction', wsfunction);
  u.searchParams.set('moodlewsrestformat', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        u.searchParams.set(`${key}[${i}]`, String(item));
      });
    } else if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(u);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Moodle yanıtı okunamadı (JSON değil). Başlangıç: ${text.slice(0, 180)}`
    );
  }

  if (data.exception) {
    const msg = data.message || data.debuginfo || data.exception;
    throw new Error(
      typeof msg === 'string' ? msg : JSON.stringify(msg)
    );
  }

  return data;
}

/**
 * @param {string} token
 */
async function fetchLiveAssignments(token) {
  const site = await moodleCall(token, 'core_webservice_get_site_info');
  const userId = site.userid;
  if (!userId) {
    throw new Error('Moodle: kullanıcı id alınamadı (token geçersiz olabilir).');
  }

  const courses = await moodleCall(token, 'core_enrol_get_users_courses', {
    userid: userId,
  });

  if (!Array.isArray(courses) || courses.length === 0) {
    return {
      source: 'moodle',
      moodleBaseUrl: MOODLE_BASE,
      assignments: [],
      hint: 'Kayıtlı ders bulunamadı veya henüz atanmış ödev yok.',
    };
  }

  const courseIds = courses.map((c) => c.id);
  const assignPayload = await moodleCall(token, 'mod_assign_get_assignments', {
    courseids: courseIds,
  });

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const assignments = [];

  const assignCourses = assignPayload?.courses || [];
  for (const block of assignCourses) {
    const course = courseById.get(block.id);
    const courseName =
      course?.fullname || course?.shortname || `Ders ${block.id}`;
    const list = block.assignments || [];

    for (const a of list) {
      const cmid = a.cmid;
      const dueTs = a.duedate ? Number(a.duedate) : 0;
      assignments.push({
        id: String(a.id ?? cmid),
        courseName,
        title: a.name || 'Ödev',
        dueAt: dueTs > 0 ? new Date(dueTs * 1000).toISOString() : null,
        assignmentUrl: cmid
          ? `${MOODLE_BASE}/mod/assign/view.php?id=${cmid}`
          : `${MOODLE_BASE}/`,
      });
    }
  }

  assignments.sort((x, y) => {
    const ax = x.dueAt ? new Date(x.dueAt).getTime() : Infinity;
    const ay = y.dueAt ? new Date(y.dueAt).getTime() : Infinity;
    return ax - ay;
  });

  return {
    source: 'moodle',
    moodleBaseUrl: MOODLE_BASE,
    assignments,
    hint:
      assignments.length === 0
        ? 'Dersler listelendi; bu derslerde henüz ödev (assign) kaydı yok veya erişim kısıtlı.'
        : undefined,
  };
}

/**
 * @returns {Promise<{ source: string, moodleBaseUrl: string, assignments: object[], hint?: string, error?: string }>}
 */
async function getAssignments() {
  const token = process.env.MOODLE_TOKEN?.trim();

  if (!token) {
    return {
      source: 'mock',
      moodleBaseUrl: MOODLE_BASE,
      assignments: mockAssignments(),
      hint: 'Canlı veri için .env içinde MOODLE_TOKEN tanımlayın (.env.example). Site yöneticisi web service\'e şu fonksiyonları eklemeli: ' + REQUIRED_FUNCTIONS,
    };
  }

  try {
    return await fetchLiveAssignments(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: 'error',
      moodleBaseUrl: MOODLE_BASE,
      assignments: [],
      hint:
        'Canlı veri alınamadı. Token veya web service izinlerini kontrol edin. Gerekli fonksiyonlar: ' +
        REQUIRED_FUNCTIONS,
      error: message,
    };
  }
}

module.exports = { getAssignments, MOODLE_BASE };
