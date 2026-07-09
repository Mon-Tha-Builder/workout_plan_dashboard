// FORGE data model. Plain JS objects, documented with JSDoc so editors get
// type hints without a TypeScript build step. Every "fresh*" factory returns
// a complete, safe-default object — nothing in the app should ever read an
// undefined field off one of these shapes.

/**
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {'muscle'|'strength'|'athleticism'|'consistency'|'health'} goal
 * @property {'beginner'|'intermediate'|'advanced'} experienceLevel
 * @property {Record<string, boolean>} equipment
 * @property {number[]} preferredDays - weekday indices, 0=Sun..6=Sat
 * @property {number} preferredWorkoutDuration - minutes
 * @property {'lb'|'kg'} unitPreference
 * @property {string} limitations
 * @property {'strict'|'calm'|'hype'|'technical'} motivationStyle
 * @property {boolean} onboarded
 */

/**
 * @typedef {Object} ExerciseOption
 * @property {string} name
 * @property {string} muscleGroup
 * @property {string[]} equipment
 * @property {string} cue
 * @property {string[]} [flags]
 */

/**
 * @typedef {Object} Exercise
 * @property {string} id
 * @property {string} name
 * @property {string} muscleGroup
 * @property {string[]} equipment
 * @property {string} instructions
 * @property {string} safetyNote
 * @property {number} sets
 * @property {string} reps
 * @property {string} weight
 * @property {number} restSeconds
 * @property {string} notes
 * @property {string} cue
 * @property {ExerciseOption[]} options - approved swap alternatives for this slot
 * @property {boolean} done
 * @property {Array<{setNumber:number, weight:string, reps:string, rpe:string}>} loggedSets
 * @property {number} rating
 * @property {boolean} changed - true once this slot has been swapped away from its original pick
 */

/**
 * @typedef {Object} Workout
 * @property {string} id
 * @property {string} title
 * @property {string} focus
 * @property {number} estimatedDuration - minutes
 * @property {Exercise[]} exercises
 * @property {string|null} scheduledDate - YYYY-MM-DD
 * @property {boolean} completed
 * @property {string|null} completedAt
 * @property {string} notes
 * @property {'not_started'|'in_progress'|'completed'|'adjusted'} status
 * @property {string|null} startedAt
 * @property {boolean} adjusted
 */

/**
 * @typedef {Object} WorkoutPlan
 * @property {string} id
 * @property {string} name
 * @property {string} goal
 * @property {number} daysPerWeek
 * @property {string} startDate
 * @property {number} durationWeeks
 * @property {Workout[]} workouts - the rotation template, in order
 * @property {number[]} assignedDays - weekday indices this rotation targets
 * @property {string} templateId
 */

/**
 * @typedef {Object} WorkoutLog
 * @property {string} id
 * @property {string} workoutId
 * @property {string} date
 * @property {Array<{exerciseId:string, exerciseName:string, setsCompleted:number, totalReps:number, weight:string, rpe:string, rating:number, notes:string}>} completedExercises
 * @property {number} totalVolume
 * @property {number} duration - minutes
 * @property {string} notes
 * @property {number} perceivedEffort
 * @property {string} title
 * @property {number} targetMinutes
 * @property {string} pace
 * @property {string} nextTimeAdvice
 */

/**
 * @typedef {Object} RecoveryLog
 * @property {string} id
 * @property {string} date
 * @property {number} sleepQuality
 * @property {number} soreness
 * @property {number} energy
 * @property {number} stress
 * @property {number} timeAvailable
 * @property {string} pain
 * @property {number} readinessScore
 * @property {'green'|'yellow'|'red'} zone
 * @property {string} recommendation
 */

/**
 * @typedef {Object} ProgressMetric
 * @property {string} id
 * @property {string} date
 * @property {'weight'|'waist'|'chest'|'arms'|'shoulders'|'thighs'|'bodyfat'} metricType
 * @property {number} value
 * @property {string} unit
 * @property {string} notes
 */

