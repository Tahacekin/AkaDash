import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 14;

const CHART_COLORS = {
  assignment: '#d4a853',
  event: '#2dd4bf',
  today: '#e8c97a',
};

function startOfLocalDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function shortDay(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
  });
}

function fullDay(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  const total = (datum.assignment || 0) + (datum.event || 0);
  const titles = (datum.titles || []).slice(0, 3);
  const extra = (datum.titles || []).length - titles.length;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__date">{label}</div>
      <div className="chart-tooltip__count">
        {total} item{total === 1 ? '' : 's'}
      </div>
      {titles.length > 0 ? (
        <ul className="chart-tooltip__list">
          {titles.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
          {extra > 0 ? <li>+{extra} more</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

export function WorkloadChart({ moodle, connected, now, onConnect }) {
  const data = useMemo(() => {
    const todayStart = startOfLocalDay(now);
    const buckets = [];
    for (let i = 0; i < HORIZON_DAYS; i += 1) {
      const ts = todayStart + i * DAY_MS;
      buckets.push({
        ts,
        label: shortDay(ts),
        full: fullDay(ts),
        assignment: 0,
        event: 0,
        titles: [],
        isToday: i === 0,
      });
    }
    const horizonEnd = todayStart + HORIZON_DAYS * DAY_MS;
    const collect = (items, kind) => {
      for (const it of items || []) {
        if (!it.dueAt) continue;
        const t = new Date(it.dueAt).getTime();
        if (!Number.isFinite(t)) continue;
        if (t < todayStart || t >= horizonEnd) continue;
        const idx = Math.floor((startOfLocalDay(t) - todayStart) / DAY_MS);
        if (idx < 0 || idx >= HORIZON_DAYS) continue;
        buckets[idx][kind] += 1;
        buckets[idx].titles.push(it.title);
      }
    };
    collect(moodle?.assignments, 'assignment');
    collect(moodle?.deadlines, 'event');
    return buckets;
  }, [moodle, now]);

  const total = data.reduce((s, d) => s + d.assignment + d.event, 0);

  if (!connected) {
    return (
      <div className="chart-card">
        <header className="chart-card__head">
          <h3 className="chart-card__title">Workload — next 14 days</h3>
        </header>
        <div className="chart-card__empty">
          <p className="chart-card__empty-text">
            Connect Moodle to see your workload at a glance.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '0.5rem 0.9rem' }}
            onClick={onConnect}
          >
            Connect Moodle
          </button>
        </div>
      </div>
    );
  }

  const ariaSummary = `Workload over the next ${HORIZON_DAYS} days. ${total} total items due.`;

  return (
    <div className="chart-card" aria-label={ariaSummary}>
      <header className="chart-card__head">
        <h3 className="chart-card__title">Workload — next 14 days</h3>
        <span className="chart-card__hint">{total} item{total === 1 ? '' : 's'}</span>
      </header>
      <div className="chart-card__body" role="img" aria-label={ariaSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
            barCategoryGap={data.length > 10 ? '15%' : '20%'}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              vertical={false}
              stroke="var(--chart-grid)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              interval={data.length > 10 ? 1 : 0}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: 'rgba(212, 168, 83, 0.06)' }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="assignment"
              stackId="a"
              fill={CHART_COLORS.assignment}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            >
              {data.map((d, i) => (
                <Cell
                  key={`a-${i}`}
                  fill={d.isToday ? CHART_COLORS.today : CHART_COLORS.assignment}
                />
              ))}
            </Bar>
            <Bar
              dataKey="event"
              stackId="a"
              fill={CHART_COLORS.event}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card__legend" aria-hidden="true">
        <span className="chart-card__legend-item">
          <span
            className="chart-card__legend-swatch"
            style={{ background: CHART_COLORS.assignment }}
          />
          Assignments
        </span>
        <span className="chart-card__legend-item">
          <span
            className="chart-card__legend-swatch"
            style={{ background: CHART_COLORS.event }}
          />
          Calendar deadlines
        </span>
        <span className="chart-card__legend-item">
          <span
            className="chart-card__legend-swatch"
            style={{ background: CHART_COLORS.today }}
          />
          Today
        </span>
      </div>
    </div>
  );
}
