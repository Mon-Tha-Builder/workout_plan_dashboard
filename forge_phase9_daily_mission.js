// FORGE Phase 9: Daily Mission Command
// Slims the Today experience into one command card while preserving the full app power.

(() => {
  const STYLE_ID = 'forgePhase9DailyMissionStyle';

  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
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

  function getTodayKey() {
    try {
      return typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
    } catch (error) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function formatTime(value) {
    if (!value) return 'Not yet';
    try {
      return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (error) {
      return 'Unknown';
    }
  }

  function getSessionSafe() {
    try {
      if (typeof getSession === 'function') return getSession();
    } catch (error) {}
    return null;
  }

  function getReadinessSafe() {
    try {
      if (typeof readiness === 'function') return readiness();
    } catch (error) {}
    return { score: 0, status: 'Unset', move: 'Check In', msg: 'Run readiness before training.' };
  }

  function ensureDailyStore() {
    if (typeof db === 'undefined' || !db) return null;
    if (!db.dailyStandard || typeof db.dailyStandard !== 'object') {
      db.dailyStandard = { version: '9.0.0', goals: { pushUps: 100, sitUps: 100 }, log: {} };
    }
    const store = db.dailyStandard;
    store.version = store.version || '9.0.0';
    store.goals = { pushUps: 100, sitUps: 100, ...(store.goals || {}) };
    store.log = store.log && typeof store.log === 'object' ? store.log : {};
    const key = getTodayKey();
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
    entry.pushUps = toNumber(entry.pushUps);
    entry.sitUps = toNumber(entry.sitUps);
    entry.goals = { ...store.goals, ...(entry.goals || {}) };
    return { store, entry, key };
  }

  function goalFor(entry, store, type) {
    return Math.max(1, toNumber(entry?.goals?.[type] || store?.goals?.[type] || 100, 100));
  }

  function dailyComplete(entry, store) {
    return entry && store && entry.pushUps >= goalFor(entry, store, 'pushUps') && entry.sitUps >= goalFor(entry, store, 'sitUps');
  }

  function workoutComplete(session) {
    return session && session.status === 'Completed';
  }

  function readinessDone() {
    try {
      return !!(db && db.ready && db.ready[getTodayKey()]);
    } catch (error) {
      return false;
    }
  }

  function dayStatus(session, daily, ready) {
    if (workoutComplete(session) && dailyComplete(daily.entry, daily.store)) return 'Full Day Complete';
    if (workoutComplete(session)) return 'Workout Done';
    if (dailyComplete(daily.entry, daily.store)) return 'Standard Done';
    if (session && session.status && session.status !== 'Not started') return session.status;
    return ready.score ? ready.move : 'Check In';
  }

  function primaryAction(session, daily, ready) {
    if (!readinessDone()) {
      return { label: 'Run Readiness', action: 'readiness', tone: 'primary' };
    }
    if (!dailyComplete(daily.entry, daily.store)) {
      return { label: 'Build Daily Standard', action: 'standard', tone: 'primary' };
    }
    if (!workoutComplete(session)) {
      return { label: session && session.status === 'In progress' ? 'Return To Workout' : 'Start Workout', action: 'train', tone: 'primary' };
    }
    return { label: 'Review Progress', action: 'progress', tone: 'good' };
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .phase9-hidden{display:none!important}
      .phase9-mission-row{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}
      @media(min-width:720px){.phase9-mission-row{grid-template-columns:1.2fr .8fr}}
      .phase9-step{border:1px solid var(--line);background:var(--bg-elevated);border-radius:3px;padding:12px 14px}
      .phase9-step strong{display:block;color:var(--text);font-size:14px;margin-bottom:4px}
      .phase9-step.done{border-color:rgba(141,184,113,.45);background:rgba(141,184,113,.08)}
      .phase9-compact-note{margin-top:10px;font-size:12px;color:var(--dim)}
    `;
    document.head.appendChild(style);
  }

  function ensureCard() {
    const todayScreen = document.getElementById('today');
    if (!todayScreen) return null;
    let card = document.getElementById('dailyMissionCommandCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'dailyMissionCommandCard';
      card.className = 'card';
      todayScreen.insertBefore(card, todayScreen.firstElementChild || null);
    }
    return card;
  }

  function compactTodayNoise() {
    const dailyStandardCard = document.getElementById('dailyStandardCard');
    if (dailyStandardCard) dailyStandardCard.classList.add('phase9-hidden');

    const todayScreen = document.getElementById('today');
    if (!todayScreen) return;
    const cards = Array.from(todayScreen.querySelectorAll(':scope > .card'));
    cards.forEach(card => {
      const heading = card.querySelector('h2')?.textContent?.trim();
      if (heading === 'Today Command Center') card.classList.add('phase9-hidden');
    });
  }

  function renderMission() {
    injectStyle();
    const card = ensureCard();
    const daily = ensureDailyStore();
    const session = getSessionSafe();
    const ready = getReadinessSafe();
    if (!card || !daily) return;

    const pushGoal = goalFor(daily.entry, daily.store, 'pushUps');
    const sitGoal = goalFor(daily.entry, daily.store, 'sitUps');
    const pushPct = Math.min(100, Math.round((daily.entry.pushUps / pushGoal) * 100));
    const sitPct = Math.min(100, Math.round((daily.entry.sitUps / sitGoal) * 100));
    const dailyMet = dailyComplete(daily.entry, daily.store);
    const workoutMet = workoutComplete(session);
    const readyMet = readinessDone();
    const action = primaryAction(session, daily, ready);
    const status = dayStatus(session, daily, ready);
    const target = session?.targetMinutes || (typeof targetMinutes === 'function' ? targetMinutes() : 45);

    card.innerHTML = `
      <div class="top">
        <div>
          <h2>Daily Mission Command</h2>
          <p class="muted">Open FORGE, follow this card, and move. Details stay below only when you need them.</p>
        </div>
        <span class="pill ${workoutMet && dailyMet ? 'good' : ready.score < 45 && ready.score > 0 ? 'recovery' : 'warn'}">${safeText(status)}</span>
      </div>

      <div class="grid4" style="margin-top:10px">
        <div class="stat"><small>Workout</small><b>${safeText(session?.name || 'Loading')}</b></div>
        <div class="stat"><small>Readiness</small><b>${ready.score || 0}</b></div>
        <div class="stat"><small>Push Ups</small><b>${daily.entry.pushUps} / ${pushGoal}</b></div>
        <div class="stat"><small>Sit Ups</small><b>${daily.entry.sitUps} / ${sitGoal}</b></div>
      </div>

      <button class="smart-action ${action.tone === 'good' ? 'good-state' : ''}" id="phase9PrimaryAction">${safeText(action.label)}</button>

      <div class="phase9-mission-row">
        <div>
          <div class="phase9-step ${readyMet ? 'done' : ''}"><strong>1. Readiness</strong><p class="muted">${readyMet ? safeText(ready.status + ' — ' + ready.msg) : 'Check sleep, energy, soreness, stress, motivation, time, and pain first.'}</p></div>
          <div class="phase9-step ${dailyMet ? 'done' : ''}"><strong>2. Daily Standard</strong><p class="muted">Push ${daily.entry.pushUps}/${pushGoal} • Sit ${daily.entry.sitUps}/${sitGoal}</p></div>
          <div class="phase9-step ${workoutMet ? 'done' : ''}"><strong>3. Workout</strong><p class="muted">${safeText(session?.programDay || 'Today')}: ${safeText(session?.name || 'Workout')} • Target ${safeText(target)} min • ${safeText(session?.status || 'Not started')}</p></div>
        </div>
        <div>
          <div class="targets">
            <div class="target"><small>Push Progress</small><b>${pushPct}%</b><div class="workout-progress"><div class="fill" style="width:${pushPct}%"></div></div></div>
            <div class="target"><small>Sit Progress</small><b>${sitPct}%</b><div class="workout-progress"><div class="fill" style="width:${sitPct}%"></div></div></div>
          </div>
          <div class="btns">
            <button class="btn primary" data-phase9-add="pushUps" data-phase9-amount="10">+10 Push</button>
            <button class="btn primary" data-phase9-add="sitUps" data-phase9-amount="10">+10 Sit</button>
            <button class="btn" data-phase9-add="pushUps" data-phase9-amount="25">+25 Push</button>
            <button class="btn" data-phase9-add="sitUps" data-phase9-amount="25">+25 Sit</button>
            <button class="btn good" id="phase9CompleteStandard">Mark Standard Done</button>
          </div>
          <p class="phase9-compact-note">Last saved: ${formatTime(db?.lastSaved)} • Full controls remain in Train, Progress, Coach, and Settings.</p>
        </div>
      </div>
    `;

    const primary = document.getElementById('phase9PrimaryAction');
    if (primary) primary.dataset.phase9Action = action.action;
    compactTodayNoise();
  }

  function persist() {
    if (typeof db !== 'undefined' && db) db.lastSaved = new Date().toISOString();
    if (typeof save === 'function') save();
    else if (typeof K !== 'undefined' && typeof db !== 'undefined') localStorage.setItem(K, JSON.stringify(db));
    renderMission();
  }

  function addDaily(type, amount) {
    const daily = ensureDailyStore();
    if (!daily) return;
    const cleanAmount = Math.max(0, Math.round(toNumber(amount)));
    if (!cleanAmount) return;
    daily.entry[type] = toNumber(daily.entry[type]) + cleanAmount;
    daily.entry.goals = { ...daily.store.goals };
    daily.entry.updatedAt = new Date().toISOString();
    if (dailyComplete(daily.entry, daily.store) && !daily.entry.completedAt) daily.entry.completedAt = daily.entry.updatedAt;
    daily.store.lastUpdated = daily.entry.updatedAt;
    persist();
  }

  function completeDailyStandard() {
    const daily = ensureDailyStore();
    if (!daily) return;
    daily.entry.pushUps = Math.max(daily.entry.pushUps, goalFor(daily.entry, daily.store, 'pushUps'));
    daily.entry.sitUps = Math.max(daily.entry.sitUps, goalFor(daily.entry, daily.store, 'sitUps'));
    daily.entry.goals = { ...daily.store.goals };
    daily.entry.completedAt = new Date().toISOString();
    daily.entry.updatedAt = daily.entry.completedAt;
    daily.store.lastUpdated = daily.entry.updatedAt;
    persist();
  }

  function goToSection(id) {
    try {
      if (typeof show === 'function') show(id);
      else document.querySelector(`.nav button[data-s="${id}"]`)?.click();
    } catch (error) {}
  }

  function handlePrimary(action) {
    if (action === 'readiness') {
      document.getElementById('sleep')?.focus();
      return;
    }
    if (action === 'standard') {
      addDaily('pushUps', 10);
      return;
    }
    if (action === 'train') {
      const session = getSessionSafe();
      if (session && (session.status === 'Not started' || session.status === 'Adjusted' || session.status === 'AI adjusted')) {
        try { if (typeof startWorkout === 'function') startWorkout(); } catch (error) {}
      }
      goToSection('train');
      return;
    }
    if (action === 'progress') goToSection('progress');
  }

  function wireEvents() {
    if (document.__phase9MissionWired) return;
    document.__phase9MissionWired = true;
    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.phase9Add) addDaily(button.dataset.phase9Add, button.dataset.phase9Amount);
      if (button.id === 'phase9CompleteStandard') completeDailyStandard();
      if (button.id === 'phase9PrimaryAction') handlePrimary(button.dataset.phase9Action);
    });
  }

  function patchRender() {
    if (typeof render !== 'function' || render.__phase9Patched) return;
    const originalRender = render;
    render = function (...args) {
      const result = originalRender.apply(this, args);
      setTimeout(renderMission, 0);
      return result;
    };
    render.__phase9Patched = true;
  }

  function boot() {
    injectStyle();
    wireEvents();
    patchRender();
    renderMission();
    setTimeout(renderMission, 250);
    setTimeout(renderMission, 900);
    console.info('FORGE Phase 9 Daily Mission Command loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
