import { useEffect, useState } from 'react';

/**
 * Ticks every `intervalMs` (default 1000). Respects prefers-reduced-motion with a slower tick.
 * @param {number} [intervalMs]
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const mq =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)');
    const slow = mq && mq.matches;
    const ms = slow ? Math.max(intervalMs, 60000) : intervalMs;

    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
