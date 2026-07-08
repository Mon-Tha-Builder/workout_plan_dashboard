// Recovery / readiness scoring. Deliberately simple and visible — this is a
// practical training-readiness heuristic, not a medical assessment. Inputs
// are all 1-10 scales except `pain` (free text) and `timeAvailable` (minutes).
//
// score = 50
//       + sleepQuality * 3        (better sleep -> higher score)
//       + energy * 3              (more energy -> higher score)
//       - soreness * 2.5          (more soreness -> lower score)
//       - stress * 2              (more stress -> lower score)
//       - recentLoad penalty      (heavy training in the last 3 days -> lower score)
//       - 15 if pain is reported
// clamped to 0-100, then bucketed into a green/yellow/red training zone.

export function scoreReadiness(input, recentLoad = 0) {
  const sleepQuality = clamp10(input.sleepQuality ?? input.sleep);
  const energy = clamp10(input.energy);
  const soreness = clamp10(input.soreness ?? input.sore);
  const stress = clamp10(input.stress);
  const pain = String(input.pain || '').trim().toLowerCase();
  const timeAvailable = Number(input.timeAvailable ?? input.time) || 0;

  let score = 50 + sleepQuality * 3 + energy * 3 - soreness * 2.5 - stress * 2;
  score -= Math.min(3, recentLoad) * 4;
  if (pain && pain !== 'none') score -= 15;
  if (timeAvailable && timeAvailable < 30) score -= 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let zone, status, recommendation;
  if (score >= 65) {
    zone = 'green';
    status = 'Ready To Train';
    recommendation = 'Recovery looks solid. Train the plan as written — push progress where form stays clean.';
  } else if (score >= 35) {
    zone = 'yellow';
    status = 'Train, Reduce Intensity';
    recommendation = 'Keep the movement pattern but reduce sets or cap effort. Do not chase a personal record today.';
  } else {
    zone = 'red';
    status = 'Rest Or Light Work Only';
    recommendation = 'Recovery is low. Take a rest day, or replace training with walking, mobility, and breathing work.';
  }

  if (pain && pain !== 'none') {
    recommendation += ` Pain noted (${input.pain}): FORGE will bias exercise selection away from that area — this is not medical advice, see a professional if it persists.`;
  }

  return { score, zone, status, recommendation };
}

function clamp10(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, n));
}

export const ZONE_LABEL = { green: 'Green', yellow: 'Yellow', red: 'Red' };
export const ZONE_PILL_CLASS = { green: 'good', yellow: 'warn', red: 'bad' };
