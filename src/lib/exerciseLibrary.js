// Exercise reference library for the Library page. Independent of the plan
// templates' slot pools (which are optimized for the adaptive engine) — this
// is the browsable, searchable reference with real instructional detail.
export const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Conditioning', 'Mobility'];

export const EXERCISE_LIBRARY = [
  { name: 'Barbell Bench Press', category: 'Chest', equipment: ['barbellBench', 'bench'], instructions: 'Lie on a flat bench, grip just outside shoulder width, lower the bar to mid-chest, and press to lockout.', safetyNote: 'Keep shoulder blades pinned down and back; use a spotter for heavy sets.' },
  { name: 'Dumbbell Bench Press', category: 'Chest', equipment: ['dumbbells', 'bench'], instructions: 'Press two dumbbells from chest level to full extension, controlling the lowering phase.', safetyNote: 'Do not flare elbows past 75 degrees from the torso.' },
  { name: 'Incline Dumbbell Press', category: 'Chest', equipment: ['dumbbells', 'bench'], instructions: 'On a 30-45 degree incline bench, press dumbbells up and slightly inward.', safetyNote: 'Avoid a steep incline — it shifts load to the front delts and off the chest.' },
  { name: 'Machine Chest Press', category: 'Chest', equipment: ['machines'], instructions: 'Set seat height so handles align with mid-chest, press forward to extension.', safetyNote: 'Stable and joint-friendly — a good option when shoulders are cranky.' },
  { name: 'Push Ups', category: 'Chest', equipment: [], instructions: 'Hands under shoulders, lower chest to just above the floor, press back up in a straight line.', safetyNote: 'Keep the hips level — do not let the lower back sag.' },
  { name: 'Chest Supported Row', category: 'Back', equipment: ['dumbbells', 'bench'], instructions: 'Chest on an incline bench, row dumbbells up toward the hips, squeezing the shoulder blades.', safetyNote: 'Let the chest support you — do not shrug the traps to move the weight.' },
  { name: 'Cable Row', category: 'Back', equipment: ['cables'], instructions: 'Seated, pull the handle to the torso while keeping the chest tall.', safetyNote: 'Avoid excessive lean-back — control the movement with the back, not momentum.' },
  { name: 'One Arm Dumbbell Row', category: 'Back', equipment: ['dumbbells'], instructions: 'Support one knee/hand on a bench, row the dumbbell to the hip.', safetyNote: 'Keep the elbow tracking toward the hip, not flared wide.' },
  { name: 'Machine Row', category: 'Back', equipment: ['machines'], instructions: 'Chest against the pad, pull the handles toward the torso.', safetyNote: 'A stable, low-injury-risk way to build back thickness.' },
  { name: 'Lat Pulldown', category: 'Back', equipment: ['cables'], instructions: 'Pull the bar down to the upper chest, elbows driving down and back.', safetyNote: 'Avoid pulling behind the neck — it stresses the shoulder joint.' },
  { name: 'Assisted Pull Up', category: 'Back', equipment: ['pullup'], instructions: 'Pull the chin above the bar with smooth, controlled reps.', safetyNote: 'Use assistance rather than sacrificing form with kipping.' },
  { name: 'Barbell Squat', category: 'Legs', equipment: ['barbellSquat'], instructions: 'Bar on the upper back, squat to at least parallel, drive up through the whole foot.', safetyNote: 'Keep the trunk braced; use safety pins or a spotter on heavy sets.' },
  { name: 'Leg Press', category: 'Legs', equipment: ['legPress'], instructions: 'Feet shoulder width on the platform, lower under control, press through the full foot.', safetyNote: 'Do not let the lower back round off the pad at the bottom.' },
  { name: 'Goblet Squat', category: 'Legs', equipment: ['dumbbells'], instructions: 'Hold a dumbbell at chest height, squat between the knees, chest tall.', safetyNote: 'A safe entry point for learning squat mechanics.' },
  { name: 'Barbell Romanian Deadlift', category: 'Legs', equipment: ['barbellSquat'], instructions: 'Hinge at the hips with a flat back, bar close to the legs, feel the hamstring stretch.', safetyNote: 'Stop the descent once the back would start to round.' },
  { name: 'Hip Thrust', category: 'Legs', equipment: ['dumbbells', 'bench'], instructions: 'Upper back on a bench, drive the hips up to full lockout, squeeze the glutes.', safetyNote: 'Tuck the chin and avoid hyperextending the lower back at the top.' },
  { name: 'Reverse Lunge', category: 'Legs', equipment: ['dumbbells'], instructions: 'Step back into a lunge, front knee tracking over the foot, drive back up.', safetyNote: 'Control the step back — do not let the knee slam down.' },
  { name: 'Bulgarian Split Squat', category: 'Legs', equipment: ['dumbbells', 'bench'], instructions: 'Rear foot elevated on a bench, lower the front leg under control.', safetyNote: 'Balance takes practice — hold something stable early on.' },
  { name: 'Machine Leg Curl', category: 'Legs', equipment: ['machines'], instructions: 'Curl the pad toward the glutes, control the negative on the way back.', safetyNote: 'Avoid yanking the weight with momentum.' },
  { name: 'Calf Raise', category: 'Legs', equipment: ['dumbbells'], instructions: 'Rise onto the toes, pause at the top, lower fully under control.', safetyNote: 'Full range of motion matters more than heavy weight here.' },
  { name: 'Lateral Raise', category: 'Shoulders', equipment: ['dumbbells'], instructions: 'Raise dumbbells out to the sides to shoulder height.', safetyNote: 'Keep the traps relaxed — this is a shoulder isolation move, not a shrug.' },
  { name: 'Rear Delt Fly', category: 'Shoulders', equipment: ['dumbbells'], instructions: 'Hinge forward slightly, raise dumbbells out to the sides squeezing the rear delts.', safetyNote: 'Great for posture — keep the neck relaxed throughout.' },
  { name: 'Face Pull', category: 'Shoulders', equipment: ['cables'], instructions: 'Pull a rope attachment toward the face, elbows high, squeezing the upper back.', safetyNote: 'One of the best posture and shoulder-health movements available.' },
  { name: 'Band Pull Apart', category: 'Shoulders', equipment: ['bands'], instructions: 'Hold a band at chest height, pull it apart by driving the shoulder blades together.', safetyNote: 'Low load, high value for shoulder health and posture.' },
  { name: 'Dumbbell Curl', category: 'Arms', equipment: ['dumbbells'], instructions: 'Curl the dumbbells up while keeping the elbows pinned to the sides.', safetyNote: 'Avoid swinging the torso to move the weight.' },
  { name: 'Hammer Curl', category: 'Arms', equipment: ['dumbbells'], instructions: 'Curl with a neutral grip (palms facing in) for forearm and bicep work.', safetyNote: 'Controlled tempo builds more than momentum.' },
  { name: 'Triceps Pressdown', category: 'Arms', equipment: ['cables'], instructions: 'Press the cable attachment down to full elbow extension, elbows pinned.', safetyNote: 'Keep the upper arm still — only the forearm should move.' },
  { name: 'Overhead Triceps Extension', category: 'Arms', equipment: ['dumbbells'], instructions: 'Lower a dumbbell behind the head, extend back to full lockout.', safetyNote: 'Stop immediately if this causes shoulder pain — swap to pressdowns.' },
  { name: 'Dead Bug', category: 'Core', equipment: [], instructions: 'Lying on the back, extend opposite arm and leg while keeping the low back flat.', safetyNote: 'Move slowly and exhale fully — speed defeats the purpose.' },
  { name: 'Plank', category: 'Core', equipment: [], instructions: 'Hold a straight line from shoulders to ankles, bracing the core.', safetyNote: 'Keep the ribs down — do not let the lower back sag.' },
  { name: 'Pallof Press', category: 'Core', equipment: ['cables'], instructions: 'Press a cable straight out from the chest while resisting rotation.', safetyNote: 'The goal is to NOT rotate — that resistance is the whole point.' },
  { name: 'Farmer Carry', category: 'Core', equipment: ['dumbbells'], instructions: 'Carry a heavy dumbbell or kettlebell in each hand, walking tall.', safetyNote: 'Keep the shoulders back — do not let the weight pull you into a lean.' },
  { name: 'Hanging Knee Raise', category: 'Core', equipment: ['pullup'], instructions: 'Hang from a bar and raise the knees toward the chest under control.', safetyNote: 'Avoid swinging — control the descent as much as the raise.' },
  { name: 'Trail Walk', category: 'Conditioning', equipment: [], instructions: 'Sustained walk at a conversational pace, nasal breathing when possible.', safetyNote: 'Great low-impact aerobic base builder.' },
  { name: 'Incline Treadmill Walk', category: 'Conditioning', equipment: ['treadmill'], instructions: 'Walk at an incline with strong upright posture.', safetyNote: 'Hold the rails only if balance is a concern, not to offload effort.' },
  { name: 'Bike Zone 2', category: 'Conditioning', equipment: ['bike'], instructions: 'Steady-state cycling at a pace where breathing stays smooth and conversational.', safetyNote: 'This should feel easy — if breathing is labored, slow down.' },
  { name: 'Bike Intervals', category: 'Conditioning', equipment: ['bike'], instructions: 'Alternate hard effort intervals with easy recovery periods.', safetyNote: 'Warm up first — do not sprint cold.' },
  { name: 'Rowing Machine', category: 'Conditioning', equipment: ['machines'], instructions: 'Drive with the legs first, then lean back and pull the handle to the ribs.', safetyNote: 'Sequence matters: legs, hips, arms — then reverse on the way back.' },
  { name: 'Thoracic Rotation Flow', category: 'Mobility', equipment: [], instructions: 'From a quadruped position, rotate one arm up and open the chest toward the ceiling.', safetyNote: 'Move slowly and breathe — this is a mobility drill, not a stretch to force.' },
  { name: 'Neck Trap Reset', category: 'Mobility', equipment: [], instructions: 'Gentle neck circles and trap rolls paired with slow breathing.', safetyNote: 'Never force a stretch into pain — ease into range gradually.' },
  { name: 'Hip Mobility Flow', category: 'Mobility', equipment: [], instructions: 'A sequence of hip openers (90/90s, world\'s greatest stretch) moving through full range.', safetyNote: 'Prioritize smooth control over how deep the stretch goes.' },
  { name: 'Cat Cow', category: 'Mobility', equipment: [], instructions: 'On hands and knees, alternate arching and rounding the spine with the breath.', safetyNote: 'A gentle spinal warm-up — good before or after any session.' }
];

export function searchLibrary({ query = '', category = 'All', equipment = null }) {
  const q = query.trim().toLowerCase();
  return EXERCISE_LIBRARY.filter(ex => {
    if (category !== 'All' && ex.category !== category) return false;
    if (q && !ex.name.toLowerCase().includes(q)) return false;
    if (equipment && ex.equipment.length && !ex.equipment.every(k => equipment[k])) return false;
    return true;
  });
}
