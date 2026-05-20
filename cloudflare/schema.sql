-- FORGE Personal Fitness OS Cloudflare D1 schema
-- Purpose: store one private encrypted-style JSON snapshot per owner/device flow.
-- This keeps the app simple and prevents frontend API keys or fake sync.

CREATE TABLE IF NOT EXISTS forge_snapshots (
  owner_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  payload_version TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT,
  checksum TEXT
);

CREATE TABLE IF NOT EXISTS forge_sync_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  device_id TEXT,
  note TEXT,
  FOREIGN KEY (owner_id) REFERENCES forge_snapshots(owner_id)
);

CREATE INDEX IF NOT EXISTS idx_forge_sync_events_owner_created
ON forge_sync_events(owner_id, created_at);
