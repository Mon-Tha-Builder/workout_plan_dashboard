// Single source of truth for FORGE app state. Everything is a @preact/signals
// signal; components read signals directly (auto-subscribing) and call the
// action functions exported below to mutate state. There is no global
// monkey-patching anywhere in this module — every mutation goes through an
// explicit, named function, and `persist()` is called at the end of each one.

import { signal, computed, batch } from '@preact/signals';
import {
  freshProfile, freshPlan, freshRecoveryLog, freshMetric, todayISO, dateKey, parseDateKey, uid
} from './models.js';
import { scoreReadiness } from './recovery.js';
import { getTemplate } from './planTemplates.js';
import { buildSessionInstance, applyAdaptation, buildWorkoutSummary } from './adaptiveEngine.js';

const STORAGE_KEY = 'forge.v10';
const LEGACY_KEYS = ['forgeFitnessOS.v7', 'forgeFitnessOS.v6', 'forgeFitnessOS.v5', 'forgeFitnessOS.v4', 'forgeFitnessOS.v3', 'forgeFitnessOS.v2', 'forgeFitnessOS.v1'];
const LEGACY_CLOUD_KEY = 'forgeFitnessCloud.v1';

// ---------------------------------------------------------------- signals --

export const profile = signal(freshProfile());
export const plan = signal(/** @type {import('./models.js').WorkoutPlan|null} */(null));
/** @type {import('@preact/signals').Signal<Record<string, import('./models.js').Workout>>} */
export const sessions = signal({}); // date -> live Workout instance
/** @type {import('@preact/signals').Signal<import('./models.js').WorkoutLog[]>} */
export const logs = signal([]);
/** @type {import('@preact/signals').Signal<Record<string, import('./models.js').RecoveryLog>>} */
export const recoveryLogs = signal({}); // date -> RecoveryLog
/** @type {import('@preact/signals').Signal<import('./models.js').ProgressMetric[]>} */
export const metrics = signal([]);
/** @type {import('@preact/signals').Signal<Record<string, number>>} */
export const ratings = signal({}); // exerciseName -> 1..5
/** @type {import('@preact/signals').Signal<Record<string, {name:string, bestWeight:number, bestVolume:number, bestEst1RM:number}>>} */
export const prs = signal({});
/** @type {import('@preact/signals').Signal<Array<{id:string,date:string,title:string,body:string}>>} */
export const coachNotes = signal([]);
// The Worker URL is not sensitive (it's a public endpoint) — safe to ship as a default
// so a fresh browser/device doesn't need it retyped. ownerId/deviceId/token are per-device
// secrets/identifiers and must still be entered by the user; never default those.
const FORGE_WORKER_URL = 'https://forge-fitness-worker.jamonm221.workers.dev';

export const cloudSettings = signal({
  workerUrl: FORGE_WORKER_URL, ownerId: '', deviceId: '', token: '', lastSync: null, lastStatus: 'Not connected'
});
export const lastSaved = signal(null);
export const migrationNotice = signal('');

let ready = false;

// --------------------------------------------------------------- persist --

function snapshot() {
  return {
    version: '10.0.0',
    profile: profile.value,
    plan: plan.value,
    sessions: sessions.value,
    logs: logs.value,
    recoveryLogs: recoveryLogs.value,
    metrics: metrics.value,
    ratings: ratings.value,
    prs: prs.value,
    coachNotes: coachNotes.value,
    cloudSettings: cloudSettings.value,
    lastSaved: new Date().toISOString()
  };
}

/** Exposes the current full snapshot for cloud sync — same shape persist() writes locally. */
export function getSnapshot() {
  return snapshot();
}

/** Generic field patch for a live session exercise (used by the AI coach layer after validation). */
export function updateSessionExercise(date, exerciseId, partial) {
  updateSession(date, session => ({
    ...session,
    exercises: session.exercises.map(ex => (ex.id === exerciseId ? { ...ex, ...partial } : ex))
  }));
}

export function persist() {
  lastSaved.value = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  } catch (err) {
    console.error('FORGE: failed to persist state', err);
  }
}

