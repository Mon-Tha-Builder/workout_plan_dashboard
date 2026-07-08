import { describe, it, expect } from 'vitest';
import { chooseOption, targetMinutes, buildSessionInstance, buildWorkoutSummary } from './adaptiveEngine.js';
import { freshWorkout, freshExercise } from './models.js';

function slot(options) {
  return { options };
}

describe('chooseOption', () => {
  it('avoids equipment the user does not have', () => {
    const chosen = chooseOption(slot([
      { name: 'Barbell Squat', muscleGroup: 'Legs', equipment: ['barbellSquat'], cue: '' },
      { name: 'Goblet Squat', muscleGroup: 'Legs', equipment: ['dumbbells'], cue: '' }
    ]), { equipment: { dumbbells: true, barbellSquat: false }, ratings: {}, recovery: undefined });
    expect(chosen.name).toBe('Goblet Squat');
  });

  it('lets a strong personal rating outweigh default ordering', () => {
    const chosen = chooseOption(slot([
      { name: 'A', muscleGroup: 'Push', equipment: [], cue: '' },
      { name: 'B', muscleGroup: 'Push', equipment: [], cue: '' }
    ]), { equipment: {}, ratings: { A: 2, B: 5 }, recovery: undefined });
    expect(chosen.name).toBe('B');
  });

  it('prioritizes posture-flagged options when neck/trap/mid-back pain is reported', () => {
    const chosen = chooseOption(slot([
      { name: 'Barbell Row', muscleGroup: 'Pull', equipment: [], cue: '', flags: [] },
      { name: 'Face Pull', muscleGroup: 'Pull', equipment: [], cue: '', flags: ['posture'] }
    ]), { equipment: {}, ratings: {}, recovery: { pain: 'neck tension' } });
    expect(chosen.name).toBe('Face Pull');
  });

  it('penalizes backCaution-flagged options when back pain is reported', () => {
    const chosen = chooseOption(slot([
      { name: 'Barbell RDL', muscleGroup: 'Legs', equipment: [], cue: '', flags: ['backCaution'] },
      { name: 'Leg Curl', muscleGroup: 'Legs', equipment: [], cue: '', flags: [] }
    ]), { equipment: {}, ratings: {}, recovery: { pain: 'lower back tightness' } });
    expect(chosen.name).toBe('Leg Curl');
  });

  it('falls back to the first listed option (not the raw top score) when every option scores below the confidence floor', () => {
    // Both require equipment the user lacks, and pain plus a strong rating push
    // the equipment-less-but-still-unavailable "B" to the nominal top score —
    // but since it's still under 25, and there's no equipment-free option to
    // prefer, the engine should fall back to the first option rather than
    // silently trusting a near-zero-confidence pick.
    const chosen = chooseOption(slot([
      { name: 'A', muscleGroup: 'Legs', equipment: ['barbellSquat'], cue: '' },
      { name: 'B', muscleGroup: 'Legs', equipment: ['barbellSquat'], cue: '', flags: [] }
    ]), { equipment: {}, ratings: { B: 5 }, recovery: { pain: 'knee soreness' } });
    expect(chosen.name).toBe('A');
  });
});

describe('targetMinutes', () => {
  it('caps to 30 when time available is 35 or less', () => {
    expect(targetMinutes({ profile: {}, recovery: { timeAvailable: 30 } })).toBe(30);
  });
  it('caps to 45 when time available is 50 or less', () => {
    expect(targetMinutes({ profile: {}, recovery: { timeAvailable: 40 } })).toBe(45);
  });
  it('allows 60 on high readiness with plenty of time', () => {
    expect(targetMinutes({ profile: {}, recovery: { timeAvailable: 70, readinessScore: 85 } })).toBe(60);
  });
  it('drops to 30 when readiness score is low', () => {
    expect(targetMinutes({ profile: {}, recovery: { readinessScore: 40 } })).toBe(30);
  });
  it('falls back to the profile duration preference with no recovery data', () => {
    expect(targetMinutes({ profile: { preferredWorkoutDuration: 45 }, recovery: undefined })).toBe(45);
  });
});