export const EQUIPMENT_DEFS = [
  ['dumbbells', 'Dumbbells'],
  ['bench', 'Adjustable bench'],
  ['cables', 'Cable machine'],
  ['machines', 'Basic machines'],
  ['treadmill', 'Treadmill'],
  ['bike', 'Bike or elliptical'],
  ['legPress', 'Leg press'],
  ['pullup', 'Pull up bar'],
  ['bands', 'Resistance bands'],
  ['kettlebells', 'Kettlebells'],
  ['barbellBench', 'Barbell bench access'],
  ['barbellSquat', 'Barbell squat access']
];

export const DEFAULT_EQUIPMENT = {
  dumbbells: true, bench: true, cables: true, machines: true,
  treadmill: true, bike: true, legPress: false, pullup: false,
  bands: true, kettlebells: false, barbellBench: false, barbellSquat: false
};

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/** Formats a Date as a local-timezone YYYY-MM-DD key (not UTC — avoids the day flipping early/late for non-UTC users). */
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses a YYYY-MM-DD key back into a local-midnight Date (avoids new Date(str) parsing it as UTC). */
export function parseDateKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return dateKey(new Date());
}

/** @returns {UserProfile} */
export function freshProfile() {
  return {
    name: '',
    goal: 'consistency',
    experienceLevel: 'intermediate',
    equipment: { ...DEFAULT_EQUIPMENT },
    preferredDays: [1, 2, 3, 4, 5],
    preferredWorkoutDuration: 45,
    unitPreference: 'lb',
    limitations: '',
    motivationStyle: 'calm',
    onboarded: false
  };
}

/** @returns {Exercise} */
export function freshExercise(partial = {}) {
  return {
    id: uid(),
    name: '',
    muscleGroup: '',
    equipment: [],
    instructions: '',
    safetyNote: '',
    sets: 3,
    reps: '8 to 12',
    weight: '',
    restSeconds: 60,
    notes: '',
    cue: '',
    options: [],
    done: false,
    loggedSets: [],
    rating: 3,
    changed: false,
    ...partial
  };
}

/** @returns {Workout} */
export function freshWorkout(partial = {}) {
  return {
    id: uid(),
    title: 'Workout',
    focus: '',
    estimatedDuration: 45,
    exercises: [],
    scheduledDate: null,
    completed: false,
    completedAt: null,
    notes: '',
    status: 'not_started',
    startedAt: null,
    adjusted: false,
    ...partial
  };
}

/** @returns {WorkoutPlan} */
export function freshPlan(partial = {}) {
  return {
    id: uid(),
    name: 'FORGE Hybrid Frame Split',
    goal: 'consistency',
    daysPerWeek: 5,
    startDate: todayISO(),
    durationWeeks: 12,
    workouts: [],
    assignedDays: [1, 2, 3, 4, 5],
    templateId: 'forge_hybrid',
    ...partial
  };
}

/** @returns {RecoveryLog} */
export function freshRecoveryLog(partial = {}) {
  return {
    id: uid(),
    date: todayISO(),
    sleepQuality: 5,
    soreness: 5,
    energy: 5,
    stress: 5,
    timeAvailable: 45,
    pain: '',
    readinessScore: 0,
    zone: 'yellow',
    recommendation: '',
    ...partial
  };
}

/** @returns {WorkoutLog} */
export function freshWorkoutLog(partial = {}) {
  return {
    id: uid(),
    workoutId: '',
    date: todayISO(),
    completedExercises: [],
    totalVolume: 0,
    duration: 0,
    notes: '',
    perceivedEffort: 0,
    title: '',
    targetMinutes: 45,
    pace: 'on pace',
    nextTimeAdvice: '',
    ...partial
  };
}

/** @returns {ProgressMetric} */
export function freshMetric(partial = {}) {
  return {
    id: uid(),
    date: todayISO(),
    metricType: 'weight',
    value: 0,
    unit: 'lb',
    notes: '',
    ...partial
  };
}