function hydrateFrom(data) {
  batch(() => {
    profile.value = { ...freshProfile(), ...(data.profile || {}) };
    plan.value = data.plan || null;
    sessions.value = data.sessions || {};
    logs.value = Array.isArray(data.logs) ? data.logs : [];
    recoveryLogs.value = data.recoveryLogs || {};
    metrics.value = Array.isArray(data.metrics) ? data.metrics : [];
    ratings.value = data.ratings || {};
    prs.value = data.prs || {};
    coachNotes.value = Array.isArray(data.coachNotes) ? data.coachNotes : [];
    // Never let a missing/redacted token in incoming data (e.g. an exported backup) wipe an already-configured one.
    cloudSettings.value = {
      ...cloudSettings.value,
      ...(data.cloudSettings || {}),
      token: (data.cloudSettings && data.cloudSettings.token) || cloudSettings.value.token
    };
    lastSaved.value = data.lastSaved || null;
  });
}

/** Best-effort migration from the old single-blob `db` shape (forgeFitnessOS.v1-7). */
function migrateLegacy(old) {
  const goalMap = {
    'Hybrid Frame Build': 'consistency',
    'Muscle Build': 'muscle',
    'Strength Block': 'strength',
    'Conditioning': 'athleticism',
    'Recovery Reset': 'health'
  };
  const levelMap = {
    'Beginner': 'beginner',
    'Between beginner and intermediate': 'beginner',
    'Intermediate': 'intermediate',
    'Advanced': 'advanced'
  };

  const oldProfile = old.profile || {};
  const newProfile = {
    ...freshProfile(),
    equipment: { ...freshProfile().equipment, ...(old.equipment || {}) },
    goal: goalMap[oldProfile.goal] || 'consistency',
    experienceLevel: levelMap[oldProfile.level] || 'intermediate',
    limitations: oldProfile.equipmentNotes || '',
    onboarded: true
  };

  const template = getTemplate('forge_hybrid');
  const newPlan = freshPlan({ name: 'FORGE Hybrid Frame Split', templateId: 'forge_hybrid', workouts: template.buildWorkouts(newProfile) });

  const newLogs = (Array.isArray(old.summaries) ? old.summaries : []).map(summary => {
    const matchingSession = (old.sessions && old.sessions[summary.date]) || null;
    const completedExercises = matchingSession && Array.isArray(matchingSession.exercises)
      ? matchingSession.exercises.filter(e => e.done).map(e => ({
          exerciseId: e.id || uid(),
          exerciseName: e.name,
          setsCompleted: Number(e.sets) || 0,
          totalReps: Number(e.actualReps) || 0,
          weight: e.actualWeight || '',
          rpe: e.actualRpe || '',
          rating: Number(e.rating) || 3,
          notes: e.notes || ''
        }))
      : [];
    return {
      id: summary.id || uid(),
      workoutId: summary.sessionId || '',
      date: summary.date,
      completedExercises,
      totalVolume: 0,
      duration: Number(summary.duration) || 0,
      notes: '',
      perceivedEffort: 0,
      title: summary.title || '',
      targetMinutes: Number(summary.target) || 45,
      pace: summary.pace || 'on pace',
      nextTimeAdvice: summary.next || ''
    };
  });

  const newRecoveryLogs = {};
  Object.entries(old.ready || {}).forEach(([date, r]) => {
    const scored = scoreReadiness(r);
    newRecoveryLogs[date] = freshRecoveryLog({
      date,
      sleepQuality: Number(r.sleep) || 5,
      soreness: Number(r.sore) || 5,
      energy: Number(r.energy) || 5,
      stress: Number(r.stress) || 5,
      timeAvailable: Number(r.time) || 45,
      pain: r.pain || '',
      readinessScore: scored.score,
      zone: scored.zone,
      recommendation: scored.recommendation
    });
  });

  const newMetrics = [];
  (Array.isArray(old.body) ? old.body : []).forEach(entry => {
    ['weight', 'waist', 'chest', 'arms', 'shoulders', 'thighs', 'bodyfat'].forEach(field => {
      if (entry[field] !== undefined && entry[field] !== '') {
        newMetrics.push(freshMetric({
          date: entry.date,
          metricType: field,
          value: Number(entry[field]) || 0,
          unit: field === 'bodyfat' ? '%' : field === 'weight' ? 'lb' : 'in',
          notes: entry.notes || ''
        }));
      }
    });
  });

  const newPrs = {};
  Object.values(old.prs || {}).forEach(p => {
    newPrs[p.name] = { name: p.name, bestWeight: p.bestWeight || 0, bestVolume: p.bestVolume || 0, bestEst1RM: p.bestMax || 0 };
  });

  return {
    version: '10.0.0',
    profile: newProfile,
    plan: newPlan,
    sessions: {},
    logs: newLogs,
    recoveryLogs: newRecoveryLogs,
    metrics: newMetrics,
    ratings: old.ratings || {},
    prs: newPrs,
    coachNotes: Array.isArray(old.coach) ? old.coach : [],
    cloudSettings: { workerUrl: FORGE_WORKER_URL, ownerId: '', deviceId: '', token: '', lastSync: null, lastStatus: 'Not connected' },
    lastSaved: old.lastSaved || null
  };
}

