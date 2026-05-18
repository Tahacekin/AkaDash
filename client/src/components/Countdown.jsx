import { useNow } from '../hooks/useNow';

function formatRemaining(ms) {
  if (ms <= 0) return 'Due now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * @param {{ dueAt: string }} props
 */
export function Countdown({ dueAt }) {
  const now = useNow(1000);
  const due = new Date(dueAt).getTime();
  const remaining = due - now;

  return (
    <span className="countdown" title={new Date(dueAt).toLocaleString()}>
      {formatRemaining(remaining)}
    </span>
  );
}
