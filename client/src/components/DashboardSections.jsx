import { useMemo, useState } from 'react';
import { relativeFromNow } from '../utils/time';

const HOUR = 60 * 60 * 1000;

const MAIL_CATEGORY_LABELS = {
  all: 'All',
  homework: 'Homework',
  project: 'Project',
  exam: 'Exam',
  deadline: 'Deadline',
  other: 'Other',
};
const MAIL_CATEGORY_ORDER = ['homework', 'project', 'exam', 'deadline', 'other'];

function urgencyClass(iso, now) {
  if (!iso) return 'due-pill';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'due-pill';
  const diff = t - now;
  if (diff < 0) return 'due-pill due-pill--hot';
  if (diff <= 24 * HOUR) return 'due-pill due-pill--hot';
  if (diff <= 72 * HOUR) return 'due-pill due-pill--warn';
  return 'due-pill due-pill--soft';
}

function combineMoodleItems(assignments, deadlines) {
  const seen = new Set();
  const all = [];
  for (const item of assignments || []) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      all.push({ ...item, kind: 'assignment' });
    }
  }
  for (const item of deadlines || []) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    all.push({ ...item, kind: 'event' });
  }
  return all
    .filter((d) => d.dueAt)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

export function UpcomingSection({ moodle, connected, now }) {
  const items = combineMoodleItems(moodle.assignments, moodle.deadlines);

  return (
    <section className="panel" aria-labelledby="upcoming-heading">
      <header className="panel__head">
        <h2 className="panel__title" id="upcoming-heading">
          Upcoming
        </h2>
        <span className="panel__count">{items.length}</span>
      </header>
      {!connected ? (
        <p className="panel__empty">
          Moodle is not connected yet. Connect it below to pull your courses
          and assignments.
        </p>
      ) : moodle.error && items.length === 0 ? (
        <p className="panel__empty panel__empty--error">{moodle.error}</p>
      ) : items.length === 0 ? (
        <p className="panel__empty">
          Nothing upcoming on Moodle right now.
        </p>
      ) : (
        <ul className="item-list">
          {items.map((item) => {
            const pillClass = urgencyClass(item.dueAt, now);
            const courseLabel =
              item.courseName || (item.kind === 'event' ? 'Event' : 'Assignment');
            return (
              <li key={item.id}>
                <a
                  className="row-moodle"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title={item.title}
                >
                  <span className="row-moodle__course">{courseLabel}</span>
                  <span className="row-moodle__title">
                    {item.title}
                    {item.kind === 'event' ? (
                      <span className="row-moodle__title-sub">
                        Calendar event
                      </span>
                    ) : null}
                  </span>
                  <span className={pillClass}>
                    {relativeFromNow(item.dueAt, now)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function MailSection({ mail, connected }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const items = useMemo(
    () =>
      (mail.items || [])
        .slice()
        .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
    [mail.items]
  );

  const counts = useMemo(() => {
    const c = { all: items.length, homework: 0, project: 0, exam: 0, deadline: 0, other: 0 };
    for (const item of items) {
      const cat = item.category || 'other';
      if (cat in c) c[cat] += 1;
      else c.other += 1;
    }
    return c;
  }, [items]);

  const visiblePills = ['all', ...MAIL_CATEGORY_ORDER.filter((k) => counts[k] > 0)];

  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter((it) => (it.category || 'other') === activeCategory);

  return (
    <section className="panel" aria-labelledby="mail-heading">
      <header className="panel__head">
        <h2 className="panel__title" id="mail-heading">
          From your school mail
        </h2>
        <span className="panel__count">{items.length}</span>
      </header>
      {!connected ? (
        <p className="panel__empty">
          Gmail is not connected yet. Connect it below to pull announcements
          from your school inbox.
        </p>
      ) : mail.error && items.length === 0 ? (
        <p className="panel__empty panel__empty--error">{mail.error}</p>
      ) : items.length === 0 ? (
        <p className="panel__empty">
          No recent academic-looking messages in the last 30 days.
        </p>
      ) : (
        <>
          <div
            className="pill-row"
            role="tablist"
            aria-label="Filter mail by category"
          >
            {visiblePills.map((key) => {
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`pill${isActive ? ' pill--active' : ''}`}
                  onClick={() => setActiveCategory(key)}
                >
                  {MAIL_CATEGORY_LABELS[key]} ({counts[key]})
                </button>
              );
            })}
          </div>
          {filteredItems.length === 0 ? (
            <p className="panel__empty">No items in this category.</p>
          ) : (
            <ul className="item-list">
              {filteredItems.map((item) => {
                const cat = MAIL_CATEGORY_ORDER.includes(item.category)
                  ? item.category
                  : 'other';
                return (
                  <li key={item.id}>
                    <a
                      className="row-mail"
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      title={item.title}
                    >
                      <span className="row-mail__top">
                        <span
                          className={`row-mail__cat row-mail__cat--${cat}`}
                        >
                          {MAIL_CATEGORY_LABELS[cat]}
                        </span>
                        <span className="row-mail__subject">{item.title}</span>
                      </span>
                      <span className="row-mail__time">
                        {relativeFromNow(item.receivedAt)}
                      </span>
                      {item.snippet ? (
                        <p className="row-mail__snippet">{item.snippet}</p>
                      ) : null}
                      {item.from ? (
                        <span className="row-mail__from">{item.from}</span>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
