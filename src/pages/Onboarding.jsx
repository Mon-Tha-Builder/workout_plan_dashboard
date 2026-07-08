import { useState } from 'preact/hooks';
import { EQUIPMENT_DEFS, DEFAULT_EQUIPMENT } from '../lib/models.js';
import { listTemplates } from '../lib/planTemplates.js';
import { completeOnboarding } from '../lib/store.js';
import { navigate } from '../router.js';

const GOALS = [
  ['muscle', 'Build Muscle', 'Add size, look stronger'],
  ['fatloss', 'Lose Fat', 'Lean out, stay strong'],
  ['strength', 'Get Stronger', 'Chase heavier lifts'],
  ['athleticism', 'Athleticism', 'Move better, condition'],
  ['consistency', 'Consistency', 'Just show up and train'],
  ['health', 'General Health', 'Feel good, stay active']
];
const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const DURATIONS = [30, 45, 60, 90];
const WEEKDAYS = [['Sun', 0], ['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6]];
const MOTIVATION = [
  ['strict', 'Strict', 'No excuses, direct'],
  ['calm', 'Calm', 'Steady and even'],
  ['hype', 'Hype', 'High energy push'],
  ['technical', 'Technical', 'Data and detail']
];

const STEP_COUNT = 8;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('consistency');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [preferredDays, setPreferredDays] = useState([1, 2, 3, 4, 5]);
  const [duration, setDuration] = useState(45);
  const [equipment, setEquipment] = useState({ ...DEFAULT_EQUIPMENT });
  const [limitations, setLimitations] = useState('');
  const [templateId, setTemplateId] = useState('forge_hybrid');
  const [motivationStyle, setMotivationStyle] = useState('calm');

  function toggleDay(d) {
    setPreferredDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }
  function toggleEquip(key) {
    setEquipment(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function next() { setStep(s => Math.min(STEP_COUNT - 1, s + 1)); }
  function back() { setStep(s => Math.max(0, s - 1)); }

  function finish() {
    completeOnboarding({
      goal, experienceLevel, preferredDays: preferredDays.length ? preferredDays : [1, 2, 3, 4, 5],
      preferredWorkoutDuration: duration, equipment, limitations, motivationStyle
    }, templateId);
    navigate('/today');
  }

  const canAdvance = [
    !!goal, !!experienceLevel, preferredDays.length >= 2, !!duration, true, true, !!templateId, !!motivationStyle
  ][step];

  return (
    <div className="shell" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>
      <div className="hero hud-frame" style={{ marginBottom: 16 }}>
        <div className="hero-eyebrow">Forge Setup</div>
        <h1 style={{ fontSize: 34 }}>Build Your Command Center</h1>
        <p className="muted mt">Eight quick questions. FORGE turns this into a real, working weekly plan — no fake AI, just a deterministic plan built from your answers.</p>
      </div>

      <div className="card">
        <div className="onboard-steps">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div key={i} className={`dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <Step title="What's your main goal?">
            <div className="choice-grid">
              {GOALS.map(([id, label, sub]) => (
                <button key={id} type="button" className={`choice-card${goal === id ? ' selected' : ''}`} onClick={() => setGoal(id)}>
                  <b>{label}</b><span>{sub}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="Experience level?">
            <div className="choice-grid cols-3">
              {LEVELS.map(([id, label]) => (
                <button key={id} type="button" className={`choice-card${experienceLevel === id ? ' selected' : ''}`} onClick={() => setExperienceLevel(id)}>
                  <b>{label}</b>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Which days can you train?" hint="Pick at least 2.">
            <div className="choice-grid cols-3">
              {WEEKDAYS.map(([label, d]) => (
                <button key={d} type="button" className={`choice-card${preferredDays.includes(d) ? ' selected' : ''}`} onClick={() => toggleDay(d)}>
                  <b>{label}</b>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step title="Preferred workout length?">
            <div className="choice-grid">
              {DURATIONS.map(d => (
                <button key={d} type="button" className={`choice-card${duration === d ? ' selected' : ''}`} onClick={() => setDuration(d)}>
                  <b>{d} min</b>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="What equipment do you have?">
            <div className="toggle-grid">
              {EQUIPMENT_DEFS.map(([key, label]) => (
                <label key={key} className="toggle">
                  <input type="checkbox" checked={equipment[key]} onChange={() => toggleEquip(key)} />
                  {label}
                </label>
              ))}
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="Any injuries or limitations?" hint="Optional. FORGE uses this to steer exercise selection away from pain.">
            <div className="field">
              <label>Injuries, pain areas, or limitations</label>
              <textarea value={limitations} onInput={e => setLimitations(e.currentTarget.value)} placeholder="e.g. mid back and neck tension, cranky right knee" />
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step title="Pick a training style" hint="You can change this later in Plan.">
            <div className="choice-grid" style={{ gridTemplateColumns: '1fr' }}>
              {listTemplates().map(t => (
                <button key={t.id} type="button" className={`choice-card${templateId === t.id ? ' selected' : ''}`} onClick={() => setTemplateId(t.id)}>
                  <b>{t.name}</b><span>{t.description}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 7 && (
          <Step title="How should FORGE talk to you?">
            <div className="choice-grid">
              {MOTIVATION.map(([id, label, sub]) => (
                <button key={id} type="button" className={`choice-card${motivationStyle === id ? ' selected' : ''}`} onClick={() => setMotivationStyle(id)}>
                  <b>{label}</b><span>{sub}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        <div className="btns">
          {step > 0 && <button className="btn ghost" onClick={back}>Back</button>}
          {step < STEP_COUNT - 1
            ? <button className="btn primary" disabled={!canAdvance} onClick={next}>Continue</button>
            : <button className="btn primary" onClick={finish}>Build My Plan</button>}
        </div>
      </div>
    </div>
  );
}

function Step({ title, hint, children }) {
  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>{title}</h2>
      {hint && <p className="muted" style={{ marginBottom: 12 }}>{hint}</p>}
      {!hint && <div style={{ marginBottom: 12 }} />}
      {children}
    </div>
  );
}
