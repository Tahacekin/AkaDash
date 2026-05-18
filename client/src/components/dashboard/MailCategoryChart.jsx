import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

const CATEGORY_LABELS = {
  homework: 'Homework',
  project: 'Project',
  exam: 'Exam',
  deadline: 'Deadline',
  other: 'Other',
};

const CATEGORY_COLORS = {
  homework: '#d4a853',
  project: '#2dd4bf',
  exam: '#f87171',
  deadline: '#fb923c',
  other: '#a78bfa',
};

const CATEGORY_KEYS = ['homework', 'project', 'exam', 'deadline', 'other'];

export function MailCategoryChart({ mail, connected, onConnect }) {
  const data = useMemo(() => {
    const counts = CATEGORY_KEYS.reduce((acc, k) => {
      acc[k] = 0;
      return acc;
    }, {});
    for (const item of mail?.items || []) {
      const k = CATEGORY_KEYS.includes(item.category) ? item.category : 'other';
      counts[k] += 1;
    }
    return CATEGORY_KEYS
      .map((k) => ({
        key: k,
        label: CATEGORY_LABELS[k],
        count: counts[k],
        fill: CATEGORY_COLORS[k],
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [mail]);

  const total = data.reduce((s, d) => s + d.count, 0);

  if (!connected) {
    return (
      <div className="chart-card">
        <header className="chart-card__head">
          <h3 className="chart-card__title">Mail by category</h3>
        </header>
        <div className="chart-card__empty">
          <p className="chart-card__empty-text">
            Connect Gmail to see your inbox broken down by category.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '0.5rem 0.9rem' }}
            onClick={onConnect}
          >
            Connect Gmail
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="chart-card">
        <header className="chart-card__head">
          <h3 className="chart-card__title">Mail by category</h3>
        </header>
        <div className="chart-card__empty">
          <p className="chart-card__empty-text">
            No academic-looking mail in the recent window.
          </p>
        </div>
      </div>
    );
  }

  const ariaSummary = `Mail by category. ${data
    .map((d) => `${d.label}: ${d.count}`)
    .join(', ')}.`;

  return (
    <div className="chart-card" aria-label={ariaSummary}>
      <header className="chart-card__head">
        <h3 className="chart-card__title">Mail by category</h3>
        <span className="chart-card__hint">
          {total} item{total === 1 ? '' : 's'}
        </span>
      </header>
      <div className="chart-card__body" role="img" aria-label={ariaSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 32, bottom: 0, left: 4 }}
            barCategoryGap="22%"
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={84}
            />
            <Bar
              dataKey="count"
              isAnimationActive={false}
              radius={[0, 6, 6, 0]}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{
                  fill: 'var(--text-muted)',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
