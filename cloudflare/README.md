# FORGE Cloudflare Backend

This folder prepares FORGE for real cloud saving and future Claude integration without fake frontend buttons.

## Files

- `schema.sql` creates the D1 tables for FORGE snapshots and sync events.
- `worker.js` creates the Cloudflare Worker with protected sync endpoints.

## Required Cloudflare resources

1. Cloudflare D1 database
2. Cloudflare Worker
3. D1 binding named `FORGE_DB`
4. Worker secret named `FORGE_SYNC_TOKEN`

## D1 schema

Run the SQL in `schema.sql` against the D1 database.

Tables:

- `forge_snapshots`: stores the latest FORGE app data snapshot per owner
- `forge_sync_events`: stores save/load events for debugging and trust

## Worker endpoints

### Health check

`GET /health`

Returns whether the Worker is alive and whether the D1/token bindings exist.

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

## Security rules

- Never expose Anthropic or Claude API keys in frontend code.
- Do not put private API keys into `index.html`.
- The sync token must be set as a Cloudflare Worker secret.
- Claude should be added later through a protected Worker endpoint, not direct browser calls.

## Frontend status

The current frontend is still local first. Do not add a visible cloud sync button until the Worker is deployed and tested.
