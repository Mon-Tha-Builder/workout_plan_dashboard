// Thin client for the FORGE Cloudflare Worker (cloudflare/worker.js). No API
// keys ever live here — only the user-supplied sync token, which the Worker
// itself validates. Talks to the *existing* Worker endpoints unchanged.
import { cloudSettings } from './store.js';

function cleanUrl() {
  return String(cloudSettings.value.workerUrl || '').trim().replace(/\/+$/, '');
}

export function cloudConfigured() {
  return Boolean(cleanUrl() && cloudSettings.value.ownerId && cloudSettings.value.token);
}

export async function workerFetch(path, options = {}) {
  if (!cloudConfigured()) {
    throw new Error('Cloud sync is not set up yet. Add a Worker URL, Owner ID, and Sync Token in Settings.');
  }
  const headers = {
    'content-type': 'application/json',
    'x-forge-sync-token': cloudSettings.value.token,
    ...(options.headers || {})
  };
  const res = await fetch(cleanUrl() + path, { ...options, headers });
  const data = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON response from Worker.' }));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Worker error ${res.status}`);
  return data;
}

export async function checkWorkerHealth() {
  const url = cleanUrl();
  if (!url) throw new Error('Enter a Worker URL first.');
  const res = await fetch(url + '/health');
  if (!res.ok) throw new Error(`Worker responded with ${res.status}`);
  return res.json();
}
