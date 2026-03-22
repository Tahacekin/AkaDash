import { useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { DeadlineCard } from '../components/DeadlineCard';
import { FilterBar } from '../components/FilterBar';
import { mockDeadlines } from '../data/mockDeadlines';
import { useAuth } from '../context/AuthContext';
import {
  filterDeadlines,
  loadCompletedIds,
  saveCompletedIds,
  sortByDueSoonest,
  uniqueCourses,
} from '../utils/deadlines';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [source, setSource] = useState(/** @type {'all'|'moodle'|'gmail'} */ ('all'));
  const [course, setCourse] = useState('all');
  const [urgency, setUrgency] = useState(/** @type {'all'|'24h'|'7d'} */ ('all'));
  const [completed, setCompleted] = useState(() => loadCompletedIds());

  const courses = useMemo(() => uniqueCourses(mockDeadlines), []);

  const visible = useMemo(() => {
    const filtered = filterDeadlines(mockDeadlines, source, course, urgency);
    return sortByDueSoonest(filtered, completed);
  }, [source, course, urgency, completed]);

  function handleComplete(id) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveCompletedIds(next);
      return next;
    });
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="dashboard">
        <header className="dashboard__header">
          <h1 className="dashboard__title">Your deadlines</h1>
          <p className="dashboard__subtitle">
            Moodle assignments and Gmail-detected dates in one place (sample data).
          </p>
        </header>

        <FilterBar
          source={source}
          onSourceChange={setSource}
          course={course}
          onCourseChange={setCourse}
          courses={courses}
          urgency={urgency}
          onUrgencyChange={setUrgency}
        />

        {visible.length === 0 ? (
          <div className="empty-state" role="status">
            <p className="empty-state__title">Nothing to show</p>
            <p className="empty-state__text">
              Try adjusting filters, or mark fewer items complete — upcoming deadlines
              appear here.
            </p>
          </div>
        ) : (
          <ul className="deadline-list">
            {visible.map((d) => (
              <li key={d.id}>
                <DeadlineCard
                  deadline={d}
                  onComplete={() => handleComplete(d.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
