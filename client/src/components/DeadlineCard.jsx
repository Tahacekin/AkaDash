import { Countdown } from './Countdown';

/**
 * @param {object} props
 * @param {import('../data/mockDeadlines.js').Deadline} props.deadline
 * @param {() => void} props.onComplete
 */
export function DeadlineCard({ deadline, onComplete }) {
  const sourceLabel = deadline.source === 'moodle' ? 'Moodle' : 'Gmail';
  const badgeClass =
    deadline.source === 'moodle' ? 'badge badge--moodle' : 'badge badge--gmail';

  return (
    <article className="deadline-card">
      <div className="deadline-card__top">
        <div className="deadline-card__meta">
          <span className={badgeClass}>{sourceLabel}</span>
          {deadline.needsManualReview ? (
            <span className="badge badge--review">Review</span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-text"
          onClick={onComplete}
          aria-label={`Mark ${deadline.title} as done`}
        >
          Mark done
        </button>
      </div>
      <h3 className="deadline-card__title">{deadline.title}</h3>
      <p className="deadline-card__course">{deadline.course}</p>
      <div className="deadline-card__footer">
        <time className="deadline-card__due" dateTime={deadline.dueAt}>
          {new Date(deadline.dueAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </time>
        <Countdown dueAt={deadline.dueAt} />
      </div>
    </article>
  );
}