describe('buildSessionInstance', () => {
  const template = freshWorkout({
    title: 'Test Day',
    focus: 'Testing',
    exercises: Array.from({ length: 6 }, (_, i) => slot([
      { name: `Exercise ${i}`, muscleGroup: 'Legs', equipment: [], cue: '' }
    ]))
  });

  it('keeps the full exercise list when time is not constrained', () => {
    const session = buildSessionInstance(template, { profile: { equipment: {}, preferredWorkoutDuration: 60 }, ratings: {}, recovery: { timeAvailable: 60, readinessScore: 85 } });
    expect(session.exercises.length).toBe(6);
  });

  it('truncates to the 4 highest-value exercises when time is short', () => {
    const session = buildSessionInstance(template, { profile: { equipment: {}, preferredWorkoutDuration: 60 }, ratings: {}, recovery: { timeAvailable: 30 } });
    expect(session.exercises.length).toBe(4);
    expect(session.estimatedDuration).toBe(30);
  });

  it('gives every exercise a fresh id and clean logging state', () => {
    const session = buildSessionInstance(template, { profile: { equipment: {}, preferredWorkoutDuration: 45 }, ratings: {}, recovery: undefined });
    session.exercises.forEach(ex => {
      expect(ex.done).toBe(false);
      expect(ex.loggedSets).toEqual([]);
      expect(ex.id).toBeTruthy();
    });
  });
});

describe('buildWorkoutSummary', () => {
  function session(exercises, estimatedDuration = 45) {
    return freshWorkout({ id: 's1', title: 'Test Day', estimatedDuration, exercises });
  }

  it('computes total volume and best-weight from logged sets of completed exercises only', () => {
    const s = session([
      freshExercise({ id: 'e1', name: 'Bench', done: true, rating: 4, loggedSets: [
        { setNumber: 1, weight: '100', reps: '8', rpe: '7' },
        { setNumber: 2, weight: '105', reps: '6', rpe: '8' }
      ] }),
      freshExercise({ id: 'e2', name: 'Curl', done: false, rating: 3, loggedSets: [] })
    ]);
    const summary = buildWorkoutSummary(s, 40);
    expect(summary.completedExercises.length).toBe(1);
    expect(summary.completedExercises[0].weight).toBe('105');
    expect(summary.totalVolume).toBe(100 * 8 + 105 * 6);
    expect(summary.pace).toBe('on pace');
  });

  it('flags a session as over target once duration exceeds target + 10', () => {
    const s = session([freshExercise({ id: 'e1', name: 'Bench', done: true, loggedSets: [{ setNumber: 1, weight: '100', reps: '8', rpe: '7' }] })], 45);
    const summary = buildWorkoutSummary(s, 60);
    expect(summary.pace).toBe('over target');
  });

  it('prioritizes pain-aware advice over generic progression advice', () => {
    const s = session([
      freshExercise({ id: 'e1', name: 'Overhead Press', done: true, rating: 4, notes: 'shoulder pain today', loggedSets: [{ setNumber: 1, weight: '50', reps: '8', rpe: '9' }] })
    ]);
    const summary = buildWorkoutSummary(s, 40);
    expect(summary.nextTimeAdvice).toMatch(/protect pain areas/i);
    expect(summary.nextTimeAdvice).toMatch(/Overhead Press/);
  });

  it('suggests progression on the best lift when nothing went wrong', () => {
    const s = session([
      freshExercise({ id: 'e1', name: 'Bench', done: true, rating: 4, loggedSets: [{ setNumber: 1, weight: '100', reps: '8', rpe: '7' }] })
    ]);
    const summary = buildWorkoutSummary(s, 40);
    expect(summary.nextTimeAdvice).toMatch(/progress carefully on Bench/i);
  });
});
