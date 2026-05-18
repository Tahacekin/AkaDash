const STATE_CLASS = {
  connected: 'status-chip--connected',
  reconsent: 'status-chip--reconsent',
  error: 'status-chip--error',
  off: 'status-chip--off',
};

const STATE_LABEL = {
  connected: 'connected',
  reconsent: 'needs reconsent',
  error: 'error',
  off: 'not connected',
};

export function StatusChip({ label, state = 'off', title }) {
  const cls = STATE_CLASS[state] || STATE_CLASS.off;
  const stateLabel = STATE_LABEL[state] || STATE_LABEL.off;
  const tip = title || `${label}: ${stateLabel}`;
  return (
    <span
      className={`status-chip ${cls}`}
      title={tip}
      role="status"
      aria-label={tip}
    >
      <span className="status-chip__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
