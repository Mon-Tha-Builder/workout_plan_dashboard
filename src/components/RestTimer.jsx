import { useEffect, useState } from 'preact/hooks';

export function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onDone?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="card" style={{ borderColor: 'var(--ember)', textAlign: 'center' }}>
      <p className="small">Rest</p>
      <b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: 'var(--ember-hi)' }}>{mm}:{ss}</b>
      <div className="btns" style={{ justifyContent: 'center' }}>
        <button className="btn sm ghost" onClick={() => setRemaining(r => r + 15)}>+15s</button>
        <button className="btn sm ghost" onClick={() => onDone?.()}>Skip</button>
      </div>
    </div>
  );
}
