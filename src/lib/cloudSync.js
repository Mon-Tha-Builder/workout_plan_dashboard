// Manual, explicit cloud sync — deliberately NOT an automatic background
// reconciler. The old app's auto-sync heuristic (forge_phase7) could
// silently score a real local dataset as "empty" and overwrite it with an
// inferior cloud copy; rather than port that risk forward, sync here only
// ever runs when the user presses a button, and pull always requires
// explicit confirmation before it replaces local data.
import { cloudSettings, setCloudSettings, getSnapshot, importDataFromObject } from './store.js';
import { workerFetch, cloudConfigured, checkWorkerHealth } from './workerClient.js';

export { cloudConfigured, checkWorkerHealth };

export async function pushToCloud() {
  const payload = getSnapshot();
  const data = await workerFetch('/sync/save', {
    method: 'POST',
    body: JSON.stringify({
      ownerId: cloudSettings.value.ownerId,
      deviceId: cloudSettings.value.deviceId,
      payloadVersion: payload.version,
      payload
    })
  });
  setCloudSettings({ lastSync: data.updatedAt || new Date().toISOString(), lastStatus: 'Pushed to cloud successfully.' });
  return data;
}

/** Fetches the cloud snapshot without applying it — caller decides whether to import. */
export async function fetchCloudSnapshot() {
  const data = await workerFetch(`/sync/load?owner=${encodeURIComponent(cloudSettings.value.ownerId)}`, { method: 'GET' });
  if (!data.found || !data.snapshot) return null;
  const payload = data.snapshot.parsedPayload || JSON.parse(data.snapshot.payload);
  return { payload, updatedAt: data.snapshot.updated_at };
}

/** Applies a previously-fetched cloud snapshot to local state. Caller must confirm with the user first. */
export function applyCloudSnapshot(payload, updatedAt) {
  importDataFromObject(payload);
  setCloudSettings({ lastSync: updatedAt || new Date().toISOString(), lastStatus: 'Loaded from cloud.' });
}
