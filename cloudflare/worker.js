// FORGE Personal Fitness OS Cloudflare Worker
// Bindings required:
// FORGE_DB: Cloudflare D1 database
// FORGE_SYNC_TOKEN: secret token used by the frontend/backend sync client
//
// Endpoints:
// GET  /health
// GET  /sync/load?owner=OWNER_ID
// POST /sync/save

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-forge-sync-token'
};

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
  const id = crypto.randomUUID();
  await env.FORGE_DB.prepare(
    'INSERT INTO forge_sync_events (id, owner_id, event_type, created_at, device_id, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, ownerId, eventType, nowIso(), deviceId, note).run();
}

async function handleHealth(env) {
  const dbReady = Boolean(env.FORGE_DB);
  const tokenReady = Boolean(env.FORGE_SYNC_TOKEN);
  return json({ ok: true, service: 'FORGE sync worker', dbReady, tokenReady });
}

async function handleLoad(request, env) {
  if (!requireToken(request, env)) return unauthorized();

  const url = new URL(request.url);
  const ownerId = url.searchParams.get('owner');
  if (!ownerId) return json({ ok: false, error: 'Missing owner parameter' }, 400);

  const row = await env.FORGE_DB.prepare(
    'SELECT owner_id, payload, payload_version, updated_at, device_id, checksum FROM forge_snapshots WHERE owner_id = ?'
  ).bind(ownerId).first();

  if (!row) return json({ ok: true, found: false, snapshot: null });

  await logEvent(env, ownerId, 'load', row.device_id || '', 'Snapshot loaded');
  return json({ ok: true, found: true, snapshot: row });
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders });

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health' && request.method === 'GET') return handleHealth(env);
      if (url.pathname === '/sync/load' && request.method === 'GET') return handleLoad(request, env);
      if (url.pathname === '/sync/save' && request.method === 'POST') return handleSave(request, env);
      return json({ ok: false, error: 'Not found' }, 404);
    } catch (error) {
      return json({ ok: false, error: 'Server error', detail: error.message }, 500);
    }
  }
};
