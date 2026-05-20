// FORGE Phase 7: ATLAS style cross device sync
// Goal: mobile and desktop stay on the same cloud snapshot instead of drifting apart.

(() => {
  const PHASE_KEY = 'forgeFitnessCrossDeviceSync.v1';
  const SYNC_LOCK_KEY = 'forgeFitnessCrossDeviceSync.lock';
  const STARTUP_DELAY_MS = 1400;
  const FOCUS_SYNC_COOLDOWN_MS = 60 * 1000;
  const CONFLICT_WINDOW_MS = 90 * 1000;

  let syncState = loadState();
  let running = false;
  let lastFocusSync = 0;

  function loadState() {
    try {
      return {
        lastAutoSync: null,
        lastPulledAt: null,
        lastPushedAt: null,
        lastCloudUpdatedAt: null,
        lastDeviceAction: null,
        lastError: null,
        autoSyncEnabled: true,
        ...JSON.parse(localStorage.getItem(PHASE_KEY) || '{}')
      };
    } catch (error) {
      return {
        lastAutoSync: null,
        lastPulledAt: null,
        lastPushedAt: null,
        lastCloudUpdatedAt: null,
        lastDeviceAction: null,
        lastError: null,
        autoSyncEnabled: true
      };
    }
  }

  function saveState() {
    localStorage.setItem(PHASE_KEY, JSON.stringify(syncState));
  }

  function label(value) {
    if (!value) return 'Not yet';
    try {
      return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (error) {
      return 'Unknown';
    }
  }

  function getMs(value) {
    const parsed = value ? Date.parse(value) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function localUpdatedAt() {
    if (typeof db !== 'undefined' && db && db.lastSaved) return db.lastSaved;
    return null;
  }

  function cloudConfigured() {
    try {
      return typeof cloudReady === 'function' && cloudReady();
    } catch (error) {
      return false;
    }
  }

  function setCloudStatus(message) {
    const box = document.getElementById('cloudStatus');
    if (box) box.textContent = message;
  }

  function fail(message) {
    syncState.lastError = `${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ${message}`;
    saveState();
    renderPanel();
  }

  function clearFail() {
    syncState.lastError = null;
    saveState();
  }

  function ensurePanel() {
    const cloudCard = document.getElementById('cloudWorkerUrl')?.closest('.card');
    if (!cloudCard) return null;

    let panel = document.getElementById('phase7SyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'phase7SyncPanel';
      panel.className = 'item';
      const phase5 = document.getElementById('phase5SyncPanel');
      if (phase5) phase5.insertAdjacentElement('afterend', panel);
      else cloudCard.appendChild(panel);
    }
    return panel;
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;

    const connected = cloudConfigured();
    const device = typeof cloud !== 'undefined' && cloud.deviceId ? cloud.deviceId : 'this device';
    const owner = typeof cloud !== 'undefined' && cloud.ownerId ? cloud.ownerId : 'not set';
    const error = syncState.lastError ? `<p class="muted">Last sync issue: ${escapeHtml(syncState.lastError)}</p>` : '';

    panel.innerHTML = `
      <div class="top">
        <strong>ATLAS style cross device sync</strong>
        <span class="pill ${connected ? 'good' : 'warn'}">${connected ? 'Ready' : 'Needs token'}</span>
      </div>
      <p class="muted">Owner: ${escapeHtml(owner)} • Device: ${escapeHtml(device)}</p>
      <p class="muted">Auto sync: ${syncState.autoSyncEnabled ? 'On' : 'Off'} • Last auto sync: ${label(syncState.lastAutoSync)} • Pulled: ${label(syncState.lastPulledAt)} • Pushed: ${label(syncState.lastPushedAt)}</p>
      <p class="small">FORGE now checks cloud on startup and when you return to the app. If cloud is newer, this device pulls it. If this device is newer, it pushes it.</p>
      ${error}
      <div class="btns">
        <button class="btn primary" id="phase7SyncNow">Sync This Device Now</button>
        <button class="btn" id="phase7UseCloud">Force Use Cloud Version</button>
        <button class="btn" id="phase7PushDevice">Force Push This Device</button>
      </div>
    `;

    const nowButton = document.getElementById('phase7SyncNow');
    const useCloudButton = document.getElementById('phase7UseCloud');
    const pushButton = document.getElementById('phase7PushDevice');
    if (nowButton) nowButton.onclick = () => reconcile('manual');
    if (useCloudButton) useCloudButton.onclick = () => forcePull();
    if (pushButton) pushButton.onclick = () => forcePush();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  async function loadCloudSnapshot() {
    if (typeof workerFetch !== 'function') throw new Error('Worker connection is not ready.');
    const response = await workerFetch('/sync/load?owner=' + encodeURIComponent(cloud.ownerId), { method: 'GET' });
    if (!response.found || !response.snapshot) return null;
    const payload = response.snapshot.parsedPayload || JSON.parse(response.snapshot.payload);
    return {
      payload,
      updatedAt: response.snapshot.updated_at,
      deviceId: response.snapshot.device_id || ''
    };
  }

  function applyCloudSnapshot(snapshot) {
    if (!snapshot || !snapshot.payload) throw new Error('Cloud snapshot is empty.');
    if (typeof norm !== 'function') throw new Error('FORGE data normalizer is not ready.');
    if (typeof K === 'undefined') throw new Error('FORGE storage key is not ready.');

    db = norm(snapshot.payload);
    db.lastSaved = new Date().toISOString();
    localStorage.setItem(K, JSON.stringify(db));

    syncState.lastPulledAt = new Date().toISOString();
    syncState.lastCloudUpdatedAt = snapshot.updatedAt;
    syncState.lastDeviceAction = 'pulled_cloud';
    clearFail();

    if (typeof render === 'function') render();
    renderPanel();
  }

  async function pushLocal(reason = 'auto') {
    if (typeof pushToCloud !== 'function') throw new Error('Cloud push function is not ready.');
    await pushToCloud();
    syncState.lastPushedAt = new Date().toISOString();
    syncState.lastAutoSync = syncState.lastPushedAt;
    syncState.lastCloudUpdatedAt = syncState.lastPushedAt;
    syncState.lastDeviceAction = `pushed_${reason}`;
    clearFail();
    renderPanel();
  }

  async function pullCloud(snapshot, reason = 'auto') {
    applyCloudSnapshot(snapshot);
    syncState.lastAutoSync = new Date().toISOString();
    syncState.lastDeviceAction = `pulled_${reason}`;
    clearFail();
    saveState();
    setCloudStatus('Synced from cloud at ' + label(syncState.lastPulledAt));
    renderPanel();
  }

  function canLock() {
    const activeUntil = Number(localStorage.getItem(SYNC_LOCK_KEY) || '0');
    const now = Date.now();
    if (activeUntil > now) return false;
    localStorage.setItem(SYNC_LOCK_KEY, String(now + 20000));
    return true;
  }

  function unlock() {
    localStorage.removeItem(SYNC_LOCK_KEY);
  }

  async function reconcile(reason = 'auto') {
    if (running || !syncState.autoSyncEnabled || !cloudConfigured()) {
      renderPanel();
      return;
    }

    if (!canLock()) return;
    running = true;

    try {
      setCloudStatus('Checking cloud sync...');
      const snapshot = await loadCloudSnapshot();
      const localTime = getMs(localUpdatedAt());
      const cloudTime = getMs(snapshot?.updatedAt);

      if (!snapshot) {
        await pushLocal(reason);
        setCloudStatus('No cloud copy found. This device created the cloud version.');
        return;
      }

      if (cloudTime > localTime + 2000) {
        await pullCloud(snapshot, reason);
        return;
      }

      if (localTime > cloudTime + 2000) {
        if (localTime - cloudTime < CONFLICT_WINDOW_MS && snapshot.deviceId && snapshot.deviceId !== cloud.deviceId) {
          setCloudStatus('Possible recent edit on another device. Use Sync This Device Now after checking both devices.');
          syncState.lastError = 'Recent edits detected on multiple devices. No overwrite was made.';
          saveState();
          renderPanel();
          return;
        }
        await pushLocal(reason);
        setCloudStatus('This device was newer. Cloud updated at ' + label(syncState.lastPushedAt));
        return;
      }

      syncState.lastAutoSync = new Date().toISOString();
      syncState.lastCloudUpdatedAt = snapshot.updatedAt;
      syncState.lastDeviceAction = 'already_matched';
      clearFail();
      setCloudStatus('Mobile and computer are already matched.');
      renderPanel();
    } catch (error) {
      fail(error.message);
      setCloudStatus('Cross device sync failed: ' + error.message);
    } finally {
      running = false;
      unlock();
    }
  }

  async function forcePull() {
    if (!confirm('Use the cloud version on this device? This replaces local FORGE data on this browser.')) return;
    try {
      const snapshot = await loadCloudSnapshot();
      if (!snapshot) throw new Error('No cloud snapshot found.');
      await pullCloud(snapshot, 'force');
    } catch (error) {
      fail(error.message);
      setCloudStatus('Force cloud load failed: ' + error.message);
    }
  }

  async function forcePush() {
    if (!confirm('Push this device to cloud? This becomes the version other devices will load.')) return;
    try {
      await pushLocal('force');
      setCloudStatus('This device was pushed to cloud at ' + label(syncState.lastPushedAt));
    } catch (error) {
      fail(error.message);
      setCloudStatus('Force push failed: ' + error.message);
    }
  }

  function patchCloudSettingsSave() {
    const button = document.getElementById('saveCloudSettings');
    if (!button || button.__phase7Patched) return;
    const original = button.onclick;
    button.onclick = function (event) {
      const result = typeof original === 'function' ? original.call(this, event) : undefined;
      setTimeout(() => reconcile('settings_saved'), 600);
      return result;
    };
    button.__phase7Patched = true;
  }

  function patchLocalSave() {
    if (typeof save !== 'function' || save.__phase7Patched) return;
    const originalSave = save;
    save = function (...args) {
      const result = originalSave.apply(this, args);
      setTimeout(() => reconcile('local_save'), 1600);
      return result;
    };
    save.__phase7Patched = true;
  }

  function boot() {
    ensurePanel();
    renderPanel();
    patchCloudSettingsSave();
    patchLocalSave();

    setTimeout(() => reconcile('startup'), STARTUP_DELAY_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusSync < FOCUS_SYNC_COOLDOWN_MS) return;
      lastFocusSync = now;
      reconcile('focus');
    });

    window.addEventListener('online', () => reconcile('online'));
    console.info('FORGE Phase 7 cross device sync loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
