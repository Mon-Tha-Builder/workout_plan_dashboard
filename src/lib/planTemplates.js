// Workout plan templates. Each template exposes buildWorkouts(profile) which
// returns an ordered rotation of "slot" Workouts — every exercise carries a
// full options[] list of equipment-aware alternatives. adaptiveEngine then
// turns a slot Workout into a live, personalized session instance.
import { freshWorkout, freshExercise } from './models.js';

function opt(name, muscleGroup, equipment, cue, flags = []) {
  return { name, muscleGroup, equipment, cue, flags };
}

function slot(name, muscleGroup, sets, reps, restSeconds, instructions, options, safetyNote = '') {
  return freshExercise({
    name: options[0].name,
    muscleGroup,
    equipment: options[0].equipment,
    sets, reps, restSeconds,
    instructions,
    safetyNote,
    cue: options[0].cue,
    options
  });
}

// ---------------------------------------------------------- shared pool --

const POOL = {
  mainPress: [
    opt('Barbell Bench Press', 'Push', ['barbellBench', 'bench'], 'Shoulder blades down and back'),
    opt('Dumbbell Bench Press', 'Push', ['dumbbells', 'bench'], 'Control the lowering'),
    opt('Machine Chest Press', 'Push', ['machines'], 'Stable, controlled press'),
    opt('Push Ups', 'Push', [], 'Clean full-body line')
  ],
  inclinePress: [
    opt('Incline Dumbbell Press', 'Push', ['dumbbells', 'bench'], 'Controlled tempo'),
    opt('Machine Chest Press', 'Push', ['machines'], 'Stable press'),
    opt('Dumbbell Bench Press', 'Push', ['dumbbells', 'bench'], 'Full range'),
    opt('Push Ups', 'Push', [], 'Clean reps')
  ],
  mainRow: [
    opt('Chest Supported Row', 'Pull', ['dumbbells', 'bench'], 'Neck relaxed', ['posture']),
    opt('Cable Row', 'Pull', ['cables'], 'No shrugging', ['posture']),
    opt('One Arm Dumbbell Row', 'Pull', ['dumbbells'], 'Elbow to hip'),
    opt('Machine Row', 'Pull', ['machines'], 'Controlled pull')
  ],
  verticalPull: [
    opt('Lat Pulldown', 'Pull', ['cables'], 'Elbows down'),
    opt('Assisted Pull Up', 'Pull', ['pullup'], 'Smooth reps'),
    opt('Band Pulldown', 'Pull', ['bands'], 'Pull to upper chest'),
    opt('Cable Pullover', 'Pull', ['cables'], 'Lats only')
  ],
  shoulders: [
    opt('Lateral Raise', 'Shoulders', ['dumbbells'], 'Do not shrug'),
    opt('Cable Lateral Raise', 'Shoulders', ['cables'], 'Constant tension'),
    opt('Rear Delt Fly', 'Shoulders', ['dumbbells'], 'Neck relaxed', ['posture']),
    opt('Face Pull', 'Shoulders', ['cables'], 'Rear delts and upper back', ['posture']),
    opt('Band Pull Apart', 'Shoulders', ['bands'], 'Ribs down')
  ],
  biceps: [
    opt('Dumbbell Curl', 'Arms', ['dumbbells'], 'No swinging'),
    opt('Hammer Curl', 'Arms', ['dumbbells'], 'Controlled tempo'),
    opt('Cable Curl', 'Arms', ['cables'], 'Smooth tension')
  ],
  triceps: [
    opt('Triceps Pressdown', 'Arms', ['cables'], 'Elbows pinned'),
    opt('Overhead Triceps Extension', 'Arms', ['dumbbells'], 'No shoulder pain'),
    opt('Close Grip Push Up', 'Arms', [], 'Strong lockout')
  ],
  core: [
    opt('Dead Bug', 'Core', [], 'Slow control'),
    opt('Pallof Press', 'Core', ['cables'], 'Do not rotate'),
    opt('Plank', 'Core', [], 'Ribs down'),
    opt('Side Plank', 'Core', [], 'Hips high')
  ],
  coreFinisher: [
    opt('Hanging Knee Raise', 'Core', ['pullup'], 'Control the swing'),
    opt('Cable Crunch', 'Core', ['cables'], 'Ribs down'),
    opt('Plank', 'Core', [], 'Hard brace')
  ],
  mainSquat: [
    opt('Barbell Squat', 'Legs', ['barbellSquat'], 'Braced trunk'),
    opt('Leg Press', 'Legs', ['legPress'], 'Full foot pressure'),
    opt('Goblet Squat', 'Legs', ['dumbbells'], 'Tall chest'),
    opt('Split Squat', 'Legs', ['dumbbells'], 'Slow and balanced')
  ],
  hinge: [
    opt('Barbell Romanian Deadlift', 'Legs', ['barbellSquat'], 'Flat back', ['backCaution']),
    opt('Dumbbell Romanian Deadlift', 'Legs', ['dumbbells'], 'Lats tight', ['backCaution']),
    opt('Hip Thrust', 'Legs', ['dumbbells', 'bench'], 'Full lockout'),
    opt('Cable Pull Through', 'Legs', ['cables'], 'Hinge without strain')
  ],
  singleLeg: [
    opt('Reverse Lunge', 'Legs', ['dumbbells'], 'Step back smooth'),
    opt('Step Up', 'Legs', ['dumbbells', 'bench'], 'Drive through the foot'),
    opt('Bulgarian Split Squat', 'Legs', ['dumbbells', 'bench'], 'Control the depth')
  ],
  hamstringSupport: [
    opt('Machine Leg Curl', 'Legs', ['machines'], 'Control the negative'),
    opt('Stability Ball Curl', 'Legs', [], 'Hips up'),
    opt('Dumbbell RDL', 'Legs', ['dumbbells'], 'Light hinge')
  ],
  carry: [
    opt('Farmer Carry', 'Core', ['dumbbells'], 'Tall posture', ['posture']),
    opt('Suitcase Carry', 'Core', ['dumbbells'], 'No leaning'),
    opt('Kettlebell Carry', 'Core', ['kettlebells'], 'Controlled walk')
  ],
  steadyCardio: [
    opt('Trail Walk', 'Cardio', [], 'Nasal breathing when possible'),
    opt('Incline Treadmill Walk', 'Cardio', ['treadmill'], 'Strong posture'),
    opt('Bike Zone 2', 'Cardio', ['bike'], 'Smooth breathing'),
    opt('Easy Jog', 'Cardio', [], 'Conversational pace')
  ],
  intervalCardio: [
    opt('Bike Intervals', 'Cardio', ['bike'], 'Controlled hard effort'),
    opt('Treadmill Intervals', 'Cardio', ['treadmill'], 'Do not sprint cold'),
    opt('Hill Walk Intervals', 'Cardio', [], 'Powerful walking pace')
  ],
  mobility: [
    opt('Thoracic Rotation Flow', 'Mobility', [], 'Open the upper back'),
    opt('Neck Trap Reset', 'Mobility', [], 'Gentle breathing'),
    opt('Hip Mobility Flow', 'Mobility', [], 'Smooth range of motion')
  ]
};