export function initStore() {
  if (ready) return;
  ready = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      hydrateFrom(JSON.parse(raw));
      return;
    }
    for (const key of LEGACY_KEYS) {
      const rawOld = localStorage.getItem(key);
      if (rawOld) {
        const migrated = migrateLegacy(JSON.parse(rawOld));
        hydrateFrom(migrated);
        migrationNotice.value = 'Your previous FORGE data was found and upgraded to the new command center automatically.';
        persist();
        return;
      }
    }
  } catch (err) {
    console.error('FORGE: failed to load saved state, starting fresh', err);
  }
}

// --------------------------------------------------------------- actions --

export function completeOnboarding(profileData, templateId, planOptions = {}) {
  const template = getTemplate(templateId);
  batch(() => {
    profile.value = { ...profile.value, ...profileData, onboarded: true };
    plan.value = freshPlan({
      name: template.name,
      templateId,
      goal: profileData.goal,
      daysPerWeek: profileData.preferredDays?.length || template.defaultDays,
      assignedDays: profileData.preferredDays || template.assignedDays,
      workouts: template.buildWorkouts(profile.value),
      ...planOptions
    });
    sessions.value = {};
  });
  persist();
}

export function updateProfile(partial) {
  profile.value = { ...profile.value, ...partial };
  persist();
}

export function setPlan(nextPlan) {
  plan.value = nextPlan;
  sessions.value = {};
  persist();
}

function invalidateUpcomingSessions() {
  sessions.value = Object.fromEntries(Object.entries(sessions.value).filter(([, s]) => s.status !== 'not_started'));
}

export function updatePlanMeta(partial) {
  if (!plan.value) return;
  plan.value = { ...plan.value, ...partial };
  persist();
}

export function updatePlanWorkout(workoutId, partial) {
  if (!plan.value) return;
  plan.value = { ...plan.value, workouts: plan.value.workouts.map(w => (w.id === workoutId ? { ...w, ...partial } : w)) };
  invalidateUpcomingSessions();
  persist();
}

export function updatePlanExercise(workoutId, exerciseId, partial) {
  if (!plan.value) return;
  plan.value = {
    ...plan.value,
    workouts: plan.value.workouts.map(w => (w.id !== workoutId ? w : {
      ...w, exercises: w.exercises.map(e => (e.id === exerciseId ? { ...e, ...partial } : e))
    }))
  };
  invalidateUpcomingSessions();
  persist();
}

export function removePlanExercise(workoutId, exerciseId) {
  if (!plan.value) return;
  plan.value = {
    ...plan.value,
    workouts: plan.value.workouts.map(w => (w.id !== workoutId ? w : { ...w, exercises: w.exercises.filter(e => e.id !== exerciseId) }))
  };
  invalidateUpcomingSessions();
  persist();
}

export function addPlanExercise(workoutId, exercise) {
  if (!plan.value) return;
  plan.value = {
    ...plan.value,
    workouts: plan.value.workouts.map(w => (w.id !== workoutId ? w : { ...w, exercises: [...w.exercises, exercise] }))
  };
  invalidateUpcomingSessions();
  persist();
}

export function completedWorkoutCount() {
  return logs.value.length;
}

export function rotationIndex() {
  if (!plan.value || !plan.value.workouts.length) return 0;
  return completedWorkoutCount() % plan.value.workouts.length;
}

