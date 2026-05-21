// FORGE Phase 6: Structured Claude Workout Updates
// Claude proposes controlled changes. FORGE validates before applying.

(() => {
  const PHASE_KEY = 'forgeFitnessPhase6.v1';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

  let phaseState = loadState();

  function loadState() {
    try {
      return {
        lastProposal: null,
        lastApplied: null,
        lastError: null,
        ...JSON.parse(localStorage.getItem(PHASE_KEY) || '{}')
      };
    } catch (error) {
      return { lastProposal: null, lastApplied: null, lastError: null };
    }
  }

  function saveState() {
    localStorage.setItem(PHASE_KEY, JSON.stringify(phaseState));
  }

  function html(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function nowLabel() {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function findCoachAnchor() {
    const aiResponse = document.getElementById('aiResponse');
    return aiResponse ? aiResponse.closest('.card') : document.getElementById('coach');
  }

  function ensurePanel() {
    if (document.getElementById('phase6Panel')) return document.getElementById('phase6Panel');
    const anchor = findCoachAnchor();
    if (!anchor) return null;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'phase6Panel';
    card.innerHTML = `
      <h2>Structured AI Workout Update</h2>
      <p class="muted">Claude can propose controlled changes to today's workout. FORGE validates every change before applying it. The split stays intact.</p>
      <div class="btns">
        <button class="btn primary" id="phase6Generate">Generate Safe Workout Update</button>
        <button class="btn good" id="phase6Apply" disabled>Apply Validated Update</button>
        <button class="btn" id="phase6Clear">Clear Proposal</button>
      </div>
      <div id="phase6Status" class="coachDecision muted" style="margin-top:10px">No structured proposal yet.</div>
      <div id="phase6Proposal" class="list" style="margin-top:10px"></div>
    `;

    anchor.insertAdjacentElement('afterend', card);
    document.getElementById('phase6Generate').onclick = generateProposal;
    document.getElementById('phase6Apply').onclick = applyProposal;
    document.getElementById('phase6Clear').onclick = clearProposal;
    return card;
  }

  function getSessionSafe() {
    if (typeof getSession !== 'function') throw new Error('FORGE session engine is not ready.');
    return getSession();
  }

  function proposalPrompt() {
    const session = getSessionSafe();
    const readinessData = typeof today === 'function' && db && db.ready ? db.ready[today()] || null : null;
    const lastSummary = db && Array.isArray(db.summaries) ? db.summaries[db.summaries.length - 1] || null : null;
    const ratings = db && db.ratings ? db.ratings : {};
    const equipment = db && db.equipment ? db.equipment : {};

    const compactSession = {
      name: session.name,
      programDay: session.programDay,
      focus: session.focus,
      targetMinutes: session.targetMinutes,
      note: session.note,
      exercises: session.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        slot: exercise.slot,
        group: exercise.group,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: exercise.rest,
        cue: exercise.cue,
        rating: exercise.rating,
        done: exercise.done,
        notes: exercise.notes,
        safeSwapOptions: (exercise.options || []).map(option => option.name)
      }))
    };

    return `Return only valid JSON. Do not use markdown. Create a safe structured update for today's FORGE workout.

Rules:
- Preserve the locked split and the current workout goal.
- Do not create brand new exercises unless the exercise is already listed in safeSwapOptions for that exact slot.
- Use posture friendly changes for neck/traps/mid back issues.
- If time or readiness is low, reduce sets or make accessories optional first.
- Do not diagnose injuries.
- Keep the plan focused on stronger frame, posture, cardio, and breathing.

JSON schema:
{
  "summary": "short plain English recommendation",
  "session": { "targetMinutes": 30, "note": "short note" },
  "changes": [
    {
      "exerciseName": "exact current exercise name",
      "action": "reduce_sets | increase_sets | change_reps | change_rest | swap_exercise | add_note | make_optional",
      "sets": 3,
      "reps": "8 to 10",
      "rest": "60 sec",
      "replacementName": "exact safeSwapOptions name only",
      "note": "short coaching note"
    }
  ]
}

Current context:
${JSON.stringify({ readinessData, equipment, ratings, lastSummary, session: compactSession }, null, 2)}`;
  }

  async function callClaudeForProposal() {
    if (typeof workerFetch !== 'function') throw new Error('Cloud worker connection is not ready.');
    if (typeof cloud === 'undefined' || !cloud.ownerId || !cloud.deviceId) throw new Error('Cloud settings are missing.');

    if (typeof pushToCloud === 'function') {
      setStatus('Saving latest FORGE data before structured update...');
      await pushToCloud();
    }

    setStatus('Asking Claude for a structured workout update...');
    const data = await workerFetch('/ai/coach', {
      method: 'POST',
      body: JSON.stringify({
        ownerId: cloud.ownerId,
        deviceId: cloud.deviceId,
        mode: 'structured_workout_update',
        request: proposalPrompt(),
        context: {
          today: typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10),
          purpose: 'Return safe workout modifications as JSON only.'
        },
        maxTokens: 1400
      })
    });
    return data.response || '';
  }

  function extractJson(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('Claude returned an empty response.');

    const unfenced = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(unfenced);
    } catch (directError) {
      const start = unfenced.indexOf('{');
      const end = unfenced.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) throw directError;
      return JSON.parse(unfenced.slice(start, end + 1));
    }
  }

  function validateProposal(proposal) {
    const session = getSessionSafe();
    const valid = {
      summary: String(proposal.summary || 'Claude proposed a controlled workout update.').slice(0, 500),
      session: {},
      changes: []
    };

    if (proposal.session && typeof proposal.session === 'object') {
      const target = Number(proposal.session.targetMinutes);
      if ([30, 45, 60].includes(target)) valid.session.targetMinutes = target;
      if (proposal.session.note) valid.session.note = String(proposal.session.note).slice(0, 350);
    }

    const incoming = Array.isArray(proposal.changes) ? proposal.changes.slice(0, 8) : [];
    incoming.forEach(change => {
      const current = session.exercises.find(ex => ex.name === change.exerciseName);
      if (!current) return;

      const safe = {
        exerciseName: current.name,
        action: String(change.action || 'add_note'),
        note: change.note ? String(change.note).slice(0, 240) : ''
      };

      if (!['reduce_sets', 'increase_sets', 'change_reps', 'change_rest', 'swap_exercise', 'add_note', 'make_optional'].includes(safe.action)) {
        safe.action = 'add_note';
      }

      if (safe.action === 'reduce_sets' || safe.action === 'increase_sets') {
        safe.sets = clamp(change.sets || current.sets, 1, 5);
      }

      if (safe.action === 'change_reps' && change.reps) {
        safe.reps = String(change.reps).slice(0, 40);
      }

      if (safe.action === 'change_rest' && change.rest) {
        safe.rest = String(change.rest).slice(0, 30);
      }

      if (safe.action === 'swap_exercise' && change.replacementName) {
        const options = current.options || [];
        const replacement = options.find(option => option.name === change.replacementName);
        if (!replacement) {
          safe.action = 'add_note';
          safe.note = `${safe.note ? safe.note + ' ' : ''}Requested swap was not in safe options, so FORGE kept the original exercise.`;
        } else {
          safe.replacementName = replacement.name;
        }
      }

      valid.changes.push(safe);
    });

    return valid;
  }

  function renderProposal() {
    const box = document.getElementById('phase6Proposal');
    const applyButton = document.getElementById('phase6Apply');
    if (!box || !applyButton) return;

    const proposal = phaseState.lastProposal;
    if (!proposal) {
      box.innerHTML = '';
      applyButton.disabled = true;
      return;
    }

    applyButton.disabled = false;
    const sessionNote = proposal.session && (proposal.session.targetMinutes || proposal.session.note)
      ? `<p class="muted">Session: ${proposal.session.targetMinutes ? 'Target ' + proposal.session.targetMinutes + ' min. ' : ''}${html(proposal.session.note || '')}</p>`
      : '';

    box.innerHTML = `
      <div class="item">
        <div class="top"><strong>Validated proposal</strong><span class="pill good">Safe to apply</span></div>
        <p class="muted">${html(proposal.summary)}</p>
        ${sessionNote}
      </div>
      ${proposal.changes.map(change => `
        <div class="item">
          <strong>${html(change.exerciseName)}</strong>
          <p class="muted">Action: ${html(change.action)}${change.replacementName ? ' → ' + html(change.replacementName) : ''}${change.sets ? ' • Sets ' + change.sets : ''}${change.reps ? ' • Reps ' + html(change.reps) : ''}${change.rest ? ' • Rest ' + html(change.rest) : ''}</p>
          ${change.note ? `<p class="small">${html(change.note)}</p>` : ''}
        </div>
      `).join('')}
    `;
  }

  function setStatus(message) {
    const status = document.getElementById('phase6Status');
    if (status) status.textContent = message;
  }

  async function generateProposal() {
    try {
      ensurePanel();
      const text = await callClaudeForProposal();
      const parsed = extractJson(text);
      const validated = validateProposal(parsed);
      phaseState.lastProposal = validated;
      phaseState.lastError = null;
      saveState();
      setStatus(`Structured proposal ready at ${nowLabel()}. Review it, then apply if it looks right.`);
      renderProposal();
    } catch (error) {
      phaseState.lastError = error.message;
      saveState();
      setStatus(`Structured update failed: ${error.message}`);
      renderProposal();
    }
  }

  function applyProposal() {
    try {
      const proposal = phaseState.lastProposal;
      if (!proposal) return;
      const session = getSessionSafe();

      if (proposal.session) {
        if (proposal.session.targetMinutes) session.targetMinutes = proposal.session.targetMinutes;
        if (proposal.session.note) session.note = `${session.note || ''}\nAI structured update: ${proposal.session.note}`.trim();
      }

      proposal.changes.forEach(change => {
        const exercise = session.exercises.find(ex => ex.name === change.exerciseName);
        if (!exercise) return;

        if (change.action === 'reduce_sets' || change.action === 'increase_sets') exercise.sets = change.sets;
        if (change.action === 'change_reps' && change.reps) exercise.reps = change.reps;
        if (change.action === 'change_rest' && change.rest) exercise.rest = change.rest;
        if (change.action === 'make_optional') exercise.why = `${exercise.why} Optional today if time or recovery is low.`;
        if (change.note) exercise.cue = `${exercise.cue || ''} ${change.note}`.trim();

        if (change.action === 'swap_exercise' && change.replacementName) {
          const replacement = (exercise.options || []).find(option => option.name === change.replacementName);
          if (replacement) {
            exercise.name = replacement.name;
            exercise.group = replacement.group || exercise.group;
            exercise.cue = `${replacement.cue || exercise.cue} ${change.note || ''}`.trim();
            exercise.changed = true;
          }
        }

        exercise.changed = true;
      });

      session.adjusted = true;
      session.status = session.status === 'Not started' ? 'AI adjusted' : session.status;
      session.lastAltered = new Date().toISOString();

      if (typeof mark === 'function') mark('Adjusted');
      if (typeof coachNote === 'function') coachNote('Structured AI Update', proposal.summary, false);
      if (typeof save === 'function') save();
      if (typeof pushToCloud === 'function') pushToCloud().catch(() => {});

      phaseState.lastApplied = new Date().toISOString();
      saveState();
      setStatus(`Structured update applied at ${nowLabel()}. FORGE kept the split intact and only applied validated changes.`);
      renderProposal();
    } catch (error) {
      phaseState.lastError = error.message;
      saveState();
      setStatus(`Apply failed: ${error.message}`);
    }
  }

  function clearProposal() {
    phaseState.lastProposal = null;
    saveState();
    setStatus('Structured proposal cleared.');
    renderProposal();
  }

  function boot() {
    const panel = ensurePanel();
    if (!panel) return;
    renderProposal();
    if (phaseState.lastProposal) setStatus('Previous structured proposal is still available.');
    console.info('FORGE Phase 6 loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// FORGE Phase 9 loader. Kept separate so the Daily Mission Command can be maintained independently.
(() => {
  if (document.getElementById('forgePhase9DailyMissionScript')) return;
  const script = document.createElement('script');
  script.id = 'forgePhase9DailyMissionScript';
  script.src = './forge_phase9_daily_mission.js?v=9.0.0';
  script.defer = true;
  document.body.appendChild(script);
})();
