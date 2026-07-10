# FORGE Cloudflare Backend

This folder prepares FORGE for real cloud saving and real Claude coaching without fake frontend buttons.

## Files

- `schema.sql` creates the D1 tables for FORGE snapshots and sync events.
- `worker.js` creates the Cloudflare Worker with protected sync and AI endpoints.
- `wrangler.toml.example` shows the Worker, D1 binding, and secret setup shape.

## Required Cloudflare resources

1. Cloudflare D1 database
2. Cloudflare Worker
3. D1 binding named `FORGE_DB`
4. Worker secret named `FORGE_SYNC_TOKEN`
5. Worker secret named `ANTHROPIC_API_KEY`
6. Optional Worker variable named `ANTHROPIC_MODEL`

Default model in the Worker is `claude-sonnet-5`.

## Correct order

Do this in order:

1. Create D1 database
2. Run `schema.sql`
3. Deploy Worker
4. Add `FORGE_DB` binding
5. Add `FORGE_SYNC_TOKEN` secret
6. Test `/health`
7. Test `/sync/save`
8. Test `/sync/load`
9. Add `ANTHROPIC_API_KEY` secret
10. Test `/ai/coach`
11. Only after those pass, connect the frontend UI

## D1 schema

Run the SQL in `schema.sql` against the D1 database.

Tables:

- `forge_snapshots`: stores the latest FORGE app data snapshot per owner
- `forge_sync_events`: stores save/load/AI events for debugging and trust

## Worker endpoints

### Health check

`GET /health`

Returns whether the Worker is alive and whether D1, sync token, and Anthropic bindings exist.

Expected shape:

```json
{
  "ok": true,
  "service": "FORGE sync and AI worker",
  "dbReady": true,
  "syncTokenReady": true,
  "anthropicReady": true,
  "model": "claude-sonnet-5"
}
```

### Load snapshot

`GET /sync/load?owner=OWNER_ID`

Requires one of these headers:

- `x-forge-sync-token: YOUR_TOKEN`
- `Authorization: Bearer YOUR_TOKEN`

### Save snapshot

`POST /sync/save`

Requires token header and JSON body:

```json
{
  "ownerId": "private-owner-id",
  "payloadVersion": "6.0.0",
  "deviceId": "iphone-or-desktop",
  "checksum": "optional-checksum",
  "payload": {
    "version": "6.0.0",
    "profile": {},
    "sessions": {},
    "ratings": {}
  }
}
```

### Claude coach

`POST /ai/coach`

Requires token header and JSON body:

```json
{
  "ownerId": "private-owner-id",
  "deviceId": "iphone",
  "mode": "today_review",
  "request": "Review today's workout and give the best next recommendation.",
  "context": {
    "readiness": "low",
    "pain": "neck/traps",
    "timeAvailable": 30
  },
  "maxTokens": 900
}
```

The Worker loads the latest saved snapshot from D1 when `ownerId` is provided, then sends the snapshot plus the request to Claude using the FORGE system prompt.

## Test with curl

Replace the Worker URL and token values.

### Health

```bash
curl https://YOUR_WORKER_URL/health
```

### Save

```bash
curl -X POST https://YOUR_WORKER_URL/sync/save \
  -H "content-type: application/json" \
  -H "x-forge-sync-token: YOUR_TOKEN" \
  -d '{
    "ownerId":"monny-forge",
    "payloadVersion":"6.0.0",
    "deviceId":"test-device",
    "payload":{"version":"6.0.0","test":true}
  }'
```

### Load

```bash
curl https://YOUR_WORKER_URL/sync/load?owner=monny-forge \
  -H "x-forge-sync-token: YOUR_TOKEN"
```

### Claude coach

```bash
curl -X POST https://YOUR_WORKER_URL/ai/coach \
  -H "content-type: application/json" \
  -H "x-forge-sync-token: YOUR_TOKEN" \
  -d '{
    "ownerId":"monny-forge",
    "deviceId":"test-device",
    "mode":"today_review",
    "request":"Give me the best next recommendation based on my FORGE state.",
    "context":{"pain":"neck/traps","timeAvailable":30}
  }'
```

## Security rules

- Never expose Anthropic or Claude API keys in frontend code.
- Do not put private API keys into `index.html`.
- The sync token must be set as a Cloudflare Worker secret.
- The Anthropic API key must be set as a Cloudflare Worker secret.
- Claude calls must go through the Worker, not direct browser calls.
- Do not add a visible frontend AI button until `/ai/coach` is tested.

## Frontend status

The Worker is deployed and tested (https://forge-fitness-worker.jamonm221.workers.dev/, see `/health`). The frontend (https://workout-plan-dashboard.pages.dev/) remains local first — cloud sync and Claude coaching stay off until a device's Owner ID and Sync Token are entered in Settings, and sync is always explicit push/pull, never a silent background overwrite.