/** Returns (creating if needed) the live, adapted Workout instance for a given date. */
export function getOrCreateSession(date = todayISO()) {
  const existing = sessions.value[date];
  // A session with zero exercises is still a real session (e.g. an untouched
  // Custom Plan day, or one the user cleared out) — not a marker to regenerate.
  if (existing) return existing;
  if (!plan.value || !plan.value.workouts.length) return null;

  const idx = rotationIndex();
  const templateWorkout = plan.value.workouts[idx];
  const recovery = recoveryLogs.value[date];
  const instance = buildSessionInstance(templateWorkout, {
    profile: profile.value,
    ratings: ratings.value,
    recovery
  });
  sessions.value = { ...sessions.value, [date]: instance };
  persist();
  return instance;
}

function updateSession(date, updater) {
  const current = sessions.value[date];
  if (!current) return;
  const next = updater({ ...current, exercises: current.exercises.map(e => ({ ...e })) });
  sessions.value = { ...sessions.value, [date]: next };
  persist();
}

export function startWorkout(date = todayISO()) {
  updateSession(date, session => ({
    ...session,
    status: 'in_progress',
    startedAt: session.startedAt || new Date().toISOString()
  }));
}

export function logSet(date, exerciseId, setData) {
  updateSession(date, session => ({
    ...session,
    exercises: session.exercises.map(ex => ex.id === exerciseId
      ? { ...ex, loggedSets: [...ex.loggedSets, { setNumber: ex.loggedSets.length + 1, ...setData }] }
      : ex)
  }));
}

export function completeExercise(date, exerciseId, data) {
  updateSession(date, session => ({
    ...session,
    status: session.status === 'not_started' ? 'in_progress' : session.status,
    startedAt: session.startedAt || new Date().toISOString(),
    exercises: session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const rating = Number(data.rating) || ex.rating;
      ratings.value = { ...ratings.value, [ex.name]: rating };
      return { ...ex, done: true, rating, ...data };
    })
  }));
}

export function swapExercise(date, exerciseId, optionName) {
  updateSession(date, session => ({
    ...session,
    adjusted: true,
    exercises: session.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const option = ex.options.find(o => o.name === optionName);
      if (!option) return ex;
      return { ...ex, name: option.name, muscleGroup: option.muscleGroup, cue: option.cue, rating: ratings.value[option.name] || 3, changed: true };
    })
  }));
}

export function addExerciseToSession(date, exercise) {
  updateSession(date, session => ({ ...session, exercises: [...session.exercises, exercise] }));
}

export function removeExerciseFromSession(date, exerciseId) {
  updateSession(date, session => ({ ...session, exercises: session.exercises.filter(ex => ex.id !== exerciseId) }));
}

function updatePrsFromExercise(ex) {
  if (!ex.loggedSets || !ex.loggedSets.length) return;
  let totalVolume = 0, bestWeight = 0, bestEst1RM = 0;
  ex.loggedSets.forEach(s => {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    totalVolume += w * r;
    if (w > bestWeight) bestWeight = w;
    const est = Math.round(w * (1 + r / 30));
    if (est > bestEst1RM) bestEst1RM = est;
  });
  if (!bestWeight) return;
  const existing = prs.value[ex.name] || { name: ex.name, bestWeight: 0, bestVolume: 0, bestEst1RM: 0 };
  prs.value = {
    ...prs.value,
    [ex.name]: {
      name: ex.name,
      bestWeight: Math.max(existing.bestWeight, bestWeight),
      bestVolume: Math.max(existing.bestVolume, totalVolume),
      bestEst1RM: Math.max(existing.bestEst1RM, bestEst1RM)
    }
  };
}

export function finishWorkout(date = todayISO()) {
  const session = sessions.value[date];
  if (!session) return null;
  const startedAt = session.startedAt || new Date().toISOString();
  const endedAt = new Date().toISOString();
  const duration = Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000));

  session.exercises.filter(e => e.done).forEach(updatePrsFromExercise);

  const finishedSession = { ...session, status: 'completed', completed: true, completedAt: endedAt, startedAt, durationMinutes: duration };
  const summary = buildWorkoutSummary(finishedSession, duration);

  sessions.value = { ...sessions.value, [date]: finishedSession };
  logs.value = [...logs.value, summary];
  addCoachNote('Workout Complete', `${summary.title} finished in ${summary.duration} minutes. ${summary.nextTimeAdvice}`);
  persist();
  return summary;
}

