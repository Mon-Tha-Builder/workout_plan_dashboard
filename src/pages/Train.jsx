import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  sessions, plan, startWorkout, logSet, completeExercise, swapExercise,
  addExerciseToSession, removeExerciseFromSession, finishWorkout
} from '../lib/store.js';
import { todayISO, freshExercise } from '../lib/models.js';
import { navigate } from '../router.js';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { Pill } from '../components/Pill.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { RestTimer } from '../components/RestTimer.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { searchLibrary } from '../lib/exerciseLibrary.js';

// Keeps the screen awake during an active workout, where supported. Purely
// an enhancement — feature-detected, never claimed as guaranteed behavior.
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;
    navigator.wakeLock.request('screen').then(l => { if (!cancelled) lock = l; else l.release().catch(() => {}); }).catch(() => {});
    return () => { cancelled = true; if (lock) lock.release().catch(() => {}); };
  }, [active]);
}

export function Train() {
  const today = todayISO();
  const session = sessions.value[today];
  const [restFor, setRestFor] = useState(null); // { exerciseId, seconds }
  const [removeTarget, setRemoveTarget] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [summary, setSummary] = useState(null);

  useWakeLock(session?.status === 'in_progress');

  if (!plan.value) {
    return <EmptyState icon="⚡" title="No Plan Yet" body="Set up your plan first." action={<button className="btn primary" onClick={() => navigate('/onboarding')}>Start Setup</button>} />;
  }
  if (!session) {
    return <EmptyState icon="🏋" title="No Session Loaded" body="Head to Today to load today's workout." action={<button className="btn primary" onClick={() => navigate('/today')}>Go To Today</button>} />;
  }

  if (summary) {
    return <WorkoutSummary summary={summary} onDone={() => navigate('/progress')} />;
  }

  if (session.status === 'not_started') {
    return (
      <div className="card">
        <h2>{session.title}</h2>
        <p className="muted mt">{session.focus}</p>
        <div className="grid grid3 mt">
          <div className="stat"><small>Exercises</small><b>{session.exercises.length}</b></div>
          <div className="stat"><small>Est. Time</small><b>{session.estimatedDuration} min</b></div>
          <div className="stat"><small>Status</small><b>Ready</b></div>
        </div>
        <button className="smart-action mt" onClick={() => startWorkout(today)}>Begin Workout</button>
      </div>
    );
  }

  const doneCount = session.exercises.filter(e => e.done).length;
  const firstOpenId = session.exercises.find(e => !e.done)?.id;

  function handleFinish() {
    const result = finishWorkout(today);
    setSummary(result);
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      <div className="card">
        <div className="flex-between">
          <div>
            <h2>{session.title}</h2>
            <p className="small">{session.focus}</p>
          </div>
          <Pill tone={session.status === 'adjusted' ? 'warn' : 'ember'}>{session.status.replace('_', ' ')}</Pill>
        </div>
        <div className="mt"><ProgressBar value={doneCount} max={session.exercises.length} good /></div>
        <p className="small mt">{doneCount} of {session.exercises.length} exercises complete</p>
      </div>

      {restFor && (
        <RestTimer seconds={restFor.seconds} onDone={() => setRestFor(null)} />
      )}

      <div className="list">
        {session.exercises.map(ex => (
          <ExerciseConsole
            key={ex.id}
            ex={ex}
            date={today}
            active={ex.id === firstOpenId}
            onLogSet={(setData) => { logSet(today, ex.id, setData); if (ex.restSeconds > 0) setRestFor({ exerciseId: ex.id, seconds: ex.restSeconds }); }}
            onComplete={(data) => completeExercise(today, ex.id, data)}
            onSwap={(name) => swapExercise(today, ex.id, name)}
            onRemove={() => setRemoveTarget(ex.id)}
          />
        ))}
      </div>

      <button className="btn ghost block" onClick={() => setShowAdd(true)}>+ Add Exercise</button>
      <button className="smart-action" onClick={handleFinish}>Finish Workout</button>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Exercise?"
        body="This removes it from today's session only — your plan template is unaffected."
        confirmLabel="Remove"
        danger
        onConfirm={() => { removeExerciseFromSession(today, removeTarget); setRemoveTarget(null); }}
        onCancel={() => setRemoveTarget(null)}
      />

      {showAdd && (
        <AddExerciseDialog
          onAdd={(libEx) => {
            addExerciseToSession(today, freshExercise({
              name: libEx.name, muscleGroup: libEx.category, equipment: libEx.equipment,
              instructions: libEx.instructions, safetyNote: libEx.safetyNote, cue: libEx.instructions,
              options: [{ name: libEx.name, muscleGroup: libEx.category, equipment: libEx.equipment, cue: libEx.instructions }]
            }));
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function ExerciseConsole({ ex, date, active, onLogSet, onComplete, onSwap, onRemove }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState(ex.notes || '');
  const [rating, setRating] = useState(ex.rating || 3);

  function logSetNow() {
    if (!reps) return;
    onLogSet({ weight, reps, rpe });
    setWeight(''); setReps(''); setRpe('');
  }

  return (
    <div className={`exercise${active ? ' active' : ''}${ex.done ? ' done' : ''}`}>
      <div className="exercise-top">
        <div>
          <h3>{ex.name}</h3>
          <p className="small">{ex.muscleGroup} {ex.changed ? '• swapped' : ''}</p>
        </div>
        <Pill tone={ex.done ? 'good' : 'warn'}>{ex.done ? 'Done' : 'Open'}</Pill>
      </div>
      {ex.instructions && <p className="muted mt">{ex.instructions}</p>}

      <div className="targets">
        <div className="target"><small>Sets</small><b>{ex.sets}</b></div>
        <div className="target"><small>Target</small><b>{ex.reps}</b></div>
        <div className="target"><small>Rest</small><b>{ex.restSeconds ? `${ex.restSeconds}s` : '—'}</b></div>
        <div className="target"><small>Cue</small><b style={{ fontSize: 11 }}>{ex.cue}</b></div>
      </div>

      {ex.loggedSets.length > 0 && (
        <div className="list mt">
          {ex.loggedSets.map((s, i) => (
            <div className="item" key={i}><div className="top"><span className="small">Set {s.setNumber}</span><span>{s.weight || '—'} × {s.reps}{s.rpe ? ` @ RPE ${s.rpe}` : ''}</span></div></div>
          ))}
        </div>
      )}

      {!ex.done && (
        <div className="field-row cols-3 mt">
          <div className="field"><label>Weight</label><input type="number" step="0.5" value={weight} onInput={e => setWeight(e.currentTarget.value)} /></div>
          <div className="field"><label>Reps</label><input type="text" value={reps} onInput={e => setReps(e.currentTarget.value)} /></div>
          <div className="field"><label>RPE</label><input type="number" min="1" max="10" value={rpe} onInput={e => setRpe(e.currentTarget.value)} /></div>
        </div>
      )}
      {!ex.done && <button className="btn block mt" onClick={logSetNow}>Log Set {ex.loggedSets.length + 1} of {ex.sets}</button>}

      {!ex.done && (
        <>
          <div className="field mt">
            <label>Notes</label>
            <input type="text" value={notes} placeholder="pain, easy, strong, awkward" onInput={e => setNotes(e.currentTarget.value)} />
          </div>
          <div className="field mt">
            <label>How did it feel?</label>
            <select value={rating} onChange={e => setRating(Number(e.currentTarget.value))}>
              <option value={1}>Hate it</option>
              <option value={2}>Don't like it</option>
              <option value={3}>Neutral</option>
              <option value={4}>Like it</option>
              <option value={5}>Love it</option>
            </select>
          </div>
          <div className="btns">
            <button className="btn good" onClick={() => onComplete({ notes, rating })}>Complete Exercise</button>
            <select onChange={e => { if (e.currentTarget.value) onSwap(e.currentTarget.value); }} defaultValue="">
              <option value="">Swap exercise</option>
              {ex.options.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
            </select>
            <button className="btn danger" onClick={onRemove}>Remove</button>
          </div>
        </>
      )}
    </div>
  );
}

function AddExerciseDialog({ onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchLibrary({ query }).slice(0, 8), [query]);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>Add Exercise</h3>
        <input className="search-input" placeholder="Search exercises..." value={query} onInput={e => setQuery(e.currentTarget.value)} />
        <div className="list" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {results.map(r => (
            <div className="item" key={r.name}>
              <div className="top">
                <div><strong>{r.name}</strong><p className="small">{r.category}</p></div>
                <button className="btn sm primary" onClick={() => onAdd(r)}>Add</button>
              </div>
            </div>
          ))}
          {!results.length && <p className="muted center">No matches.</p>}
        </div>
        <button className="btn ghost block mt" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function WorkoutSummary({ summary, onDone }) {
  return (
    <div className="card hud-frame">
      <div className="hero-eyebrow">Workout Complete</div>
      <h1 style={{ fontSize: 32 }}>{summary.title}</h1>
      <div className="grid grid3 mt">
        <div className="stat"><small>Duration</small><b>{summary.duration} min</b></div>
        <div className="stat"><small>Target</small><b>{summary.targetMinutes} min</b></div>
        <div className="stat accent"><small>Pace</small><b style={{ fontSize: 16 }}>{summary.pace}</b></div>
      </div>
      <div className="grid grid3 mt">
        <div className="stat"><small>Completed</small><b>{summary.completedExercises.length}</b></div>
        <div className="stat"><small>Volume</small><b>{summary.totalVolume}</b></div>
        <div className="stat"><small>PRs Checked</small><b>{summary.completedExercises.filter(e => Number(e.weight)).length}</b></div>
      </div>
      <div className="card mt" style={{ background: 'var(--bg-elevated)' }}>
        <p className="small">Coach Note</p>
        <p className="mt">{summary.nextTimeAdvice}</p>
      </div>
      <button className="smart-action good-state mt" onClick={onDone}>View Progress</button>
    </div>
  );
}
