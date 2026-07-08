import { useEffect, useState } from 'preact/hooks';
import { plan, sessions, recoveryLogs, logs, streak, weeklyCompletion, getOrCreateSession, startWorkout, quickLogWorkout } from '../lib/store.js';
import { todayISO } from '../lib/models.js';
import { navigate } from '../router.js';
import { StatTile } from '../components/StatTile.jsx';
import { Pill } from '../components/Pill.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { RadialGauge } from '../components/RadialGauge.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ZONE_LABEL, ZONE_PILL_CLASS } from '../lib/recovery.js';

export function Today() {
  const today = todayISO();
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  useEffect(() => {
    if (plan.value && !sessions.value[today]) getOrCreateSession(today);
  }, [plan.value, today]);

  if (!plan.value) {
    return (
      <EmptyState
        icon="⚡"
        title="No Plan Yet"
        body="FORGE needs a plan before it can tell you what to do today."
        action={<button className="btn primary" onClick={() => navigate('/onboarding')}>Start Setup</button>}
      />
    );
  }

  const session = sessions.value[today];
  const recovery = recoveryLogs.value[today];
  const week = weeklyCompletion.value;
  const alreadyLoggedToday = logs.value.some(l => l.date === today);
  const isRecoveryDay = session?.title === 'Recovery Reset';

  function handlePrimary() {
    if (alreadyLoggedToday) { navigate('/progress'); return; }
    startWorkout(today);
    navigate('/train');
  }

  function confirmQuickLog() {
    quickLogWorkout(today);
    setQuickLogOpen(false);
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <h1>{alreadyLoggedToday ? 'Locked In' : (session ? session.title : 'Rest Day')}</h1>
        {session && <p className="muted mt">{session.focus}</p>}
      </section>

      <div className="desk-grid">
        <div className="section-gap">
          <div className="card">
            <div className="card-head">
              <h2>Command Center</h2>
              {recovery && <Pill tone={ZONE_PILL_CLASS[recovery.zone]}>{ZONE_LABEL[recovery.zone]}</Pill>}
            </div>
            <div className="grid grid4">
              <StatTile label="Focus" value={session ? (session.exercises[0]?.muscleGroup || session.focus.split(' ')[0]) : '—'} />
              <StatTile label="Est. Time" value={session ? `${session.estimatedDuration} min` : '—'} />
              <StatTile label="Streak" value={`${streak.value}d`} accent />
              <StatTile label="This Week" value={`${week.completed}/${week.target}`} />
            </div>

            {alreadyLoggedToday ? (
              <button className="smart-action good-state mt" onClick={() => navigate('/progress')}>Workout Logged — View Progress</button>
            ) : isRecoveryDay ? (
              <button className="smart-action calm-state mt" onClick={handlePrimary}>Start Recovery Session</button>
            ) : (
              <button className="smart-action mt" onClick={handlePrimary}>Start Workout</button>
            )}
            {!alreadyLoggedToday && (
              <div className="btns">
                <button className="btn ghost" onClick={() => setQuickLogOpen(true)}>Quick Log Complete</button>
                <button className="btn ghost" onClick={() => navigate('/recovery')}>{recovery ? 'Update Readiness' : 'Check In Readiness'}</button>
              </div>
            )}
          </div>

          {session?.notes && (
            <div className="card">
              <h2>Coach Decision</h2>
              <p className="muted mt">{session.notes}</p>
            </div>
          )}
        </div>

        <div className="section-gap">
          <div className="card">
            <h2>Readiness</h2>
            {recovery ? (
              <div className="mt" style={{ display: 'flex', justifyContent: 'center' }}>
                <RadialGauge score={recovery.readinessScore} zone={recovery.zone} />
              </div>
            ) : (
              <EmptyState icon="🌙" title="Not Checked In" body="Log sleep, soreness, energy, and stress so FORGE can adapt today's plan." action={<button className="btn primary" onClick={() => navigate('/recovery')}>Check In Now</button>} />
            )}
          </div>

          <div className="card">
            <h2>This Week</h2>
            <p className="small mt">{week.completed} of {week.target} sessions completed</p>
            <div className="mt"><ProgressBar value={week.completed} max={week.target} good /></div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={quickLogOpen}
        title="Quick Log Today's Workout"
        body="This marks today's session as complete without walking through the live tracker. Use it when you already trained and just need it logged."
        confirmLabel="Mark Complete"
        onConfirm={confirmQuickLog}
        onCancel={() => setQuickLogOpen(false)}
      />
    </div>
  );
}
