import { useMemo, useState } from 'preact/hooks';
import { logs, prs, metrics, streak, weeklyCompletion, plan, logBodyMetrics, coachNotes } from '../lib/store.js';
import { todayISO } from '../lib/models.js';
import { StatTile } from '../components/StatTile.jsx';
import { SVGLineChart } from '../components/SVGLineChart.jsx';
import { SVGBarChart } from '../components/SVGBarChart.jsx';
import { CalendarHeatmap } from '../components/CalendarHeatmap.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Pill } from '../components/Pill.jsx';

const METRIC_FIELDS = [
  ['weight', 'Weight', 'lb'], ['waist', 'Waist', 'in'], ['chest', 'Chest', 'in'],
  ['arms', 'Arms', 'in'], ['shoulders', 'Shoulders', 'in'], ['thighs', 'Thighs', 'in'], ['bodyfat', 'Body Fat', '%']
];

function last8WeeksBars() {
  const now = new Date();
  const bars = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - w * 7);
    const keys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const count = logs.value.filter(l => keys.includes(l.date)).length;
    bars.push({ label: w === 0 ? 'Now' : `-${w}w`, value: count, highlight: w === 0 });
  }
  return bars;
}

export function Progress() {
  const [metricType, setMetricType] = useState('weight');
  const [metricForm, setMetricForm] = useState({});

  const week = weeklyCompletion.value;
  const sortedLogs = [...logs.value].sort((a, b) => a.date.localeCompare(b.date));
  const volumePoints = sortedLogs.filter(l => l.totalVolume > 0).slice(-10).map(l => ({ label: l.date.slice(5), value: l.totalVolume }));
  const prList = Object.values(prs.value).sort((a, b) => b.bestWeight - a.bestWeight);
  const consistencyBars = useMemo(last8WeeksBars, [logs.value.length]);

  const exerciseHistory = useMemo(() => {
    const map = new Map();
    [...logs.value].reverse().forEach(l => {
      l.completedExercises.forEach(e => {
        if (!map.has(e.exerciseName)) map.set(e.exerciseName, { name: e.exerciseName, date: l.date, weight: e.weight, reps: e.totalReps });
      });
    });
    return Array.from(map.values()).slice(0, 8);
  }, [logs.value.length]);

  const metricPoints = metrics.value
    .filter(m => m.metricType === metricType)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(m => ({ label: m.date.slice(5), value: m.value }));

  const missedRecent = useMemo(() => {
    if (!plan.value) return 0;
    const start = new Date(plan.value.startDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const from = start > cutoff ? start : cutoff;
    let missed = 0;
    for (let d = new Date(from); d < new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (key === todayISO()) continue;
      if (!logs.value.some(l => l.date === key)) missed += 1;
    }
    return missed;
  }, [logs.value.length]);

  function saveMetrics() {
    const entries = METRIC_FIELDS.filter(([key]) => metricForm[key]).map(([key, , unit]) => [key, metricForm[key], unit]);
    if (!entries.length) return;
    logBodyMetrics(entries);
    setMetricForm({});
  }

  const lastNote = coachNotes.value[coachNotes.value.length - 1];

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">Progress</div>
        <h1 style={{ fontSize: 34 }}>{streak.value} Day Streak</h1>
        <p className="muted mt">Proof, not promises. Every number here comes from logged work.</p>
      </section>

      <div className="grid grid4">
        <StatTile label="Completed" value={logs.value.length} accent />
        <StatTile label="Streak" value={`${streak.value}d`} />
        <StatTile label="This Week" value={`${week.completed}/${week.target}`} />
        <StatTile label="PRs Tracked" value={prList.length} />
      </div>

      <div className="desk-grid">
        <div className="section-gap">
          <div className="card">
            <h2>Training Volume</h2>
            {volumePoints.length >= 2 ? <div className="mt"><SVGLineChart points={volumePoints} unit=" lb" /></div> : <EmptyState icon="📊" title="Not Enough Data" body="Log weight and reps during workouts to see your volume trend." />}
          </div>

          <div className="card">
            <h2>Weekly Consistency</h2>
            <div className="mt"><SVGBarChart bars={consistencyBars} /></div>
          </div>

          <div className="card">
            <h2>Battle Calendar</h2>
            <CalendarHeatmap />
            <p className="small mt">Missed in last 14 days: {missedRecent}</p>
          </div>

          <div className="card">
            <h2>Exercise History</h2>
            <div className="list mt">
              {exerciseHistory.map(e => (
                <div className="item" key={e.name}>
                  <div className="top"><strong>{e.name}</strong><span className="small">{e.date}</span></div>
                  <p className="small">Last: {e.weight || '—'} × {e.reps || '—'}</p>
                </div>
              ))}
              {!exerciseHistory.length && <p className="muted center">No exercise history yet.</p>}
            </div>
          </div>
        </div>

        <div className="section-gap">
          <div className="card">
            <h2>Personal Records</h2>
            <div className="list mt">
              {prList.slice(0, 8).map(p => (
                <div className="item" key={p.name}>
                  <strong>{p.name}</strong>
                  <p className="small mt">Best weight {p.bestWeight} • Volume {p.bestVolume} • Est. 1RM {p.bestEst1RM}</p>
                </div>
              ))}
              {!prList.length && <p className="muted center">Complete weighted exercises to build the vault.</p>}
            </div>
          </div>

          {lastNote && (
            <div className="card">
              <div className="card-head"><h2>Latest Summary</h2><Pill>{lastNote.title}</Pill></div>
              <p className="muted mt">{lastNote.body}</p>
            </div>
          )}

          <div className="card">
            <h2>Body Metrics</h2>
            <div className="field mt">
              <label>Chart</label>
              <select value={metricType} onChange={e => setMetricType(e.currentTarget.value)}>
                {METRIC_FIELDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div className="mt">
              {metricPoints.length >= 2
                ? <SVGLineChart points={metricPoints} color="var(--steel)" />
                : <p className="muted center">Log at least two entries to see a trend.</p>}
            </div>
            <div className="form-grid mt">
              {METRIC_FIELDS.map(([key, label, unit]) => (
                <div className="field" key={key}>
                  <label>{label} ({unit})</label>
                  <input type="number" value={metricForm[key] || ''} onInput={e => setMetricForm(prev => ({ ...prev, [key]: e.currentTarget.value }))} />
                </div>
              ))}
            </div>
            <button className="btn primary block mt" onClick={saveMetrics}>Log Today's Measurements</button>
          </div>
        </div>
      </div>
    </div>
  );
}