// -------------------------------------------------------------- helpers --

function workout(title, focus, estimatedDuration, slots) {
  return freshWorkout({ title, focus, estimatedDuration, exercises: slots });
}

// ------------------------------------------------------------ templates --

const TEMPLATES = {
  forge_hybrid: {
    id: 'forge_hybrid',
    name: 'FORGE Hybrid Frame Split',
    description: 'Balanced full-body strength, one hard leg day, one athletic leg day, and a dedicated conditioning/posture day. Built to add size and strength without shrinking you.',
    defaultDays: 5,
    assignedDays: [1, 2, 3, 4, 5],
    buildWorkouts: () => [
      workout('Upper Strength Frame', 'Balanced chest and back first. Posture friendly shoulders, arms, and core.', 55, [
        slot('Main Press', 'Push', 4, '5 to 8', 90, 'Build chest strength and upper frame width.', POOL.mainPress),
        slot('Main Row', 'Pull', 4, '6 to 10', 90, 'Build back thickness and posture.', POOL.mainRow),
        slot('Vertical Pull', 'Pull', 3, '8 to 12', 75, 'Back width and balance.', POOL.verticalPull),
        slot('Posture Shoulders', 'Shoulders', 3, '12 to 15', 60, 'Width and posture without trap overload.', POOL.shoulders),
        slot('Arms Finisher', 'Arms', 2, '10 to 12', 45, 'Arms matter, but not the whole workout.', POOL.biceps),
        slot('Core Posture Finisher', 'Core', 3, '8 to 12', 45, 'Core and posture support.', POOL.core)
      ]),
      workout('Lower Strength Core', 'One true hard leg day with core and posterior chain.', 55, [
        slot('Main Lower Strength', 'Legs', 4, '5 to 8', 90, 'Build leg strength.', POOL.mainSquat),
        slot('Hinge Strength', 'Legs', 4, '6 to 10', 90, 'Hamstrings and glutes.', POOL.hinge),
        slot('Single Leg Strength', 'Legs', 3, '8 each side', 75, 'Balance and athletic strength.', POOL.singleLeg),
        slot('Hamstring Support', 'Legs', 3, '10 to 12', 60, 'Protect the knees and build the legs.', POOL.hamstringSupport),
        slot('Loaded Carry', 'Core', 3, '30 to 45 sec', 60, 'Core, grip, and posture.', POOL.carry),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 45, 'Strong trunk.', POOL.core)
      ]),
      workout('Conditioning Breathing Posture', 'Cardio, breathing, core, mobility, and upper back posture without shrinking the frame.', 40, [
        slot('Breathing Cardio', 'Cardio', 1, '20 to 35 min', 0, 'Build the breathing engine.', POOL.steadyCardio),
        slot('Short Conditioning', 'Cardio', 6, '30 sec hard / 90 sec easy', 90, 'Conditioning touch, not punishment.', POOL.intervalCardio),
        slot('Core Control', 'Core', 3, '8 to 12', 45, 'Breathing and trunk control.', POOL.core),
        slot('Upper Back Posture', 'Pull', 3, '12 to 15', 45, 'Mid back and trap management.', POOL.shoulders),
        slot('Mobility Reset', 'Mobility', 1, '8 to 12 min', 0, 'Open upper back, hips, and breathing.', POOL.mobility)
      ]),
      workout('Upper Build Arms', 'Visible upper body size with chest, back, shoulders, and arms balanced.', 55, [
        slot('Chest Build', 'Push', 3, '8 to 12', 75, 'Chest volume.', POOL.inclinePress),
        slot('Back Build', 'Pull', 3, '8 to 12', 75, 'Back thickness and posture.', POOL.mainRow),
        slot('Width Movement', 'Pull', 3, '10 to 12', 60, 'Back width.', POOL.verticalPull),
        slot('Shoulder Width', 'Shoulders', 4, '12 to 15', 45, 'Shoulder shape without trap overload.', POOL.shoulders),
        slot('Biceps', 'Arms', 3, '10 to 12', 45, 'Arm growth.', POOL.biceps),
        slot('Triceps', 'Arms', 3, '10 to 12', 45, 'Arm growth.', POOL.triceps),
        slot('Core Finisher', 'Core', 2, '10 to 15', 45, 'Keep core serious.', POOL.coreFinisher)
      ]),
      workout('Lower Athletic Full Body', 'Lighter athletic legs, glutes, carries, core, conditioning, and mobility.', 45, [
        slot('Athletic Lower', 'Legs', 3, '8 to 12', 75, 'Leg work without crushing recovery.', POOL.singleLeg),
        slot('Glute Posterior Chain', 'Legs', 3, '8 to 12', 75, 'Glutes and hamstrings.', POOL.hinge),
        slot('Loaded Carry', 'Core', 3, '30 to 45 sec', 60, 'Posture, grip, core.', POOL.carry),
        slot('Core Stability', 'Core', 3, '8 to 12', 45, 'Core priority.', POOL.core),
        slot('Conditioning Finish', 'Cardio', 1, '8 to 15 min', 0, 'Athletic finish.', POOL.intervalCardio),
        slot('Mobility Finish', 'Mobility', 1, '8 to 10 min', 0, 'Recover and move better.', POOL.mobility)
      ])
    ]
  },

  push_pull_legs: {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    description: 'Classic 6-day (or 3-day rotating) split — press everything on push day, pull everything on pull day, all legs on leg day.',
    defaultDays: 6,
    assignedDays: [1, 2, 3, 4, 5, 6],
    buildWorkouts: () => [
      workout('Push Day', 'Chest, shoulders, and triceps.', 50, [
        slot('Main Press', 'Push', 4, '6 to 10', 90, 'Primary pressing strength.', POOL.mainPress),
        slot('Incline Press', 'Push', 3, '8 to 12', 75, 'Upper chest volume.', POOL.inclinePress),
        slot('Shoulder Width', 'Shoulders', 3, '12 to 15', 60, 'Shoulder shape.', POOL.shoulders),
        slot('Triceps', 'Arms', 3, '10 to 12', 45, 'Arm growth.', POOL.triceps),
        slot('Core Finisher', 'Core', 2, '10 to 15', 45, 'Core work.', POOL.coreFinisher)
      ]),
      workout('Pull Day', 'Back and biceps.', 50, [
        slot('Main Row', 'Pull', 4, '6 to 10', 90, 'Back thickness.', POOL.mainRow),
        slot('Vertical Pull', 'Pull', 3, '8 to 12', 75, 'Back width.', POOL.verticalPull),
        slot('Posture Shoulders', 'Shoulders', 3, '12 to 15', 60, 'Rear delts and posture.', POOL.shoulders),
        slot('Biceps', 'Arms', 3, '10 to 12', 45, 'Arm growth.', POOL.biceps),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 45, 'Trunk strength.', POOL.core)
      ]),
      workout('Legs Day', 'Quads, hamstrings, glutes, and core.', 55, [
        slot('Main Lower Strength', 'Legs', 4, '5 to 8', 90, 'Leg strength.', POOL.mainSquat),
        slot('Hinge Strength', 'Legs', 4, '6 to 10', 90, 'Hamstrings and glutes.', POOL.hinge),
        slot('Single Leg Strength', 'Legs', 3, '8 each side', 75, 'Balance and athleticism.', POOL.singleLeg),
        slot('Hamstring Support', 'Legs', 3, '10 to 12', 60, 'Knee-friendly leg work.', POOL.hamstringSupport),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 45, 'Trunk strength.', POOL.core)
      ])
    ]
  },

  upper_lower: {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description: '4-day split alternating upper and lower body for balanced strength and recovery.',
    defaultDays: 4,
    assignedDays: [1, 2, 4, 5],
    buildWorkouts: () => [
      workout('Upper A', 'Heavy press and row.', 50, [
        slot('Main Press', 'Push', 4, '5 to 8', 90, 'Pressing strength.', POOL.mainPress),
        slot('Main Row', 'Pull', 4, '6 to 10', 90, 'Pulling strength.', POOL.mainRow),
        slot('Shoulder Width', 'Shoulders', 3, '12 to 15', 60, 'Shoulder shape.', POOL.shoulders),
        slot('Arms Finisher', 'Arms', 2, '10 to 12', 45, 'Arm work.', POOL.biceps)
      ]),
      workout('Lower A', 'Squat pattern focus.', 50, [
        slot('Main Lower Strength', 'Legs', 4, '5 to 8', 90, 'Squat pattern strength.', POOL.mainSquat),
        slot('Hamstring Support', 'Legs', 3, '10 to 12', 60, 'Hamstring balance.', POOL.hamstringSupport),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 45, 'Trunk strength.', POOL.core)
      ]),
      workout('Upper B', 'Volume press and pull.', 50, [
        slot('Chest Build', 'Push', 3, '8 to 12', 75, 'Chest volume.', POOL.inclinePress),
        slot('Width Movement', 'Pull', 3, '10 to 12', 60, 'Back width.', POOL.verticalPull),
        slot('Posture Shoulders', 'Shoulders', 3, '12 to 15', 60, 'Posture support.', POOL.shoulders),
        slot('Triceps', 'Arms', 3, '10 to 12', 45, 'Arm work.', POOL.triceps)
      ]),
      workout('Lower B', 'Hinge pattern focus.', 50, [
        slot('Hinge Strength', 'Legs', 4, '6 to 10', 90, 'Hinge pattern strength.', POOL.hinge),
        slot('Single Leg Strength', 'Legs', 3, '8 each side', 75, 'Athletic balance.', POOL.singleLeg),
        slot('Core Posture Finisher', 'Core', 3, '8 to 12', 45, 'Core support.', POOL.core)
      ])
    ]
  },

  full_body: {
    id: 'full_body',
    name: 'Beginner Full Body',
    description: '3-day full body — every session hits the whole body with the highest value movements.',
    defaultDays: 3,
    assignedDays: [1, 3, 5],
    buildWorkouts: () => [1, 2, 3].map(n => workout(`Full Body ${n}`, 'Whole-body strength foundation.', 45, [
      slot('Main Press', 'Push', 3, '8 to 12', 75, 'Pressing strength.', POOL.mainPress),
      slot('Main Row', 'Pull', 3, '8 to 12', 75, 'Pulling strength.', POOL.mainRow),
      slot('Main Lower Strength', 'Legs', 3, '8 to 12', 90, 'Leg strength.', POOL.mainSquat),
      slot('Core Lock', 'Core', 3, '30 to 45 sec', 45, 'Trunk strength.', POOL.core)
    ]))
  },

  athletic_conditioning: {
    id: 'athletic_conditioning',
    name: 'Athletic Conditioning',
    description: 'Athleticism-first: carries, single-leg strength, conditioning intervals, and mobility.',
    defaultDays: 4,
    assignedDays: [1, 2, 4, 5],
    buildWorkouts: () => [
      workout('Athletic Strength', 'Single-leg strength and posterior chain.', 45, [
        slot('Single Leg Strength', 'Legs', 3, '8 each side', 75, 'Balance and strength.', POOL.singleLeg),
        slot('Hinge Strength', 'Legs', 3, '6 to 10', 90, 'Posterior chain power.', POOL.hinge),
        slot('Loaded Carry', 'Core', 3, '30 to 45 sec', 60, 'Grip and posture.', POOL.carry)
      ]),
      workout('Conditioning', 'Interval conditioning for engine and breathing.', 35, [
        slot('Short Conditioning', 'Cardio', 6, '30 sec hard / 90 sec easy', 90, 'Conditioning without punishment.', POOL.intervalCardio),
        slot('Core Control', 'Core', 3, '8 to 12', 45, 'Trunk control.', POOL.core)
      ]),
      workout('Upper Athletic', 'Upper body strength and posture.', 45, [
        slot('Main Press', 'Push', 3, '8 to 12', 75, 'Pressing strength.', POOL.mainPress),
        slot('Main Row', 'Pull', 3, '8 to 12', 75, 'Pulling strength.', POOL.mainRow),
        slot('Posture Shoulders', 'Shoulders', 3, '12 to 15', 60, 'Posture support.', POOL.shoulders)
      ]),
      workout('Steady Engine', 'Zone 2 conditioning and mobility.', 40, [
        slot('Breathing Cardio', 'Cardio', 1, '20 to 35 min', 0, 'Aerobic engine.', POOL.steadyCardio),
        slot('Mobility Reset', 'Mobility', 1, '8 to 12 min', 0, 'Recovery mobility.', POOL.mobility)
      ])
    ]
  },

  strength: {
    id: 'strength',
    name: 'Strength Block',
    description: 'Low-rep, high-load focus on the big compound patterns.',
    defaultDays: 4,
    assignedDays: [1, 2, 4, 5],
    buildWorkouts: () => [
      workout('Squat Strength', 'Heavy squat pattern.', 55, [
        slot('Main Lower Strength', 'Legs', 5, '3 to 5', 150, 'Max strength squat pattern.', POOL.mainSquat),
        slot('Hamstring Support', 'Legs', 3, '6 to 8', 90, 'Posterior support.', POOL.hamstringSupport),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 60, 'Trunk bracing.', POOL.core)
      ]),
      workout('Press Strength', 'Heavy press pattern.', 55, [
        slot('Main Press', 'Push', 5, '3 to 5', 150, 'Max strength press.', POOL.mainPress),
        slot('Shoulder Width', 'Shoulders', 3, '8 to 10', 75, 'Shoulder support.', POOL.shoulders),
        slot('Triceps', 'Arms', 3, '8 to 10', 60, 'Lockout strength.', POOL.triceps)
      ]),
      workout('Hinge Strength', 'Heavy hinge pattern.', 55, [
        slot('Hinge Strength', 'Legs', 5, '3 to 5', 150, 'Max strength hinge.', POOL.hinge),
        slot('Loaded Carry', 'Core', 3, '30 to 45 sec', 75, 'Grip and bracing.', POOL.carry),
        slot('Core Lock', 'Core', 3, '30 to 45 sec', 60, 'Trunk bracing.', POOL.core)
      ]),
      workout('Row Strength', 'Heavy pull pattern.', 55, [
        slot('Main Row', 'Pull', 5, '3 to 5', 150, 'Max strength row.', POOL.mainRow),
        slot('Vertical Pull', 'Pull', 3, '6 to 8', 90, 'Back width strength.', POOL.verticalPull),
        slot('Biceps', 'Arms', 3, '8 to 10', 60, 'Arm support strength.', POOL.biceps)
      ])
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom Plan',
    description: 'Start empty and build your own days in the Plan builder.',
    defaultDays: 3,
    assignedDays: [1, 3, 5],
    buildWorkouts: () => [workout('Day 1', 'Build this workout in the Plan tab.', 45, [])]
  }
};

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.forge_hybrid;
}

export function listTemplates() {
  return Object.values(TEMPLATES);
}

export { POOL as exerciseSlotPool, opt, slot };
