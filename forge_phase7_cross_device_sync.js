// FORGE Phase 7B: ATLAS style cloud first cross device sync
// Goal: mobile and desktop stay on the same cloud snapshot without a fresh device overwriting real cloud data.

(() => {
  const PHASE_KEY = 'forgeFitnessCrossDeviceSync.v2';
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
        hasTrustedCloudBase: false,
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
        autoSyncEnabled: true,
        hasTrustedCloudBase: false
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

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function dataScore(payload) {
    if (!payload || typeof payload !== 'object') return 0;
    let score = 0;
    if (payload.ready && Object.keys(payload.ready).length) score += 3;
    if (payload.ratings && Object.keys(payload.ratings).length) score += 3;
    if (payload.prs && Object.keys(payload.prs).length) score += 4;
    if (payload.body && Array.isArray(payload.body)) score += payload.body.length * 3;
    if (payload.summaries && Array.isArray(payload.summaries)) score += payload.summaries.length * 5;
    if (payload.coach && Array.isArray(payload.coach)) score += payload.coach.length;
    if (payload.calendar && Object.keys(payload.calendar).length) score += Object.keys(payload.calendar).length;
    if (payload.dailyStandard && payload.dailyStandard.log && typeof payload.dailyStandard.log === 'object') {
      Object.values(payload.dailyStandard.log).forEach(day => {
        if (!day) return;
        score += (Number(day.pushUps) || 0) + (Number(day.sitUps) || 0);
        if (day.completedAt) score += 10;
      });
    }
    if (payload.sessions && typeof payload.sessions === 'object') {
      Object.values(payload.sessions).forEach(session => {
        if (!session) return;
        if (session.status && session.status !== 'Not started') score += 3;
        if (Array.isArray(session.exercises)) {
          score += session.exercises.filter(ex => ex.done || ex.actualWeight || ex.actualReps || ex.notes).length * 3;
        }
      });
    }
    return score;
  }

  function localDataScore() {
    try {
      return dataScore(db);
    } catch (error) {
      return 0;
    }
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
    const score = localDataScore();
    const error = syncState.lastError ? `<p class="muted">Last sync issue: ${escapeHtml(syncState.lastError)}</p>` : '';

    panel.innerHTML = `
      <div class="top">
        <strong>ATLAS style cross device sync</strong>
        <span class="pill ${connected ? 'good' : 'warn'}">${connected ? 'Cloud first' : 'Needs token'}</span>
      </div>
      <p class="muted">Owner: ${escapeHtml(owner)} • Device: ${escapeHtml(device)} • Local data score: ${score}</p>
      <p class="muted">Auto sync: ${syncState.autoSyncEnabled ? 'On' : 'Off'} • Last auto sync: ${label(syncState.lastAutoSync)} • Pulled: ${label(syncState.lastPulledAt)} • Pushed: ${label(syncState.lastPushedAt)}</p>
      <p class="small">Cloud first mode means a new or empty device pulls the cloud copy first. A device will not automatically overwrite cloud unless it has a trusted cloud base or you force push it.</p>
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

  async function loadCloudSnapshot() {
    if (typeof workerFetch !== 'function') throw new Error('Worker connection is not ready.');
    const response = await workerFetch('/sync/load?owner=' + encodeURIComponent(cloud.ownerId), { method: 'GET' });
    if (!response.found || !response.snapshot) return null;
    const payload = response.snapshot.parsedPayload || JSON.parse(response.snapshot.payload);
    return {
      payload,
      updatedAt: response.snapshot.updated_at,
      deviceId: response.snapshot.device_id || '',
      score: dataScore(payload)
    };
  }

  function applyCloudSnapshot(snapshot) {
    if (!snapshot || !snapshot.payload) throw new Error('Cloud snapshot is empty.');
    if (typeof norm !== 'function') throw new Error('FORGE data normalizer is not ready.');
    if (typeof K === 'undefined') throw new Error('FORGE storage key is not ready.');

    db = norm(snapshot.payload);
    db.lastSaved = snapshot.updatedAt || new Date().toISOString();
    localStorage.setItem(K, JSON.stringify(db));

    syncState.lastPulledAt = new Date().toISOString();
    syncState.lastCloudUpdatedAt = snapshot.updatedAt;
    syncState.lastDeviceAction = 'pulled_cloud';
    syncState.hasTrustedCloudBase = true;
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
    syncState.hasTrustedCloudBase = true;
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

  function hasTrustedLocalEdits(localTime, cloudTime) {
    if (!syncState.hasTrustedCloudBase) return false;
    if (localDataScore() <= 0) return false;
    return localTime > cloudTime + 2000;
  }

  async function reconcile(reason = 'auto') {
    if (running || !syncState.autoSyncEnabled || !cloudConfigured()) {
      renderPanel();
      return;
    }

    if (!canLock()) return;
    running = true;

    try {
      setCloudStatus('Checking ATLAS style cloud sync...');
      const snapshot = await loadCloudSnapshot();
      const localTime = getMs(localUpdatedAt());
      const cloudTime = getMs(snapshot?.updatedAt);
      const localScore = localDataScore();
      const cloudScore = snapshot ? snapshot.score : 0;

      if (!snapshot) {
        if (localScore > 0) {
          await pushLocal(reason);
          setCloudStatus('No cloud copy found. This device created the cloud version.');
        } else {
          setCloudStatus('No cloud copy found yet. Add data or force push this device.');
        }
        return;
      }

      if (!syncState.hasTrustedCloudBase) {
        if (cloudScore >= localScore) {
          await pullCloud(snapshot, 'cloud_first_new_device');
          setCloudStatus('Cloud first sync pulled the shared FORGE version.');
          return;
        }
        syncState.lastError = 'This device has local data but has not been matched with cloud yet. Choose Force Push This Device or Force Use Cloud Version.';
        saveState();
        renderPanel();
        setCloudStatus('Choose which version should win before syncing.');
        return;
      }

      if (cloudTime > localTime + 2000) {
        await pullCloud(snapshot, reason);
        return;
      }

      if (hasTrustedLocalEdits(localTime, cloudTime)) {
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
      syncState.hasTrustedCloudBase = true;
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
      syncState.hasTrustedCloudBase = true;
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
    console.info('FORGE Phase 7B cloud first sync loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// FORGE Phase 8: Daily Standard push up and sit up tracker
// Adds saved daily push up and sit up counts without changing the app's visual identity.
(() => {
  const STORE_KEY = 'dailyStandard';
  const VERSION = '8.0.0';
  const DEFAULT_GOALS = { pushUps: 100, sitUps: 100 };
  let cloudSaveTimer = null;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function dateKey(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    try {
      return new Date(value + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      return value;
    }
  }

  function ensureStore() {
    if (typeof db === 'undefined' || !db) return null;
    if (!db[STORE_KEY] || typeof db[STORE_KEY] !== 'object') {
      db[STORE_KEY] = { version: VERSION, goals: { ...DEFAULT_GOALS }, log: {} };
    }
    const store = db[STORE_KEY];
    store.version = VERSION;
    store.goals = { ...DEFAULT_GOALS, ...(store.goals || {}) };
    store.log = store.log && typeof store.log === 'object' ? store.log : {};

    if (db.dailyBodyweightLog && typeof db.dailyBodyweightLog === 'object') {
      Object.entries(db.dailyBodyweightLog).forEach(([key, value]) => {
        if (!value || store.log[key]) return;
        store.log[key] = {
          date: key,
          pushUps: toNumber(value.pushUps),
          sitUps: toNumber(value.sitUps),
          goals: {
            pushUps: toNumber(value.pushUpGoal, store.goals.pushUps),
            sitUps: toNumber(value.sitUpGoal, store.goals.sitUps)
          },
          completedAt: value.completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
      });
    }

    return store;
  }

  function getEntry(key = dateKey()) {
    const store = ensureStore();
    if (!store) return null;
    if (!store.log[key]) {
      store.log[key] = {
        date: key,
        pushUps: 0,
        sitUps: 0,
        goals: { ...store.goals },
        completedAt: null,
        updatedAt: null
      };
    }
    const entry = store.log[key];
    entry.date = entry.date || key;
    entry.pushUps = toNumber(entry.pushUps);
    entry.sitUps = toNumber(entry.sitUps);
    entry.goals = { ...store.goals, ...(entry.goals || {}) };
    return entry;
  }

  function goalFor(entry, type, store = ensureStore()) {
    return Math.max(1, toNumber(entry?.goals?.[type] || store?.goals?.[type] || DEFAULT_GOALS[type], DEFAULT_GOALS[type]));
  }

  function isComplete(entry, store = ensureStore()) {
    if (!entry || !store) return false;
    return toNumber(entry.pushUps) >= goalFor(entry, 'pushUps', store) && toNumber(entry.sitUps) >= goalFor(entry, 'sitUps', store);
  }

  function progressPercent(entry, type, store = ensureStore()) {
    const goal = goalFor(entry, type, store);
    const value = toNumber(entry?.[type]);
    return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
  }

  function standardLevel(store) {
    const pushGoal = toNumber(store?.goals?.pushUps, DEFAULT_GOALS.pushUps);
    const sitGoal = toNumber(store?.goals?.sitUps, DEFAULT_GOALS.sitUps);
    const average = (pushGoal + sitGoal) / 2;
    if (average >= 200) return 'Savage Mode';
    if (average >= 100) return 'Locked In';
    if (average >= 50) return 'Building';
    return 'Starter';
  }

  function totalFor(days, type) {
    const store = ensureStore();
    if (!store) return 0;
    let total = 0;
    for (let i = 0; i < days; i += 1) {
      const entry = store.log[dateKey(-i)];
      total += toNumber(entry?.[type]);
    }
    return total;
  }

  function streakCount() {
    const store = ensureStore();
    if (!store) return 0;
    let streak = 0;
    for (let i = 0; i < 365; i += 1) {
      const entry = store.log[dateKey(-i)];
      if (!entry || !isComplete(entry, store)) break;
      streak += 1;
    }
    return streak;
  }

  function bestDay() {
    const store = ensureStore();
    if (!store) return null;
    let best = null;
    Object.values(store.log).forEach(entry => {
      if (!entry) return;
      const total = toNumber(entry.pushUps) + toNumber(entry.sitUps);
      if (!best || total > best.total) best = { ...entry, total };
    });
    return best && best.total > 0 ? best : null;
  }

  function recentEntries(days = 7) {
    const store = ensureStore();
    if (!store) return [];
    const rows = [];
    for (let i = 0; i < days; i += 1) {
      const key = dateKey(-i);
      const entry = store.log[key];
      if (entry) rows.push({ key, entry });
    }
    return rows;
  }

  function ensureTodayCard() {
    const todayScreen = document.getElementById('today');
    if (!todayScreen) return null;
    let card = document.getElementById('dailyStandardCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'dailyStandardCard';
      card.className = 'card';
      const firstCard = todayScreen.querySelector('.card');
      if (firstCard) firstCard.insertAdjacentElement('afterend', card);
      else todayScreen.prepend(card);
    }
    return card;
  }

  function ensureProgressCard() {
    const progressScreen = document.getElementById('progress');
    if (!progressScreen) return null;
    let card = document.getElementById('dailyStandardHistoryCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'dailyStandardHistoryCard';
      card.className = 'card';
      const firstCard = progressScreen.querySelector('.card');
      if (firstCard) firstCard.insertAdjacentElement('beforebegin', card);
      else progressScreen.appendChild(card);
    }
    return card;
  }

  function renderTodayCard() {
    const store = ensureStore();
    const entry = getEntry();
    const card = ensureTodayCard();
    if (!store || !entry || !card) return;

    const complete = isComplete(entry, store);
    const pushPct = progressPercent(entry, 'pushUps', store);
    const sitPct = progressPercent(entry, 'sitUps', store);
    const weeklyPush = totalFor(7, 'pushUps');
    const weeklySit = totalFor(7, 'sitUps');

    card.innerHTML = `
      <div class="top">
        <div>
          <h2>Daily Standard</h2>
          <p class="muted">Track today's push ups and sit ups. Every count saves by date and follows you through FORGE sync.</p>
        </div>
        <span class="pill ${complete ? 'good' : 'warn'}">${complete ? 'Standard Met' : 'In Progress'}</span>
      </div>

      <div class="grid4" style="margin-top:10px">
        <div class="stat"><small>Push Ups</small><b>${entry.pushUps} / ${goalFor(entry, 'pushUps', store)}</b></div>
        <div class="stat"><small>Sit Ups</small><b>${entry.sitUps} / ${goalFor(entry, 'sitUps', store)}</b></div>
        <div class="stat"><small>Weekly Total</small><b>${weeklyPush + weeklySit}</b></div>
        <div class="stat"><small>Streak</small><b>${streakCount()}</b></div>
      </div>

      <div class="targets">
        <div class="target">
          <small>Push Progress</small><b>${pushPct}%</b>
          <div class="workout-progress"><div class="fill" style="width:${pushPct}%"></div></div>
        </div>
        <div class="target">
          <small>Sit Progress</small><b>${sitPct}%</b>
          <div class="workout-progress"><div class="fill" style="width:${sitPct}%"></div></div>
        </div>
        <div class="target"><small>Standard Level</small><b>${standardLevel(store)}</b></div>
        <div class="target"><small>Saved Date</small><b>${formatDate(dateKey())}</b></div>
      </div>

      <div class="grid3">
        <p><label>Push up goal</label><input id="dsPushGoal" type="number" min="1" value="${store.goals.pushUps}"></p>
        <p><label>Sit up goal</label><input id="dsSitGoal" type="number" min="1" value="${store.goals.sitUps}"></p>
        <p><label>Custom add</label><input id="dsCustomAmount" type="number" min="1" placeholder="25"></p>
      </div>

      <div class="btns">
        <button class="btn primary" data-ds-add="pushUps" data-ds-amount="10">+10 Push Ups</button>
        <button class="btn primary" data-ds-add="sitUps" data-ds-amount="10">+10 Sit Ups</button>
        <button class="btn" data-ds-add="pushUps" data-ds-amount="25">+25 Push Ups</button>
        <button class="btn" data-ds-add="sitUps" data-ds-amount="25">+25 Sit Ups</button>
        <button class="btn" id="dailyStandardAddCustomPush">Add Custom Push</button>
        <button class="btn" id="dailyStandardAddCustomSit">Add Custom Sit</button>
        <button class="btn good" id="dailyStandardComplete">Mark Standard Done</button>
        <button class="btn" id="dailyStandardSaveGoals">Save Goals</button>
        <button class="btn danger" id="dailyStandardResetToday">Reset Today</button>
      </div>
    `;
  }

  function renderProgressCard() {
    const store = ensureStore();
    const card = ensureProgressCard();
    if (!store || !card) return;

    const best = bestDay();
    const rows = recentEntries(7).map(({ key, entry }) => {
      const status = isComplete(entry, store) ? 'Met' : 'Open';
      return `
        <div class="item">
          <div class="top"><strong>${formatDate(key)}</strong><span class="pill ${status === 'Met' ? 'good' : 'warn'}">${status}</span></div>
          <p class="muted">Push ups ${toNumber(entry.pushUps)} / ${goalFor(entry, 'pushUps', store)} • Sit ups ${toNumber(entry.sitUps)} / ${goalFor(entry, 'sitUps', store)}</p>
        </div>
      `;
    }).join('') || '<p class="muted">No Daily Standard logs yet.</p>';

    card.innerHTML = `
      <h2>Daily Standard History</h2>
      <div class="grid4">
        <div class="stat"><small>7 Day Push</small><b>${totalFor(7, 'pushUps')}</b></div>
        <div class="stat"><small>7 Day Sit</small><b>${totalFor(7, 'sitUps')}</b></div>
        <div class="stat"><small>30 Day Total</small><b>${totalFor(30, 'pushUps') + totalFor(30, 'sitUps')}</b></div>
        <div class="stat"><small>Best Day</small><b>${best ? best.total : 0}</b></div>
      </div>
      <div class="list">${rows}</div>
    `;
  }

  function renderDailyStandard() {
    renderTodayCard();
    renderProgressCard();
  }

  function persistAndRender() {
    if (typeof db !== 'undefined' && db) {
      db.lastSaved = new Date().toISOString();
    }

    if (typeof save === 'function') {
      save();
    } else if (typeof K !== 'undefined' && typeof db !== 'undefined') {
      localStorage.setItem(K, JSON.stringify(db));
      renderDailyStandard();
    } else {
      renderDailyStandard();
    }

    queueCloudSave();
  }

  function queueCloudSave() {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try {
        if (typeof cloudReady === 'function' && cloudReady() && typeof pushToCloud === 'function') {
          await pushToCloud();
        }
      } catch (error) {
        console.warn('FORGE Daily Standard cloud sync skipped:', error.message);
      }
    }, 2500);
  }

  function addCount(type, amount) {
    const store = ensureStore();
    const entry = getEntry();
    if (!store || !entry) return;
    const cleanAmount = Math.max(0, Math.round(toNumber(amount)));
    if (!cleanAmount) return;

    entry[type] = toNumber(entry[type]) + cleanAmount;
    entry.goals = { ...store.goals };
    entry.updatedAt = new Date().toISOString();
    if (isComplete(entry, store) && !entry.completedAt) entry.completedAt = entry.updatedAt;
    store.lastUpdated = entry.updatedAt;
    persistAndRender();
  }

  function saveGoalsFromInputs() {
    const store = ensureStore();
    const entry = getEntry();
    if (!store || !entry) return;
    const pushGoal = Math.max(1, Math.round(toNumber(document.getElementById('dsPushGoal')?.value, store.goals.pushUps)));
    const sitGoal = Math.max(1, Math.round(toNumber(document.getElementById('dsSitGoal')?.value, store.goals.sitUps)));
    store.goals = { pushUps: pushGoal, sitUps: sitGoal };
    entry.goals = { ...store.goals };
    entry.updatedAt = new Date().toISOString();
    entry.completedAt = isComplete(entry, store) ? (entry.completedAt || entry.updatedAt) : null;
    store.lastUpdated = entry.updatedAt;
    persistAndRender();
  }

  function completeStandard() {
    const store = ensureStore();
    const entry = getEntry();
    if (!store || !entry) return;
    entry.pushUps = Math.max(toNumber(entry.pushUps), goalFor(entry, 'pushUps', store));
    entry.sitUps = Math.max(toNumber(entry.sitUps), goalFor(entry, 'sitUps', store));
    entry.goals = { ...store.goals };
    entry.completedAt = new Date().toISOString();
    entry.updatedAt = entry.completedAt;
    store.lastUpdated = entry.updatedAt;
    persistAndRender();
  }

  function resetToday() {
    if (!confirm('Reset today\'s Daily Standard counts?')) return;
    const store = ensureStore();
    const entry = getEntry();
    if (!store || !entry) return;
    entry.pushUps = 0;
    entry.sitUps = 0;
    entry.goals = { ...store.goals };
    entry.completedAt = null;
    entry.updatedAt = new Date().toISOString();
    store.lastUpdated = entry.updatedAt;
    persistAndRender();
  }

  function wireEvents() {
    if (document.__dailyStandardEventsWired) return;
    document.__dailyStandardEventsWired = true;

    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.dataset.dsAdd) {
        addCount(button.dataset.dsAdd, button.dataset.dsAmount);
        return;
      }

      if (button.id === 'dailyStandardAddCustomPush') {
        addCount('pushUps', document.getElementById('dsCustomAmount')?.value || 0);
        return;
      }

      if (button.id === 'dailyStandardAddCustomSit') {
        addCount('sitUps', document.getElementById('dsCustomAmount')?.value || 0);
        return;
      }

      if (button.id === 'dailyStandardSaveGoals') {
        saveGoalsFromInputs();
        return;
      }

      if (button.id === 'dailyStandardComplete') {
        completeStandard();
        return;
      }

      if (button.id === 'dailyStandardResetToday') {
        resetToday();
      }
    });
  }

  function patchRender() {
    if (typeof render !== 'function' || render.__dailyStandardPatched) return;
    const originalRender = render;
    render = function (...args) {
      const result = originalRender.apply(this, args);
      setTimeout(renderDailyStandard, 0);
      return result;
    };
    render.__dailyStandardPatched = true;
  }

  function boot() {
    ensureStore();
    wireEvents();
    patchRender();
    renderDailyStandard();
    console.info('FORGE Phase 8 Daily Standard loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
