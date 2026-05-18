const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Returns a short relative label like "in 2 days", "in 3h", "tomorrow", "overdue". */
export function relativeFromNow(iso, now = Date.now()) {
  if (!iso) return 'no due date';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'no due date';
  const diff = t - now;
  const abs = Math.abs(diff);
  const past = diff < 0;

  if (abs < MIN) return past ? 'just now' : 'in <1 min';
  if (abs < HOUR) {
    const m = Math.round(abs / MIN);
    return past ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < DAY) {
    const h = Math.round(abs / HOUR);
    return past ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.round(abs / DAY);
  if (!past && d === 1) return 'tomorrow';
  if (past && d === 1) return 'yesterday';
  return past ? `${d}d ago` : `in ${d} days`;
}

export function urgencyClass(iso, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = t - now;
  if (diff < 0) return 'is-overdue';
  if (diff <= 48 * HOUR) return 'is-soon';
  return '';
}

export function formatAbsolute(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}
