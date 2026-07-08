import { useMemo, useState } from 'preact/hooks';
import { recoveryLogs, profile, saveRecoveryCheckIn, recentTrainingLoad } from '../lib/store.js';
import { todayISO } from '../lib/models.js';
import { scoreReadiness, ZONE_LABEL, ZONE_PILL_CLASS } from '../lib/recovery.js';
import { RadialGauge } from '../components/RadialGauge.jsx';
import { Pill } from '../components/Pill.jsx';
import { SVGLineChart } from '../components/SVGLineChart.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { navigate } from '../router.js';

const SLIDER_FIELDS = [
  ['sleepQuality', 'Sleep Quality'],
  ['energy', 'Energy'],
  ['soreness', 'Soreness'],
  ['stress', 'Stress']
];

export function Recovery() {
  const today = todayISO();
  const existing = recoveryLogs.value[today];

  const [form, setForm] = useState(() => ({
    sleepQuality: existing?.sleepQuality ?? 5,
    energy: existing?.energy ?? 5,
    soreness: existing?.soreness ?? 5,
    stress: existing?.stress ?? 5,
    timeAvailable: existing?.timeAvailable ?? profile.value.preferredWorkoutDuration,
    pain: existing?.pain ?? ''
  }));
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => scoreReadiness(form, recentTrainingLoad(today)), [form, today]);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    saveRecoveryCheckIn(form, today);
    setSaved(true);
  }

  const trendPoints = Object.values(recoveryLogs.value)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(r => ({ label: r.date.slice(5), value: r.readinessScore }));

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">Recovery</div>
        <h1>Train Smart, Not Just Hard</h1>
        <p className="muted mt">A practical readiness check — not a medical assessment. Be honest and FORGE adjusts today's plan accordingly.</p>
      </section>

      <div className="desk-grid">
        <div className="card">
          <h2>Check In</h2>
          <div className="form-grid mt">
            {SLIDER_FIELDS.map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label} — {form[key]}/10</label>
                <input type="range" min="1" max="10" value={form[key]} onInput={e => update(key, Number(e.currentTarget.value))} />
              </div>
            ))}
            <div className="field-row">
              <div className="field">
                <label>Time Available (min)</label>
                <input type="number" value={form.timeAvailable} onInput={e => update('timeAvailable', Number(e.currentTarget.value))} />
              </div>
              <div className="field">
                <label>Pain / Limitation</label>
                <input type="text" value={form.pain} placeholder="e.g. neck, knee, none" onInput={e => update('pain', e.currentTarget.value)} />
              </div>
            </div>
          </div>
          <button className="btn primary block mt" onClick={save}>{saved ? 'Saved — Update Again' : 'Save Check-In'}</button>
          {saved && (
            <div className="btns">
              <button className="btn ghost block" onClick={() => navigate('/today')}>Back To Today</button>
            </div>
          )}
        </div>

        <div className="section-gap">
          <div className="card">
            <h2>Readiness Preview</h2>
            <div className="mt" style={{ display: 'flex', justifyContent: 'center' }}>
              <RadialGauge score={preview.score} zone={preview.zone} />
            </div>
            <div className="center mt"><Pill tone={ZONE_PILL_CLASS[preview.zone]}>{ZONE_LABEL[preview.zone]}</Pill></div>
            <p className="muted mt center">{preview.recommendation}</p>
          </div>

          <div className="card">
            <h2>Recent Trend</h2>
            {trendPoints.length >= 2 ? (
              <div className="mt"><SVGLineChart points={trendPoints} color="var(--recovery)" /></div>
            ) : (
              <EmptyState icon="📈" title="Not Enough Data" body="Check in a few more days to see your readiness trend." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
