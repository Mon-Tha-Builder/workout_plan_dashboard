const ZONE_COLOR = { green: 'var(--good)', yellow: 'var(--warn)', red: 'var(--bad)' };

export function RadialGauge({ score = 0, zone = 'yellow', label = 'Readiness', size = 96 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = ZONE_COLOR[zone] || 'var(--ember)';
  return (
    <div className="gauge-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="55" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="28" fill="var(--text)">{score}</text>
      </svg>
      <div className="gauge-readout">
        <small>{label}</small>
        <b style={{ color }}>{zone.toUpperCase()}</b>
      </div>
    </div>
  );
}
