import { useMemo, useState } from 'preact/hooks';
import { CATEGORIES, searchLibrary } from '../lib/exerciseLibrary.js';
import { listTemplates } from '../lib/planTemplates.js';
import { profile, sessions, addExerciseToSession } from '../lib/store.js';
import { todayISO, freshExercise } from '../lib/models.js';
import { Pill, Tag } from '../components/Pill.jsx';
import { navigate } from '../router.js';

export function Library() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [added, setAdded] = useState('');

  const today = todayISO();
  const todaySession = sessions.value[today];

  const results = useMemo(() => searchLibrary({
    query, category, equipment: onlyAvailable ? profile.value.equipment : null
  }), [query, category, onlyAvailable, profile.value.equipment]);

  function addToToday(ex) {
    if (!todaySession) return;
    addExerciseToSession(today, freshExercise({
      name: ex.name, muscleGroup: ex.category, equipment: ex.equipment,
      instructions: ex.instructions, safetyNote: ex.safetyNote, cue: ex.instructions,
      options: [{ name: ex.name, muscleGroup: ex.category, equipment: ex.equipment, cue: ex.instructions }]
    }));
    setAdded(ex.name);
    setTimeout(() => setAdded(''), 1800);
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">Library</div>
        <h1 style={{ fontSize: 34 }}>Exercise Reference</h1>
        <p className="muted mt">Every movement FORGE can program, with real instructions and safety notes — not decoration.</p>
      </section>

      <div className="card">
        <input className="search-input" placeholder="Search exercises..." value={query} onInput={e => setQuery(e.currentTarget.value)} />
        <div className="tab-row">
          <button type="button" className={`chip${category === 'All' ? ' active' : ''}`} onClick={() => setCategory('All')}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} type="button" className={`chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <label className="toggle" style={{ maxWidth: 280 }}>
          <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.currentTarget.checked)} />
          Only show what I can do
        </label>
      </div>

      <div className="grid grid2">
        {results.map(ex => (
          <div className="card" key={ex.name}>
            <div className="card-head">
              <h3>{ex.name}</h3>
              <Tag>{ex.category}</Tag>
            </div>
            <p className="muted">{ex.instructions}</p>
            <p className="small mt">Safety: {ex.safetyNote}</p>
            {!!ex.equipment.length && (
              <div className="filter-row mt">
                {ex.equipment.map(k => <Tag key={k} tone="steel">{k}</Tag>)}
              </div>
            )}
            {todaySession ? (
              <button className="btn block mt" onClick={() => addToToday(ex)}>{added === ex.name ? 'Added ✓' : 'Add To Today\'s Workout'}</button>
            ) : (
              <button className="btn ghost block mt" onClick={() => navigate('/today')}>Start Today's Session To Add</button>
            )}
          </div>
        ))}
        {!results.length && <p className="muted center" style={{ gridColumn: '1 / -1' }}>No exercises match your filters.</p>}
      </div>

      <div className="card">
        <div className="card-head"><h2>Workout Templates</h2><Pill>{listTemplates().length}</Pill></div>
        <div className="grid grid2 mt">
          {listTemplates().map(t => (
            <div className="item" key={t.id}>
              <strong>{t.name}</strong>
              <p className="small mt">{t.description}</p>
              <p className="small">{t.defaultDays} days / week</p>
              <button className="btn sm ghost mt" onClick={() => navigate('/plan')}>View In Plan</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
