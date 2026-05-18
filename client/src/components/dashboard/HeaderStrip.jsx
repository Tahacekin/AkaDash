import { StatusChip } from './StatusChip';
import { formatAbsolute, relativeFromNow } from '../../utils/time';

function deriveState({ connected, error, needsReconsent }) {
  if (error) return 'error';
  if (needsReconsent) return 'reconsent';
  if (connected) return 'connected';
  return 'off';
}

export function HeaderStrip({
  user,
  gmail,
  moodle,
  fetchedAt,
  now,
  refreshing,
  loading,
  onRefresh,
}) {
  const gmailState = deriveState(gmail);
  const moodleState = deriveState(moodle);
  const busy = refreshing || loading;
  return (
    <header className="header-strip">
      <div className="header-strip__left">
        <h1 className="header-strip__title">
          {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back'}
        </h1>
        <p className="header-strip__subtitle">
          Your school mail and Moodle deadlines, refreshed every minute.
        </p>
        {user?.email ? (
          <div className="header-strip__user">
            <span className="header-strip__user-email">{user.email}</span>
          </div>
        ) : null}
      </div>
      <div className="header-strip__right">
        <div className="status-chips">
          <StatusChip label="Gmail" state={gmailState} />
          <StatusChip label="Moodle" state={moodleState} />
        </div>
        <div className="refresh-row">
          <button
            type="button"
            className="btn-ghost refresh-row__btn"
            onClick={onRefresh}
            disabled={busy}
            aria-label="Refresh dashboard data"
          >
            {refreshing ? (
              <span className="spinner spinner--inline" aria-hidden="true" />
            ) : null}
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {fetchedAt ? (
          <span
            className="refresh-row__stamp"
            title={formatAbsolute(fetchedAt)}
          >
            updated {relativeFromNow(fetchedAt, now)}
          </span>
        ) : null}
      </div>
    </header>
  );
}
