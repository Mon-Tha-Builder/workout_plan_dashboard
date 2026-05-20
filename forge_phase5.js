// FORGE Phase 5: Cloud Sync Hardening and AI Reliability
// Loaded by sw.js after the v7 app. No API keys are stored here.

(() => {
  const PHASE = 'Phase 5 sync hardening';
  const PHASE_KEY = 'forgeFitnessPhase5.v1';

  const state = loadPhaseState();

  function loadPhaseState() {
    try {
      return {
        lastLocalSave: null,
        lastCloudSave: null,
        lastCloudLoad: null,
        lastCloudTest: null,
        lastAutoSave: null,
        lastError: null,
        autoSaveEnabled: true,
        ...JSON.parse(localStorage.getItem(PHASE_KEY) || '{}')
      };
    } catch (error) {
      return {
        lastLocalSave: null,
        lastCloudSave: null,
        lastCloudLoad: null,
        lastCloudTest: null,
        lastAutoSave: null,
        lastError: null,
        autoSaveEnabled: true
      };
    }
  }

  function persistPhaseState() {
    localStorage.setItem(PHASE_KEY, JSON.stringify(state));
  }

  function stamp(key, message = '') {
    state[key] = new Date().toISOString();
    if (message) state.lastMessage = message;
    persistPhaseState();
    renderPhaseStatus();
  }

  function fail(message) {
    state.lastError = `${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ${message}`;
    persistPhaseState();
    renderPhaseStatus();
  }

  function fmt(value) {
    if (!value) return 'Not yet';
    try {
      return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (error) {
      return 'Unknown';
    }
  }

  function getCloudCard() {
    const workerInput = document.getElementById('cloudWorkerUrl');
    return workerInput ? workerInput.closest('.card') : null;
  }

  function ensurePhasePanel() {
    const card = getCloudCard();
    if (!card) return null;

    let helper = document.getElementById('phase5CloudHelper');
    if (!helper) {
      helper = document.createElement('div');
      helper.id = 'phase5CloudHelper';
      helper.className = 'item';
      helper.innerHTML = `
        <strong>Cloud setup guide</strong>
        <p class="muted">Worker URL is your Cloudflare Worker. Owner ID identifies your private FORGE data. Device ID identifies this browser. Sync Token is your private Worker token and stays in this browser only.</p>
        <p class="small">Save To Cloud pushes this device to D1. Load From Cloud replaces this device with the D1 version after confirmation. Test Worker checks the backend.</p>
      `;
      const grid = card.querySelector('.grid2');
      if (grid) card.insertBefore(helper, grid);
    }

    let panel = document.getElementById('phase5SyncPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'phase5SyncPanel';
      panel.className = 'item';
      const cloudStatus = document.getElementById('cloudStatus');
      if (cloudStatus) cloudStatus.insertAdjacentElement('afterend', panel);
      else card.appendChild(panel);
    }
    return panel;
  }

  function renderPhaseStatus() {
    const panel = ensurePhasePanel();
    if (!panel) return;

    const dbSaved = typeof db !== 'undefined' && db && db.lastSaved ? db.lastSaved : state.lastLocalSave;
    const connected = typeof cloudReady === 'function' && cloudReady();
    const cloudLine = connected ? 'Cloud connected' : 'Local only';
    const lastErrorLine = state.lastError ? `<p class="muted">Last error: ${escapeHtml(state.lastError)}</p>` : '';

    panel.innerHTML = `
      <div class="top">
        <strong>Sync status</strong>
        <span class="pill ${connected ? 'good' : 'warn'}">${cloudLine}</span>
      </div>
      <p class="muted">Local save: ${fmt(dbSaved)} • Cloud save: ${fmt(state.lastCloudSave)} • Cloud load: ${fmt(state.lastCloudLoad)} • Worker test: ${fmt(state.lastCloudTest)}</p>
      <p class="small">Auto cloud save is ${state.autoSaveEnabled ? 'on after major actions' : 'off'}.</p>
      ${lastErrorLine}
    `;

    const cloudTop = document.getElementById('cloudTop');
    if (cloudTop) cloudTop.textContent = connected ? (state.lastCloudSave ? 'Synced' : 'Ready') : 'Local';
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

  function isCloudConfigured() {
    try {
      return typeof cloudReady === 'function' && cloudReady();
    } catch (error) {
      return false;
    }
  }

  let autoSaveTimer = null;

  function queueAutoCloudSave(reason) {
    if (!state.autoSaveEnabled || !isCloudConfigured()) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => autoSave(reason), 900);
  }

  async function autoSave(reason) {
    if (!isCloudConfigured() || typeof pushToCloud !== 'function') return;
    try {
      state.lastMessage = `Auto saving after ${reason}...`;
      renderPhaseStatus();
      await pushToCloud();
      state.lastAutoSave = new Date().toISOString();
      state.lastCloudSave = state.lastAutoSave;
      state.lastError = null;
      persistPhaseState();
      renderPhaseStatus();
    } catch (error) {
      fail(`Auto cloud save failed after ${reason}: ${error.message}`);
    }
  }

  function wrapFunction(name, after) {
    try {
      const original = window[name] || globalThis[name];
      if (typeof original !== 'function' || original.__phase5Wrapped) return;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        try { after(name, args, result); } catch (error) { fail(error.message); }
        return result;
      };
      wrapped.__phase5Wrapped = true;
      globalThis[name] = wrapped;
    } catch (error) {
      fail(`Could not wrap ${name}: ${error.message}`);
    }
  }

  function wrapButton(id, after) {
    const button = document.getElementById(id);
    if (!button || button.__phase5Wrapped) return;
    const original = button.onclick;
    button.onclick = function (event) {
      const result = typeof original === 'function' ? original.call(this, event) : undefined;
      try { after(id, result); } catch (error) { fail(error.message); }
      return result;
    };
    button.__phase5Wrapped = true;
  }

  function bindButton(id, fn) {
    const button = document.getElementById(id);
    if (button && typeof fn === 'function') button.onclick = fn;
  }

  function hardenCloudFunctions() {
    if (typeof pushToCloud === 'function' && !pushToCloud.__phase5DirectWrapped) {
      const originalPush = pushToCloud;
      pushToCloud = async function (...args) {
        const result = await originalPush.apply(this, args);
        state.lastCloudSave = new Date().toISOString();
        state.lastError = null;
        persistPhaseState();
        renderPhaseStatus();
        return result;
      };
      pushToCloud.__phase5DirectWrapped = true;
      bindButton('pushCloud', pushToCloud);
      bindButton('pushCloudToday', pushToCloud);
      bindButton('saveCloudBeforeAi', pushToCloud);
    }

    if (typeof testCloudConnection === 'function' && !testCloudConnection.__phase5DirectWrapped) {
      const originalTest = testCloudConnection;
      testCloudConnection = async function (...args) {
        const result = await originalTest.apply(this, args);
        state.lastCloudTest = new Date().toISOString();
        state.lastError = null;
        persistPhaseState();
        renderPhaseStatus();
        return result;
      };
      testCloudConnection.__phase5DirectWrapped = true;
      bindButton('testCloud', testCloudConnection);
    }

    if (typeof pullFromCloud === 'function' && !pullFromCloud.__phase5DirectWrapped) {
      const originalPull = pullFromCloud;
      pullFromCloud = async function (...args) {
        const ok = confirm('This will replace the FORGE data on this device with the cloud version. Continue?');
        if (!ok) {
          state.lastMessage = 'Cloud load cancelled by user.';
          persistPhaseState();
          renderPhaseStatus();
          return undefined;
        }
        const result = await originalPull.apply(this, args);
        state.lastCloudLoad = new Date().toISOString();
        state.lastError = null;
        persistPhaseState();
        renderPhaseStatus();
        return result;
      };
      pullFromCloud.__phase5DirectWrapped = true;
      bindButton('pullCloud', pullFromCloud);
    }

    if (typeof askClaudeCoach === 'function' && !askClaudeCoach.__phase5DirectWrapped) {
      const originalAsk = askClaudeCoach;
      askClaudeCoach = async function (...args) {
        if (isCloudConfigured() && typeof pushToCloud === 'function') {
          const aiBox = document.getElementById('aiResponse');
          if (aiBox) aiBox.textContent = 'Saving latest FORGE data before asking Claude...';
          try {
            await pushToCloud();
            state.lastCloudSave = new Date().toISOString();
          } catch (error) {
            fail(`Could not save before Claude: ${error.message}`);
          }
        }
        const result = await originalAsk.apply(this, args);
        queueAutoCloudSave('Claude coach response');
        return result;
      };
      askClaudeCoach.__phase5DirectWrapped = true;
      bindButton('askClaude', askClaudeCoach);
    }
  }

  function wireMajorActionAutosaves() {
    wrapFunction('applyCoach', () => queueAutoCloudSave('plan adjustment'));
    wrapFunction('completeExercise', () => queueAutoCloudSave('exercise completion'));
    wrapFunction('finishWorkout', () => queueAutoCloudSave('workout finish'));
    wrapFunction('restartProgramToday', () => queueAutoCloudSave('program restart'));

    wrapButton('saveReady', () => queueAutoCloudSave('readiness save'));
    wrapButton('saveBody', () => queueAutoCloudSave('body log save'));
    wrapButton('saveEquipment', () => queueAutoCloudSave('equipment update'));
    wrapButton('saveProfile', () => queueAutoCloudSave('profile update'));
    wrapButton('minimumDay', () => queueAutoCloudSave('minimum standard'));
    wrapButton('recoveryDay', () => queueAutoCloudSave('recovery day'));
  }

  function enhanceCloudButtons() {
    const saveBtn = document.getElementById('saveCloudSettings');
    if (saveBtn && !saveBtn.__phase5Text) {
      saveBtn.title = 'Saves Worker URL, Owner ID, Device ID, and Sync Token to this browser only.';
      saveBtn.__phase5Text = true;
    }

    const pushToday = document.getElementById('pushCloudToday');
    if (pushToday) pushToday.title = 'Manual cloud save. Auto cloud save also runs after major actions when configured.';

    const beforeAi = document.getElementById('saveCloudBeforeAi');
    if (beforeAi) beforeAi.title = 'Manual save before Claude. Ask Claude now also saves first automatically.';
  }

  function boot() {
    try {
      ensurePhasePanel();
      hardenCloudFunctions();
      wireMajorActionAutosaves();
      enhanceCloudButtons();
      stamp('lastLocalSave', `${PHASE} loaded`);
      renderPhaseStatus();
      console.info('FORGE Phase 5 loaded');
    } catch (error) {
      console.error('FORGE Phase 5 failed', error);
      fail(error.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
