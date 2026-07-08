// Deterministic, rule-based adaptive coach. No network calls, no fake AI —
// this is the same equipment-aware, readiness-aware selection logic FORGE
// has always used, ported cleanly into one module instead of being spread
// across four monkey-patched "phase" files.
import { freshWorkout, freshExercise, freshWorkoutLog, uid } from './models.js';

function isAvailable(option, equipment) {
  return (option.equipment || []).every(key => equipment[key]);
}

function ratingFor(name, ratings) {
  return Number(ratings[name]) || 3;
}

function painText(recovery) {
  return String(recovery?.pain || '').trim().toLowerCase();
}

/** Picks the best available exercise for a slot given equipment, ratings, and pain notes. */
export function chooseOption(slotExercise, { equipment, ratings, recovery }) {
  const pain = painText(recovery);
  const scored = slotExercise.options.map((option, index) => {
    let score = 100 - index * 4;
    if (!isAvailable(option, equipment)) score -= 80;
    score += (ratingFor(option.name, ratings) - 3) * 8;
    const flags = option.flags || [];
    if ((pain.includes('neck') || pain.includes('trap') || pain.includes('mid back')) && flags.includes('posture')) score += 16;
    if ((pain.includes('back') || pain.includes('mid back')) && flags.includes('backCaution')) score -= 35;
    if (pain.includes('shoulder') && (option.muscleGroup === 'Push' || option.muscleGroup === 'Shoulders')) score -= 12;
    if (pain.includes('knee') && option.muscleGroup === 'Legs') score -= 10;
    return { option, score };
  }).sort((a, b) => b.score - a.score);

  if (scored[0].score < 25) {
    return slotExercise.options.find(o => (o.equipment || []).length === 0) || slotExercise.options[0];
  }
  return scored[0].option;
}

/** Session length target in minutes, from time available + readiness. */
export function targetMinutes({ profile, recovery }) {
  const time = Number(recovery?.timeAvailable) || 0;
  const score = Number(recovery?.readinessScore) || 0;
  if (time && time <= 35) return 30;
  if (time && time <= 50) return 45;
  if (score >= 82 && (!time || time >= 60)) return 60;
  if (score && score < 50) return 30;
  return profile?.preferredWorkoutDuration || 45;
}

/** Turns a plan template Workout (slots with options) into a live, personalized session. */
export function buildSessionInstance(templateWorkout, { profile, ratings = {}, recovery }) {
  const equipment = profile?.equipment || {};
  let chosenExercises = templateWorkout.exercises.map(slotEx => {
    const chosen = chooseOption(slotEx, { equipment, ratings, recovery });
    return freshExercise({
      name: chosen.name,
      muscleGroup: chosen.muscleGroup,
      equipment: chosen.equipment,
      cue: chosen.cue,
      sets: slotEx.sets,
      reps: slotEx.reps,
      restSeconds: slotEx.restSeconds,
      instructions: slotEx.instructions,
      safetyNote: slotEx.safetyNote,
      options: slotEx.options,
      rating: ratingFor(chosen.name, ratings)
    });
  });

  const target = targetMinutes({ profile, recovery });
  if (target <= 30 && chosenExercises.length > 4) {
    chosenExercises = chosenExercises.slice(0, 4);
  }

  return freshWorkout({
    title: templateWorkout.title,
    focus: templateWorkout.focus,
    estimatedDuration: target,
    exercises: chosenExercises,
    notes: `Loaded from ${templateWorkout.title}.`,
    status: 'not_started'
  });
}

/** Builds a light recovery replacement session: walk, mobility, light core. */
export function buildRecoverySession() {
  return freshWorkout({
    title: 'Recovery Reset',
    focus: 'Recovery, posture, breathing',
    estimatedDuration: 30,
    notes: 'Recovery replacement created by FORGE Coach.',
    adjusted: true,
    exercises: [
      freshExercise({ name: 'Easy Walk', muscleGroup: 'Cardio', sets: 1, reps: '15 to 25 min', restSeconds: 0, cue: 'Nasal breathing pace', instructions: 'Keep the pace conversational.', options: [{ name: 'Easy Walk', muscleGroup: 'Cardio', equipment: [], cue: 'Nasal breathing pace' }] }),
      freshExercise({ name: 'Thoracic Rotation Flow', muscleGroup: 'Mobility', sets: 1, reps: '8 min', restSeconds: 0, cue: 'Move slow and breathe', instructions: 'Mid back and breathing reset.', options: [{ name: 'Thoracic Rotation Flow', muscleGroup: 'Mobility', equipment: [], cue: 'Slow rotation' }] }),
      freshExercise({ name: 'Dead Bug', muscleGroup: 'Core', sets: 2, reps: '8 each side', restSeconds: 45, cue: 'Slow exhales', instructions: 'Core without added fatigue.', options: [{ name: 'Dead Bug', muscleGroup: 'Core', equipment: [], cue: 'Slow exhales' }] })
    ]
  });
}

