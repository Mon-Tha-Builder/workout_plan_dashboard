// Ava readiness layer. This is a read-only context builder — nothing here
// opens a live connection. Once a permissioned Ava integration exists, this
// is the single function it would call to read Forge's state; Ava can never
// write back through this module.
import { profile, plan, sessions, logs, recoveryLogs, streak, weeklyCompletion, coachNotes, rotationIndex } from './store.js';
import { todayISO } from './models.js';

export function buildAvaContext() {
  const today = todayISO();
  const week = weeklyCompletion.value;
  const todaySession = sessions.value[today] || null;
  const recentLogs = [...logs.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hasLog = logs.value.some(l => l.date === key);
    last14.push({ date: key, trained: hasLog });
  }
  const missedWorkouts = last14.filter(d => !d.trained && d.date !== today).map(d => d.date);

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      goal: profile.value.goal,
      experienceLevel: profile.value.experienceLevel,
      motivationStyle: profile.value.motivationStyle,
      limitations: profile.value.limitations
    },
    currentPlan: plan.value ? {
      name: plan.value.name,
      goal: plan.value.goal,
      daysPerWeek: plan.value.daysPerWeek,
      templateId: plan.value.templateId
    } : null,
    todayWorkout: todaySession ? {
      title: todaySession.title,
      focus: todaySession.focus,
      status: todaySession.status,
      estimatedDuration: todaySession.estimatedDuration
    } : null,
    nextScheduledWorkout: plan.value ? plan.value.workouts[rotationIndex()]?.title || null : null,
    completedWorkouts: recentLogs.map(l => ({ date: l.date, title: l.title, duration: l.duration })),
    missedWorkoutDates: missedWorkouts,
    weeklyConsistency: { completed: week.completed, target: week.target },
    streakDays: streak.value,
    recoveryStatus: recoveryLogs.value[today] ? {
      zone: recoveryLogs.value[today].zone,
      score: recoveryLogs.value[today].readinessScore,
      recommendation: recoveryLogs.value[today].recommendation
    } : null,
    trainingNotes: coachNotes.value.slice(-5).map(n => ({ date: n.date, title: n.title, body: n.body }))
  };
}
