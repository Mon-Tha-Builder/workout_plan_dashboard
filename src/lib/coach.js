// AI coach client. Talks to the existing Cloudflare Worker /ai/coach route —
// no API keys in the frontend, no fake responses. Every structured change
// Claude proposes is whitelisted and clamped here before it can touch app
// state; nothing from the model writes to the store directly.
import { workerFetch, cloudConfigured } from './workerClient.js';
import { cloudSettings, swapExercise, updateSessionExercise, addCoachNote } from './store.js';
import { todayISO } from './models.js';

export { cloudConfigured };

export async function askCoach(mode, userRequest, context) {
  const data = await workerFetch('/ai/coach', {
    method: 'POST',
    body: JSON.stringify({
      ownerId: cloudSettings.value.ownerId,
      deviceId: cloudSettings.value.deviceId,
      mode,
      request: userRequest,
      context,
      maxTokens: 900
    })
  });
  return data.response || '';
}

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

const ALLOWED_ACTIONS = ['adjust_sets', 'adjust_reps', 'adjust_rest', 'swap_exercise', 'note'];

/** Whitelists and clamps a raw Claude response into a safe, applyable proposal. */
export function validateProposal(rawText, session) {
  const parsed = extractJson(rawText);
  if (!parsed || typeof parsed !== 'object') throw new Error('Claude did not return a valid structured update.');

  const summary = String(parsed.summary || '').slice(0, 500);
  const rawChanges = Array.isArray(parsed.changes) ? parsed.changes : [];
  const changes = [];

  rawChanges.forEach(c => {
    if (!c || typeof c !== 'object') return;
    const exercise = session.exercises.find(e => e.name === c.exerciseName);
    if (!exercise) return;
    if (!ALLOWED_ACTIONS.includes(c.action)) return;

    const safe = { exerciseId: exercise.id, exerciseName: exercise.name, action: c.action, note: String(c.note || '').slice(0, 240) };
    if (c.action === 'adjust_sets') safe.sets = Math.max(1, Math.min(5, Number(c.sets) || exercise.sets));
    if (c.action === 'adjust_reps') safe.reps = String(c.reps || exercise.reps).slice(0, 40);
    if (c.action === 'adjust_rest') safe.restSeconds = Math.max(0, Math.min(300, Number(c.restSeconds) || exercise.restSeconds));
    if (c.action === 'swap_exercise') {
      const replacement = exercise.options.find(o => o.name === c.replacementName);
      if (!replacement) return;
      safe.replacementName = replacement.name;
    }
    changes.push(safe);
  });

  return { summary, changes };
}

/** Applies a validated proposal to today's live session. Requires explicit user approval before calling. */
export function applyProposal(date, proposal) {
  proposal.changes.forEach(c => {
    if (c.action === 'swap_exercise') swapExercise(date, c.exerciseId, c.replacementName);
    if (c.action === 'adjust_sets') updateSessionExercise(date, c.exerciseId, { sets: c.sets });
    if (c.action === 'adjust_reps') updateSessionExercise(date, c.exerciseId, { reps: c.reps });
    if (c.action === 'adjust_rest') updateSessionExercise(date, c.exerciseId, { restSeconds: c.restSeconds });
    if (c.action === 'note') updateSessionExercise(date, c.exerciseId, { notes: c.note });
  });
  addCoachNote('AI Coach Update Applied', proposal.summary);
}

export function buildCoachContext({ session, recovery, ratings, profile, lastSummary }) {
  return {
    today: todayISO(),
    readiness: recovery || null,
    currentSession: session || null,
    ratings,
    goal: profile.goal,
    lastSummary: lastSummary || null,
    instructions: { preferSpecificActions: true, preserveSplit: true, protectPosture: true, avoidFatLossBias: true }
  };
}
