/** @typedef {'moodle' | 'gmail'} DeadlineSource */

/**
 * @typedef {Object} Deadline
 * @property {string} id
 * @property {string} title
 * @property {string} course
 * @property {DeadlineSource} source
 * @property {string} dueAt ISO 8601
 * @property {boolean} [needsManualReview]
 */

/** @type {Deadline[]} */
export const mockDeadlines = [
  {
    id: 'm1',
    title: 'Requirements document v1',
    course: 'Software Engineering',
    source: 'moodle',
    dueAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm2',
    title: 'UML diagrams — midterm',
    course: 'Software Engineering',
    source: 'moodle',
    dueAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm3',
    title: 'Lab report: REST clients',
    course: 'Web Programming',
    source: 'moodle',
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'g1',
    title: 'Project milestone check-in',
    course: 'Capstone',
    source: 'gmail',
    dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    needsManualReview: false,
  },
  {
    id: 'g2',
    title: 'Optional reading quiz',
    course: 'Database Systems',
    source: 'gmail',
    dueAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    needsManualReview: true,
  },
  {
    id: 'm4',
    title: 'Essay draft peer review',
    course: 'Technical Communication',
    source: 'moodle',
    dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'g3',
    title: 'Guest lecture summary',
    course: 'Operating Systems',
    source: 'gmail',
    dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
