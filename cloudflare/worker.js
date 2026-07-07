// FORGE Personal Fitness OS Cloudflare Worker
//
// Bindings required:
// FORGE_DB: Cloudflare D1 database
// FORGE_SYNC_TOKEN: secret token used by the frontend/backend sync client
// ANTHROPIC_API_KEY: secret Anthropic API key for Claude coach calls
//
// Optional vars:
// ANTHROPIC_MODEL: defaults to claude-sonnet-5
//
// Endpoints:
// GET  /health
// GET  /sync/load?owner=OWNER_ID
// POST /sync/save
// POST /ai/coach

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-forge-sync-token'
};

const FORGE_SYSTEM_PROMPT = `You are the FORGE Personal Fitness OS AI Coach.

Primary user goal:
Build a stronger frame, look stronger, improve posture, and improve cardio and breathing without becoming smaller or turning the program into a fat loss plan.

Locked split:
1. Upper Strength Frame
2. Lower Strength Core
3. Conditioning Breathing Posture
4. Upper Build Arms
5. Lower Athletic Full Body

Rules:
- Do not randomly replace the program. Adjust the current split intelligently.
- Keep the main goal intact: stronger frame, stronger look, better posture, better cardio, and better breathing.
- Do not turn the plan into a weight loss or high calorie burn program.
- Keep upper body balanced. Chest, back, shoulders, and arms all matter.
- Protect posture. Mid back and neck/trap issues should reduce trap dominant work and increase posture friendly rows, rear delts, face pulls, thoracic mobility, and breathing work.
- Keep core as a serious priority across the week.
- Keep legs at one hard lower body day and one lighter athletic lower body day.
- Use cardio to build the breathing engine, not to shrink the user.
- Use readiness, soreness, pain, time available, equipment, completed sessions, exercise ratings, and performance logs before changing a workout.
- If recovery is low, reduce sets, lower intensity, or move to recovery work instead of forcing the original plan.
- If time is short, keep the highest value exercises and cut accessories first.
- If equipment is unavailable, swap the movement pattern, not the entire goal of the day.
- If the user rates an exercise poorly, suggest alternatives that train the same pattern.
- If the user loves an exercise but it causes pain, pain wins and the exercise must be swapped or reduced.
- Do not diagnose injuries. Recommend safer swaps, reduced load, mobility, and professional help if pain persists or worsens.

Output style:
- Be direct and practical.
- Give a clear recommendation.
- Explain what changed and why.
- Do not include medical diagnosis.
- When asked for JSON, return only valid JSON.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function unauthorized() {
  return json({ ok: false, error: 'Unauthorized' }, 401);
}

function requireToken(request, env) {
  const headerToken = request.headers.get('x-forge-sync-token');
  const auth = request.headers.get('authorization') || '';
  const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const supplied = headerToken || bearerToken;
  return Boolean(env.FORGE_SYNC_TOKEN && supplied && supplied === env.FORGE_SYNC_TOKEN);
}

function nowIso() {
  return new Date().toISOString();
}

async function logEvent(env, ownerId, eventType, deviceId = '', note = '') {
  if (!env.FORGE_DB || !ownerId) return;
  const id = crypto.randomUUID();
  await env.FORGE_DB.prepare(
    'INSERT INTO forge_sync_events (id, owner_id, event_type, created_at, device_id, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, ownerId, eventType, nowIso(), deviceId, note).run();
}

async function handleHealth(env) {
  return json({
    ok: true,
    service: 'FORGE sync and AI worker',
    dbReady: Boolean(env.FORGE_DB),
    syncTokenReady: Boolean(env.FORGE_SYNC_TOKEN),
    anthropicReady: Boolean(env.ANTHROPIC_API_KEY),
    model: env.ANTHROPIC_MODEL || 'claude-sonnet-5'
  });
}

async function getSnapshot(env, ownerId) {
  if (!env.FORGE_DB || !ownerId) return null;
  const row = await env.FORGE_DB.prepare(
    'SELECT owner_id, payload, payload_version, updated_at, device_id, checksum FROM forge_snapshots WHERE owner_id = ?'
  ).bind(ownerId).first();

  if (!row) return null;

  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(row.payload);
  } catch (error) {
    parsedPayload = null;
  }

  return { ...row, parsedPayload };
}

async function handleLoad(request, env) {
  if (!requireToken(request, env)) return unauthorized();

  const url = new URL(request.url);
  const ownerId = url.searchParams.get('owner');
  if (!ownerId) return json({ ok: false, error: 'Missing owner parameter' }, 400);

  const snapshot = await getSnapshot(env, ownerId);
  if (!snapshot) return json({ ok: true, found: false, snapshot: null });

  await logEvent(env, ownerId, 'load', snapshot.device_id || '', 'Snapshot loaded');
  return json({ ok: true, found: true, snapshot });
}

async function handleSave(request, env) {
  if (!requireToken(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const ownerId = body.ownerId;
  const payload = body.payload;
  const payloadVersion = body.payloadVersion || 'unknown';
  const deviceId = body.deviceId || '';
  const checksum = body.checksum || '';

  if (!ownerId) return json({ ok: false, error: 'Missing ownerId' }, 400);
  if (!payload || typeof payload !== 'object') return json({ ok: false, error: 'Missing payload object' }, 400);

  const payloadText = JSON.stringify(payload);
  const updatedAt = nowIso();

  await env.FORGE_DB.prepare(
    `INSERT INTO forge_snapshots (owner_id, payload, payload_version, updated_at, device_id, checksum)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(owner_id) DO UPDATE SET
       payload = excluded.payload,
       payload_version = excluded.payload_version,
       updated_at = excluded.updated_at,
       device_id = excluded.device_id,
       checksum = excluded.checksum`
  ).bind(ownerId, payloadText, payloadVersion, updatedAt, deviceId, checksum).run();

  await logEvent(env, ownerId, 'save', deviceId, 'Snapshot saved');
  return json({ ok: true, ownerId, updatedAt });
}

function buildCoachUserPrompt(body, snapshot) {
  const mode = body.mode || 'coach';
  const request = body.request || body.message || 'Review the current FORGE state and give the best next recommendation.';
  const context = body.context || {};
  const snapshotPayload = snapshot?.parsedPayload || null;

  return JSON.stringify({
    mode,
    request,
    context,
    snapshot: snapshotPayload,
    instructions: {
      preferSpecificActions: true,
      preserveSplit: true,
      protectPosture: true,
      avoidFatLossBias: true
    }
  });
}

function extractClaudeText(data) {
  if (!data || !Array.isArray(data.content)) return '';
  return data.content
    .filter(part => part && part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n')
    .trim();
}

async function handleCoach(request, env) {
  if (!requireToken(request, env)) return unauthorized();
  if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: 'Missing ANTHROPIC_API_KEY secret' }, 500);

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const ownerId = body.ownerId || '';
  const deviceId = body.deviceId || '';
  const snapshot = ownerId ? await getSnapshot(env, ownerId) : null;
  const model = body.model || env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const maxTokens = Math.min(Math.max(Number(body.maxTokens || 900), 200), 2000);

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: FORGE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildCoachUserPrompt(body, snapshot)
        }
      ]
    })
  });

  const data = await anthropicResponse.json().catch(() => null);

  if (!anthropicResponse.ok) {
    return json({ ok: false, error: 'Anthropic request failed', status: anthropicResponse.status, detail: data }, 502);
  }

  const text = extractClaudeText(data);
  await logEvent(env, ownerId || 'anonymous', 'ai_coach', deviceId, `Coach call mode: ${body.mode || 'coach'}`);

  return json({
    ok: true,
    model,
    response: text,
    raw: body.includeRaw ? data : undefined
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders });

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health' && request.method === 'GET') return handleHealth(env);
      if (url.pathname === '/sync/load' && request.method === 'GET') return handleLoad(request, env);
      if (url.pathname === '/sync/save' && request.method === 'POST') return handleSave(request, env);
      if (url.pathname === '/ai/coach' && request.method === 'POST') return handleCoach(request, env);
      return json({ ok: false, error: 'Not found' }, 404);
    } catch (error) {
      return json({ ok: false, error: 'Server error', detail: error.message }, 500);
    }
  }
};
