/** @import { Deadline } from '../data/mockDeadlines.js' */

const STORAGE_KEY = 'brief-completed-ids';

export function loadCompletedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveCompletedIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/**
 * @param {Deadline[]} items
 * @param {Set<string>} completed
 */
export function sortByDueSoonest(items, completed) {
  return [...items]
    .filter((d) => !completed.has(d.id))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

/**
 * @param {Deadline} d
 * @param {'all' | '24h' | '7d'} urgency
 */
export function matchesUrgency(d, urgency) {
  if (urgency === 'all') return true;
  const due = new Date(d.dueAt).getTime();
  const now = Date.now();
  const ms = due - now;
  if (ms < 0) return false;
  if (urgency === '24h') return ms <= 24 * 60 * 60 * 1000;
  if (urgency === '7d') return ms <= 7 * 24 * 60 * 60 * 1000;
  return true;
}

/**
 * @param {Deadline[]} items
 * @param {'all' | 'moodle' | 'gmail'} source
 * @param {string} course "all" or course name
 * @param {'all' | '24h' | '7d'} urgency
 */
export function filterDeadlines(items, source, course, urgency) {
  return items.filter((d) => {
    if (source !== 'all' && d.source !== source) return false;
    if (course !== 'all' && d.course !== course) return false;
    if (!matchesUrgency(d, urgency)) return false;
    return true;
  });
}

export function uniqueCourses(items) {
  return [...new Set(items.map((d) => d.course))].sort();
}
