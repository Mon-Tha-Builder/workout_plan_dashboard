export function ProgressBar({ value = 0, max = 100, good = false }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`progress-bar${good ? ' good' : ''}`}>
      <div className="fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
