import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'moodle', label: 'Moodle' },
  { value: 'mail', label: 'Mail' },
];

export function SourcePicker({ value, onChange }) {
  const containerRef = useRef(null);
  const buttonsRef = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const updateIndicator = () => {
    const idx = OPTIONS.findIndex((o) => o.value === value);
    const btn = buttonsRef.current[idx];
    const container = containerRef.current;
    if (!btn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({
      left: bRect.left - cRect.left,
      width: bRect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handler = () => updateIndicator();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % OPTIONS.length;
      buttonsRef.current[next]?.focus();
      onChange(OPTIONS[next].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx - 1 + OPTIONS.length) % OPTIONS.length;
      buttonsRef.current[next]?.focus();
      onChange(OPTIONS[next].value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      buttonsRef.current[0]?.focus();
      onChange(OPTIONS[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = OPTIONS.length - 1;
      buttonsRef.current[last]?.focus();
      onChange(OPTIONS[last].value);
    }
  };

  return (
    <div
      ref={containerRef}
      className="source-picker"
      role="tablist"
      aria-label="Choose data source"
    >
      <span
        className="source-picker__indicator"
        aria-hidden="true"
        style={{
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
      {OPTIONS.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => (buttonsRef.current[idx] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="source-picker__segment"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