/** Fast-path for logging a workout you already did without the full Train flow. */
export function quickLogWorkout(date = todayISO()) {
  const session = getOrCreateSession(date);
  if (!session) return null;
  const updated = {
    ...session,
    status: 'in_progress',
    startedAt: session.startedAt || new Date(Date.now() - (session.estimatedDuration || 45) * 60000).toISOString(),
    exercises: session.exercises.map(ex => ({
      ...ex,
      done: true,
      loggedSets: ex.loggedSets.length ? ex.loggedSets : Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1, weight: '', reps: String(ex.reps).match(/\d+/)?.[0] || '', rpe: ''
      }))
    }))
  };
  sessions.value = { ...sessions.value, [date]: updated };
  return finishWorkout(date);
}

export function adaptTodayFromReadiness(date = todayISO()) {
  const session = sessions.value[date] || getOrCreateSession(date);
  if (!session) return;
  const recovery = recoveryLogs.value[date];
  const adapted = applyAdaptation(session, { profile: profile.value, recovery });
  sessions.value = { ...sessions.value, [date]: adapted };
  addCoachNote('Plan Adjusted', adapted.notes, false);
  persist();
}

export function recentTrainingLoad(date = todayISO()) {
  const cutoff = parseDateKey(date);
  cutoff.setDate(cutoff.getDate() - 3);
  const upper = parseDateKey(date);
  return logs.value.filter(l => parseDateKey(l.date) >= cutoff && parseDateKey(l.date) <= upper).length;
}

export function saveRecoveryCheckIn(partial, date = todayISO()) {
  const scored = scoreReadiness(partial, recentTrainingLoad(date));
  const entry = freshRecoveryLog({ ...partial, date, readinessScore: scored.score, zone: scored.zone, recommendation: scored.recommendation });
  recoveryLogs.value = { ...recoveryLogs.value, [date]: entry };
  persist();
  adaptTodayFromReadiness(date);
  return entry;
}

export function logBodyMetrics(entries, date = todayISO()) {
  const created = entries.map(([metricType, value, unit, notes]) => freshMetric({ date, metricType, value: Number(value) || 0, unit, notes: notes || '' }));
  metrics.value = [...metrics.value, ...created.filter(m => m.value)];
  persist();
}

export function rateExercise(name, rating) {
  ratings.value = { ...ratings.value, [name]: Number(rating) };
  persist();
}

export function addCoachNote(title, body, doPersist = true) {
  coachNotes.value = [...coachNotes.value, { id: uid(), date: new Date().toISOString(), title, body }];
  if (doPersist) persist();
}

export function setCloudSettings(partial) {
  cloudSettings.value = { ...cloudSettings.value, ...partial };
  persist();
}

/** Exported backups never carry the cloud sync token — it grants write access to your cloud data and shouldn't travel in a file you might share. */
export function exportDataBlob() {
  const data = snapshot();
  data.cloudSettings = { ...data.cloudSettings, token: '' };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export function importDataFromObject(data) {
  hydrateFrom(data);
  persist();
}

export function resetAllData() {
  batch(() => {
    profile.value = freshProfile();
    plan.value = null;
    sessions.value = {};
    logs.value = [];
    recoveryLogs.value = {};
    metrics.value = [];
    ratings.value = {};
    prs.value = {};
    coachNotes.value = [];
  });
  persist();
}

// -------------------------------------------------------------- selectors --

export const streak = computed(() => {
  const dates = new Set(logs.value.map(l => l.date));
  let count = 0;
  let cursor = new Date();
  // allow "today" to be pending without breaking the streak
  if (!dates.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = dateKey(cursor);
    if (!dates.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
});

export const weeklyCompletion = computed(() => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(dateKey(d));
  }
  const completed = logs.value.filter(l => keys.includes(l.date)).length;
  const target = plan.value?.daysPerWeek || 5;
  return { completed, target, keys };
});
