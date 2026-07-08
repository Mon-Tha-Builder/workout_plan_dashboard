export function SVGBarChart({ bars, height = 120 }) {
  if (!bars || !bars.length) return null;
  const max = Math.max(1, ...bars.map(b => b.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {bars.map((b, i) => {
        const pct = Math.max(4, (b.value / max) * 100);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div
              style={{
                width: '100%',
                height: `${pct}%`,
                borderRadius: '3px 3px 0 0',
                background: b.highlight ? 'linear-gradient(180deg, var(--ember-hi), var(--ember-deep))' : 'var(--card2)',
                border: '1px solid ' + (b.highlight ? 'var(--ember)' : 'var(--line-strong)')
              }}
              title={`${b.label}: ${b.value}`}
            />
            <span className="small" style={{ fontSize: 9 }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
