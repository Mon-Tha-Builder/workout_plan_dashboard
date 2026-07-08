// Hand-rolled line chart — no charting library, styled to match the Iron &
// Ember design tokens instead of looking like a generic dashboard widget.
export function SVGLineChart({ points, height = 140, color = 'var(--ember)', unit = '' }) {
  if (!points || points.length < 2) {
    return <div className="empty-state" style={{ padding: '24px 16px' }}><p>Log at least two entries to see a trend line.</p></div>;
  }
  const width = 100; // viewBox units; scales via CSS width 100%
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const toY = v => 8 + (1 - (v - min) / span) * (height - 24);
  const coords = points.map((p, i) => [i * stepX, toY(p.value)]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${width},${height - 4} L0,${height - 4} Z`;
  const gid = `lg-${Math.round(Math.random() * 1e6)}`;
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 2.6 : 1.4} fill={i === coords.length - 1 ? color : 'var(--bg)'} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex-between small" style={{ marginTop: 4 }}>
        <span>{first.label}</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{last.value}{unit} latest</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
