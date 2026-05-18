import { useMemo } from 'react';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const MAIL_LABELS = {
  homework: 'Homework',
  project: 'Project',
  exam: 'Exam',
  deadline: 'Deadline',
  other: 'Other',
};

function combineMoodleItems(assignments, deadlines) {
  const seen = new Set();
  const out = [];
  for (const item of assignments || []) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.dueAt) out.push({ ...item, kind: 'assignment' });
  }
  for (const item of deadlines || []) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.dueAt) out.push({ ...item, kind: 'event' });
  }
  return out.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

function truncate(str, len = 38) {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len - 1)}…` : str;
}

function StatCard({ label, value, sub, subTone = 'muted', missingLink, dim }) {
  const subClass =
    subTone === 'ok'
      ? 'stat-card__sub--ok'
      : subTone === 'warn'
      ? 'stat-card__sub--warn'
      : subTone === 'bad'
      ? 'stat-card__sub--bad'
      : '';
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span
        className={`stat-card__value${dim ? ' stat-card__value--muted' : ''}`}
      >
        {value}
      </span>
      {missingLink ? (
        <span className="stat-card__sub">
          <a href={missingLink.href} className="stat-card__sub-link">
            {missingLink.text}
          </a>
        </span>
      ) : (
        <span className={`stat-card__sub ${subClass}`}>{sub}</span>
      )}
    </div>
  );
}

export function StatCards({ moodle, mail, connections, now }) {
  const moodleConnected = Boolean(connections?.moodle);
  const gmailConnected = Boolean(connections?.gmail);

  const stats = useMemo(() => {
    const items = combineMoodleItems(moodle?.assignments, moodle?.deadlines);
    const weekCutoff = now + WEEK;
    const twoDayCutoff = now + 2 * DAY;
    const upcomingThisWeek = items.filter((it) => {
      const t = new Date(it.dueAt).getTime();
      return Number.isFinite(t) && t >= now && t <= weekCutoff;
    });
    const overdue = items.filter((it) => {
      const t = new Date(it.dueAt).getTime();
      return Number.isFinite(t) && t < now;
    });
    const upcoming48h = items.filter((it) => {
      const t = new Date(it.dueAt).getTime();
      return Number.isFinite(t) && t >= now && t <= twoDayCutoff;
    });
    const nextItem = upcoming48h[0] || null;

    const mailItems = mail?.items || [];
    const recentMail = mailItems.filter((m) => {
      const t = new Date(m.receivedAt).getTime();
      return Number.isFinite(t) && t >= now - WEEK;
    });
    const catCounts = recentMail.reduce((acc, m) => {
      const k = MAIL_LABELS[m.category] ? m.category : 'other';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

    const courseCounts = (moodle?.assignments || []).reduce((acc, a) => {
      if (!a.courseName) return acc;
      const key = a.courseName;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const courseList = Object.entries(courseCounts).sort(
      (a, b) => b[1] - a[1]
    );

    return {
      thisWeekCount: upcomingThisWeek.length,
      overdueCount: overdue.length,
      next48hCount: upcoming48h.length,
      nextItem,
      recentMailCount: recentMail.length,
      topCategory: topCat ? MAIL_LABELS[topCat[0]] : null,
      courseCount: courseList.length,
      topCourse: courseList[0] ? courseList[0][0] : null,
    };
  }, [moodle, mail, now]);

  return (
    <section
      className="stats-row"
      aria-label="Summary statistics"
    >
      {moodleConnected ? (
        <StatCard
          label="Due this week"
          value={stats.thisWeekCount}
          sub={
            stats.overdueCount > 0
              ? `${stats.overdueCount} overdue`
              : 'On track'
          }
          subTone={stats.overdueCount > 0 ? 'bad' : 'ok'}
        />
      ) : (
        <StatCard
          label="Due this week"
          value="—"
          dim
          missingLink={{ href: '#connect-moodle', text: 'Connect Moodle' }}
        />
      )}

      {moodleConnected ? (
        <StatCard
          label="Due in 48h"
          value={stats.next48hCount}
          sub={
            stats.nextItem
              ? `Next: ${truncate(stats.nextItem.title, 36)}`
              : 'Nothing urgent'
          }
          subTone={stats.next48hCount > 0 ? 'warn' : 'ok'}
        />
      ) : (
        <StatCard
          label="Due in 48h"
          value="—"
          dim
          missingLink={{ href: '#connect-moodle', text: 'Connect Moodle' }}
        />
      )}

      {gmailConnected ? (
        <StatCard
          label="Recent academic mail"
          value={stats.recentMailCount}
          sub={
            stats.topCategory
              ? `Mostly ${stats.topCategory}`
              : 'Nothing this week'
          }
          subTone={stats.recentMailCount > 0 ? 'warn' : 'ok'}
        />
      ) : (
        <StatCard
          label="Recent academic mail"
          value="—"
          dim
          missingLink={{ href: '#connect-gmail', text: 'Connect Gmail' }}
        />
      )}

      {moodleConnected ? (
        <StatCard
          label="Active courses"
          value={stats.courseCount}
          sub={
            stats.topCourse
              ? `Most pending: ${truncate(stats.topCourse, 32)}`
              : 'No active courses'
          }
        />
      ) : (
        <StatCard
          label="Active courses"
          value="—"
          dim
          missingLink={{ href: '#connect-moodle', text: 'Connect Moodle' }}
        />
      )}
    </section>
  );
}
