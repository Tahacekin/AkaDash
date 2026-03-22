/**
 * @param {object} props
 * @param {'all' | 'moodle' | 'gmail'} props.source
 * @param {(v: 'all' | 'moodle' | 'gmail') => void} props.onSourceChange
 * @param {string} props.course
 * @param {(v: string) => void} props.onCourseChange
 * @param {string[]} props.courses
 * @param {'all' | '24h' | '7d'} props.urgency
 * @param {(v: 'all' | '24h' | '7d') => void} props.onUrgencyChange
 */
export function FilterBar({
  source,
  onSourceChange,
  course,
  onCourseChange,
  courses,
  urgency,
  onUrgencyChange,
}) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter deadlines">
      <label className="filter-field">
        <span className="filter-field__label">Source</span>
        <select
          className="filter-select"
          value={source}
          onChange={(e) => onSourceChange(/** @type {'all'|'moodle'|'gmail'} */ (e.target.value))}
        >
          <option value="all">All sources</option>
          <option value="moodle">Moodle</option>
          <option value="gmail">Gmail</option>
        </select>
      </label>
      <label className="filter-field">
        <span className="filter-field__label">Course</span>
        <select
          className="filter-select"
          value={course}
          onChange={(e) => onCourseChange(e.target.value)}
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span className="filter-field__label">Urgency</span>
        <select
          className="filter-select"
          value={urgency}
          onChange={(e) =>
            onUrgencyChange(/** @type {'all'|'24h'|'7d'} */ (e.target.value))
          }
        >
          <option value="all">Any time</option>
          <option value="24h">Due in 24 hours</option>
          <option value="7d">Due in 7 days</option>
        </select>
      </label>
    </div>
  );
}
