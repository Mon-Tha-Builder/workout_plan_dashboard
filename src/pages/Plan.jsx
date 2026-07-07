import { useState } from 'preact/hooks';
import {
  plan, profile, rotationIndex,
  setPlan, updatePlanMeta, updatePlanWorkout, updatePlanExercise, removePlanExercise, addPlanExercise
} from '../lib/store.js';
import { listTemplates, getTemplate } from '../lib/planTemplates.js';
import { freshPlan, freshExercise } from '../lib/models.js';
import { searchLibrary } from '../lib/exerciseLibrary.js';
import { Pill } from '../components/Pill.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { navigate } from '../router.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Plan() {
  const [expandedId, setExpandedId] = useState(null);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!plan.value) {
    return <EmptyState icon="📋" title="No Plan Yet" body="Run setup to build your first plan." action={<button className="btn primary" onClick={() => navigate('/onboarding')}>Start Setup</button>} />;
  }

  const p = plan.value;
  const idx = rotationIndex();
  const today = new Date().getDay();

  function confirmSwitchTemplate() {
    const template = getTemplate(pendingTemplate);
    setPlan(freshPlan({
      name: template.name,
      templateId: template.id,
      goal: profile.value.goal,
      daysPerWeek: template.defaultDays,
      assignedDays: template.assignedDays,
      workouts: template.buildWorkouts(profile.value)
    }));
    setPendingTemplate(null);
    setShowSwitcher(false);
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">Current Plan</div>
        <h1 style={{ fontSize: 34 }}>{p.name}</h1>
        <p className="muted mt">{getTemplate(p.templateId).description}</p>
      </section>

      <div className="desk-grid">
        <div className="section-gap">
          <div className="card">
            <h2>Weekly Schedule</h2>
            <div className="grid grid4 mt" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {WEEKDAYS.map((label, d) => {
                const posInWeek = p.assignedDays.indexOf(d);
                const workout = posInWeek >= 0 ? p.workouts[posInWeek % p.workouts.length] : null;
                return (
                  <div key={d} className="stat" style={{ padding: '8px 4px', textAlign: 'center', borderColor: d === today ? 'var(--ember)' : 'var(--line)' }}>
                    <small>{label}</small>
                    <b style={{ fontSize: 11, lineHeight: 1.2 }}>{workout ? workout.title.split(' ')[0] : 'Rest'}</b>
                  </div>
                );
              })}
            </div>
            <p className="small mt">Training days per week: {p.daysPerWeek}. Toggle days below to change your schedule.</p>
            <div className="choice-grid cols-3 mt">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  className={`choice-card${p.assignedDays.includes(d) ? ' selected' : ''}`}
                  onClick={() => {
                    const next = p.assignedDays.includes(d) ? p.assignedDays.filter(x => x !== d) : [...p.assignedDays, d].sort();
                    if (next.length >= 1) updatePlanMeta({ assignedDays: next, daysPerWeek: next.length });
                  }}
                >
                  <b>{label}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Rotation</h2><Pill tone="ember">{p.workouts.length} Workouts</Pill></div>
            <div className="list">
              {p.workouts.map((w, i) => (
                <RotationWorkout
                  key={w.id}
                  workout={w}
                  isToday={i === idx}
                  expanded={expandedId === w.id}
                  onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="section-gap">
          <div className="card">
            <h2>Plan Details</h2>
            <div className="form-grid mt">
              <div className="field">
                <label>Plan Name</label>
                <input type="text" value={p.name} onInput={e => updatePlanMeta({ name: e.currentTarget.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Duration (weeks)</label>
                  <input type="number" value={p.durationWeeks} onInput={e => updatePlanMeta({ durationWeeks: Number(e.currentTarget.value) || 1 })} />
                </div>
                <div className="field">
                  <label>Start Date</label>
                  <input type="date" value={p.startDate} onInput={e => updatePlanMeta({ startDate: e.currentTarget.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Upcoming</h2>
            <div className="list mt">
              {Array.from({ length: Math.min(4, p.workouts.length) }).map((_, offset) => {
                const w = p.workouts[(idx + offset) % p.workouts.length];
                return (
                  <div className="item" key={offset}>
                    <div className="top">
                      <strong>{w.title}</strong>
                      <Pill tone={offset === 0 ? 'ember' : ''}>{offset === 0 ? 'Today' : `+${offset}`}</Pill>
                    </div>
                    <p className="small">{w.exercises.length} exercises • {w.estimatedDuration} min</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2>Switch Training Style</h2>
            <p className="muted mt">Changing templates replaces your rotation. Your history and progress stay intact.</p>
            <button className="btn ghost block mt" onClick={() => setShowSwitcher(true)}>Browse Templates</button>
          </div>
        </div>
      </div>

      {showSwitcher && (
        <div className="dialog-backdrop" onClick={() => setShowSwitcher(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>Choose A Training Style</h3>
            <div className="list mt" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {listTemplates().map(t => (
                <button key={t.id} type="button" className={`choice-card${pendingTemplate === t.id ? ' selected' : ''}`} style={{ width: '100%', marginBottom: 8 }} onClick={() => setPendingTemplate(t.id)}>
                  <b>{t.name}</b><span>{t.description}</span>
                </button>
              ))}
            </div>
            <div className="btns">
              <button className="btn ghost block" onClick={() => setShowSwitcher(false)}>Cancel</button>
              <button className="btn primary block" disabled={!pendingTemplate} onClick={confirmSwitchTemplate}>Use This Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RotationWorkout({ workout, isToday, expanded, onToggle }) {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const results = query ? searchLibrary({ query }).slice(0, 6) : [];

  return (
    <div className="item">
      <div className="top" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <strong>{workout.title}</strong>
          <p className="small">{workout.focus}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isToday && <Pill tone="ember">Today</Pill>}
          <span className="small">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt">
          <div className="field-row">
            <div className="field">
              <label>Title</label>
              <input type="text" value={workout.title} onInput={e => updatePlanWorkout(workout.id, { title: e.currentTarget.value })} />
            </div>
            <div className="field">
              <label>Est. Duration (min)</label>
              <input type="number" value={workout.estimatedDuration} onInput={e => updatePlanWorkout(workout.id, { estimatedDuration: Number(e.currentTarget.value) || 30 })} />
            </div>
          </div>
          <div className="field mt">
            <label>Focus</label>
            <input type="text" value={workout.focus} onInput={e => updatePlanWorkout(workout.id, { focus: e.currentTarget.value })} />
          </div>

          <div className="list mt">
            {workout.exercises.map(ex => (
              <div className="item" key={ex.id}>
                <div className="top">
                  <strong>{ex.name}</strong>
                  <button className="btn sm danger" onClick={() => removePlanExercise(workout.id, ex.id)}>Remove</button>
                </div>
                <div className="field-row cols-3 mt">
                  <div className="field"><label>Sets</label><input type="number" value={ex.sets} onInput={e => updatePlanExercise(workout.id, ex.id, { sets: Number(e.currentTarget.value) || 1 })} /></div>
                  <div className="field"><label>Reps</label><input type="text" value={ex.reps} onInput={e => updatePlanExercise(workout.id, ex.id, { reps: e.currentTarget.value })} /></div>
                  <div className="field"><label>Rest (s)</label><input type="number" value={ex.restSeconds} onInput={e => updatePlanExercise(workout.id, ex.id, { restSeconds: Number(e.currentTarget.value) || 0 })} /></div>
                </div>
              </div>
            ))}
            {!workout.exercises.length && <p className="muted center">No exercises yet — add one below.</p>}
          </div>

          {showAdd ? (
            <div className="mt">
              <input className="search-input" placeholder="Search exercise library..." value={query} onInput={e => setQuery(e.currentTarget.value)} />
              <div className="list">
                {results.map(r => (
                  <div className="item" key={r.name}>
                    <div className="top">
                      <span>{r.name}</span>
                      <button
                        className="btn sm primary"
                        onClick={() => {
                          addPlanExercise(workout.id, freshExercise({
                            name: r.name, muscleGroup: r.category, equipment: r.equipment,
                            instructions: r.instructions, safetyNote: r.safetyNote, cue: r.instructions,
                            options: [{ name: r.name, muscleGroup: r.category, equipment: r.equipment, cue: r.instructions }]
                          }));
                          setShowAdd(false); setQuery('');
                        }}
                      >Add</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn ghost block mt" onClick={() => setShowAdd(false)}>Close Search</button>
            </div>
          ) : (
            <button className="btn ghost block mt" onClick={() => setShowAdd(true)}>+ Add Exercise To This Day</button>
          )}
        </div>
      )}
    </div>
  );
}