/** Re-adapts an in-progress/unstarted session to today's readiness. */
export function applyAdaptation(session, { profile, recovery }) {
  if (!recovery) return session;
  const pain = painText(recovery);
  let next = { ...session, exercises: session.exercises.map(e => ({ ...e })) };
  let decision = recovery.recommendation || '';

  if (recovery.zone === 'red') {
    const rec = buildRecoverySession();
    next = { ...rec, id: session.id };
    decision = recovery.recommendation;
  } else if (recovery.zone === 'yellow') {
    next.exercises = next.exercises.map(e => (e.sets > 1 ? { ...e, sets: e.sets - 1 } : e));
    decision += ' FORGE reduced one set from most exercises to protect recovery.';
  }

  const time = Number(recovery.timeAvailable) || 0;
  if (recovery.zone !== 'red' && time && time < 35 && next.exercises.length > 4) {
    next.exercises = next.exercises.slice(0, 4);
    decision += ' Time is short, so FORGE kept only the highest value work.';
  }

  if (pain.includes('neck') || pain.includes('trap') || pain.includes('mid back')) {
    decision += ' Mid back / neck / trap note detected: posture-friendly rows, rear delts, and relaxed neck cues get priority.';
  }
  if (pain.includes('shoulder')) decision += ' Shoulder note detected: pressing is kept pain free and stable.';
  if (pain.includes('knee')) decision += ' Knee note detected: lower body work is more controlled.';

  next.adjusted = true;
  next.status = 'adjusted';
  next.notes = decision;
  return next;
}

/** Deterministic starter plan for onboarding — no AI call, fully rule based. */
export function generateStarterPlan(template, profile) {
  return template.buildWorkouts(profile);
}

/** Builds the post-workout completion summary from a finished session. */
export function buildWorkoutSummary(session, durationMinutes) {
  const completed = session.exercises.filter(e => e.done);
  const skipped = session.exercises.filter(e => !e.done);
  const low = completed.filter(e => e.rating <= 2);
  const painNoted = completed.filter(e => (e.notes || '').toLowerCase().includes('pain'));
  const highEffort = completed.filter(e => (e.loggedSets || []).some(s => Number(s.rpe) >= 9));

  let bestLift = null;
  let bestWeight = 0;
  let totalVolume = 0;
  const completedExercises = completed.map(e => {
    const sets = e.loggedSets || [];
    let exVolume = 0, exBestWeight = 0, lastRpe = '';
    sets.forEach(s => {
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      exVolume += w * r;
      if (w > exBestWeight) exBestWeight = w;
      if (s.rpe) lastRpe = s.rpe;
    });
    totalVolume += exVolume;
    if (exBestWeight > bestWeight) { bestWeight = exBestWeight; bestLift = e.name; }
    return {
      exerciseId: e.id,
      exerciseName: e.name,
      setsCompleted: sets.length,
      totalReps: sets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0),
      weight: exBestWeight ? String(exBestWeight) : '',
      rpe: lastRpe,
      rating: e.rating,
      notes: e.notes || ''
    };
  });

  let nextTimeAdvice = 'Next time: repeat the session structure, keep clean form, and try to beat one lift by a small amount.';
  if (painNoted.length) {
    nextTimeAdvice = `Next time: protect pain areas first. Swap or reduce ${painNoted.map(e => e.name).join(', ')}.`;
  } else if (highEffort.length) {
    nextTimeAdvice = 'Next time: keep the weight steady on high-effort lifts and earn cleaner reps before adding load.';
  } else if (low.length) {
    nextTimeAdvice = `Next time: consider alternatives for low-rated exercises: ${low.map(e => e.name).join(', ')}.`;
  } else if (bestLift) {
    nextTimeAdvice = `Next time: progress carefully on ${bestLift} if form stayed clean.`;
  }

  const targetMinutesVal = session.estimatedDuration || 45;
  const pace = durationMinutes <= targetMinutesVal + 10 ? 'on pace' : 'over target';

  return freshWorkoutLog({
    workoutId: session.id,
    completedExercises,
    totalVolume: Math.round(totalVolume),
    duration: durationMinutes,
    title: session.title,
    targetMinutes: targetMinutesVal,
    pace,
    nextTimeAdvice
  });
}

export { uid };
