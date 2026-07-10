import { useState } from 'preact/hooks';
import {
  profile, updateProfile, cloudSettings, setCloudSettings, resetAllData,
  exportDataBlob, importDataFromObject, sessions, recoveryLogs, ratings, coachNotes
} from '../lib/store.js';
import { EQUIPMENT_DEFS, todayISO } from '../lib/models.js';
import { cloudConfigured, checkWorkerHealth } from '../lib/workerClient.js';
import { pushToCloud, fetchCloudSnapshot, applyCloudSnapshot } from '../lib/cloudSync.js';
import { askCoach, validateProposal, applyProposal, buildCoachContext } from '../lib/coach.js';
import { buildAvaContext } from '../lib/avaExport.js';
import { Pill } from '../components/Pill.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';

const GOALS = [['muscle', 'Build Muscle'], ['strength', 'Get Stronger'], ['athleticism', 'Athleticism'], ['consistency', 'Consistency'], ['health', 'General Health']];
const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const MOTIVATION = [['strict', 'Strict'], ['calm', 'Calm'], ['hype', 'Hype'], ['technical', 'Technical']];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Settings() {
  const p = profile.value;
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState('');

  function toggleDay(d) {
    const days = p.preferredDays.includes(d) ? p.preferredDays.filter(x => x !== d) : [...p.preferredDays, d].sort();
    if (days.length) updateProfile({ preferredDays: days });
  }
  function toggleEquip(key) {
    updateProfile({ equipment: { ...p.equipment, [key]: !p.equipment[key] } });
  }

  function doExport() {
    const blob = exportDataBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forge_backup_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function doImport(e) {
    const file = e.currentTarget.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importDataFromObject(JSON.parse(reader.result));
      } catch {
        setImportError('Import failed. Use a FORGE JSON backup file.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      <section className="hero hud-frame">
        <div className="hero-eyebrow">Settings</div>
        <h1 style={{ fontSize: 34 }}>Configure Forge</h1>
      </section>

      <div className="desk-grid">
        <div className="section-gap">
          <div className="card">
            <h2>Profile</h2>
            <div className="form-grid mt">
              <div className="field">
                <label>Name</label>
                <input type="text" value={p.name} onInput={e => updateProfile({ name: e.currentTarget.value })} />
              </div>
              <div className="field">
                <label>Goal</label>
                <select value={p.goal} onChange={e => updateProfile({ goal: e.currentTarget.value })}>
                  {GOALS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Experience</label>
                  <select value={p.experienceLevel} onChange={e => updateProfile({ experienceLevel: e.currentTarget.value })}>
                    {LEVELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Units</label>
                  <select value={p.unitPreference} onChange={e => updateProfile({ unitPreference: e.currentTarget.value })}>
                    <option value="lb">Pounds (lb)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Session Length (min)</label>
                  <input type="number" value={p.preferredWorkoutDuration} onInput={e => updateProfile({ preferredWorkoutDuration: Number(e.currentTarget.value) || 30 })} />
                </div>
                <div className="field">
                  <label>Motivation Style</label>
                  <select value={p.motivationStyle} onChange={e => updateProfile({ motivationStyle: e.currentTarget.value })}>
                    {MOTIVATION.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Preferred Training Days</label>
                <div className="tab-row">
                  {WEEKDAYS.map((label, d) => (
                    <button type="button" key={d} className={`chip${p.preferredDays.includes(d) ? ' active' : ''}`} onClick={() => toggleDay(d)}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Injuries / Limitations</label>
                <textarea value={p.limitations} onInput={e => updateProfile({ limitations: e.currentTarget.value })} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Equipment</h2>
            <div className="toggle-grid mt">
              {EQUIPMENT_DEFS.map(([key, label]) => (
                <label key={key} className="toggle">
                  <input type="checkbox" checked={p.equipment[key]} onChange={() => toggleEquip(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Data</h2>
            <p className="muted mt">Your data lives on this device. Export a backup, import one, or start over.</p>
            <div className="btns">
              <button className="btn" onClick={doExport}>Export Backup</button>
              <label className="btn" style={{ cursor: 'pointer' }}>
                Import Backup
                <input type="file" accept="application/json" className="hide" onChange={doImport} />
              </label>
              <button className="btn danger" onClick={() => setResetOpen(true)}>Reset All Data</button>
            </div>
            {importError && <p className="small mt" style={{ color: 'var(--bad)' }}>{importError}</p>}
          </div>
        </div>

        <div className="section-gap">
          <CloudPanel />
          <AvaPanel />
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset All FORGE Data?"
        body="This clears your plan, logs, recovery history, and PRs on this device. Export a backup first if you want to keep it."
        confirmLabel="Reset Everything"
        danger
        onConfirm={() => { resetAllData(); setResetOpen(false); }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}

function CloudPanel() {
  const c = cloudSettings.value;
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pullConfirm, setPullConfirm] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [proposal, setProposal] = useState(null);
  const [proposalStatus, setProposalStatus] = useState('');

  async function testConnection() {
    setBusy(true);
    try {
      const health = await checkWorkerHealth();
      setStatus(`Reachable. DB ${health.dbReady ? 'ready' : 'missing'}, token ${health.syncTokenReady ? 'ready' : 'missing'}, Claude ${health.anthropicReady ? 'ready' : 'missing'}.`);
    } catch (e) {
      setStatus(`Not reachable: ${e.message}`);
    }
    setBusy(false);
  }

  async function doPush() {
    setBusy(true);
    try {
      await pushToCloud();
      setStatus('Pushed to cloud successfully.');
    } catch (e) {
      setStatus(`Push failed: ${e.message}`);
    }
    setBusy(false);
  }

  async function doPull() {
    setBusy(true);
    try {
      const snap = await fetchCloudSnapshot();
      if (!snap) { setStatus('No cloud snapshot found yet.'); setBusy(false); return; }
      setPullConfirm(snap);
    } catch (e) {
      setStatus(`Pull failed: ${e.message}`);
    }
    setBusy(false);
  }

  async function askCoachNow() {
    if (!prompt.trim()) return;
    setBusy(true);
    setResponse('Asking Claude Coach...');
    try {
      const today = todayISO();
      const context = buildCoachContext({
        session: sessions.value[today], recovery: recoveryLogs.value[today],
        ratings: ratings.value, profile: profile.value, lastSummary: coachNotes.value[coachNotes.value.length - 1]
      });
      const text = await askCoach('settings_chat', prompt, context);
      setResponse(text || 'Claude returned an empty response.');
    } catch (e) {
      setResponse(`Failed: ${e.message}`);
    }
    setBusy(false);
  }

  async function generateProposal() {
    const today = todayISO();
    const session = sessions.value[today];
    if (!session) { setProposalStatus('Load today\'s workout first (visit Today or Train).'); return; }
    setBusy(true);
    setProposalStatus('Asking Claude for a safe workout update...');
    setProposal(null);
    try {
      const context = buildCoachContext({
        session, recovery: recoveryLogs.value[today], ratings: ratings.value,
        profile: profile.value, lastSummary: coachNotes.value[coachNotes.value.length - 1]
      });
      const instructions = 'Return ONLY JSON: {"summary": string, "changes": [{"exerciseName": string, "action": "adjust_sets"|"adjust_reps"|"adjust_rest"|"swap_exercise"|"note", "sets"?: number, "reps"?: string, "restSeconds"?: number, "replacementName"?: string, "note"?: string}]}. Only reference exerciseName/replacementName values already present in context.currentSession. Keep changes minor and safe.';
      const raw = await askCoach('structured_workout_update', instructions, context);
      const validated = validateProposal(raw, session);
      setProposal(validated);
      setProposalStatus(validated.changes.length ? 'Review the proposal below before applying.' : 'Claude had no changes to propose.');
    } catch (e) {
      setProposalStatus(`Failed: ${e.message}`);
    }
    setBusy(false);
  }

  function applyProposalNow() {
    applyProposal(todayISO(), proposal);
    setProposalStatus('Applied to today\'s session.');
    setProposal(null);
  }

  const connected = cloudConfigured();

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h2>Cloud & AI Connection</h2>
          <Pill tone={connected ? 'good' : 'warn'}>{connected ? 'Configured' : 'Not Connected'}</Pill>
        </div>
        <p className="muted">{connected ? 'Cloud sync and Claude coaching are active.' : 'The FORGE Worker is live. Add your Owner ID and Sync Token below to connect — cloud sync and Claude coaching activate automatically once they’re set.'}</p>
        <div className="form-grid mt">
          <div className="field"><label>Worker URL</label><input type="text" placeholder="https://your-worker.workers.dev" value={c.workerUrl} onInput={e => setCloudSettings({ workerUrl: e.currentTarget.value })} /></div>
          <div className="field-row">
            <div className="field"><label>Owner ID</label><input type="text" value={c.ownerId} onInput={e => setCloudSettings({ ownerId: e.currentTarget.value })} /></div>
            <div className="field"><label>Device ID</label><input type="text" value={c.deviceId} onInput={e => setCloudSettings({ deviceId: e.currentTarget.value })} /></div>
          </div>
          <div className="field"><label>Sync Token</label><input type="password" value={c.token} onInput={e => setCloudSettings({ token: e.currentTarget.value })} /></div>
        </div>
        <div className="btns">
          <button className="btn" disabled={busy} onClick={testConnection}>Test Connection</button>
          <button className="btn" disabled={busy || !connected} onClick={doPush}>Push To Cloud</button>
          <button className="btn" disabled={busy || !connected} onClick={doPull}>Pull From Cloud</button>
        </div>
        {status && <p className="small mt">{status}</p>}
        {c.lastSync && <p className="small">Last sync: {new Date(c.lastSync).toLocaleString()}</p>}
      </div>

      {connected && (
        <div className="card">
          <h2>Ask Claude Coach</h2>
          <div className="field mt">
            <textarea placeholder="e.g. Summarize this week and tell me what to focus on next." value={prompt} onInput={e => setPrompt(e.currentTarget.value)} />
          </div>
          <button className="btn primary block mt" disabled={busy} onClick={askCoachNow}>Ask</button>
          {response && <p className="muted mt">{response}</p>}
        </div>
      )}

      {connected && (
        <div className="card">
          <h2>Structured Workout Update</h2>
          <p className="muted mt">Claude proposes specific changes to today's session — sets, reps, rest, or a swap. FORGE validates every change before anything is applied; nothing changes until you approve it.</p>
          <button className="btn block mt" disabled={busy} onClick={generateProposal}>Generate Safe Update</button>
          {proposalStatus && <p className="small mt">{proposalStatus}</p>}
          {proposal && !!proposal.changes.length && (
            <div className="mt">
              <p className="muted">{proposal.summary}</p>
              <div className="list mt">
                {proposal.changes.map((c, i) => (
                  <div className="item" key={i}>
                    <strong>{c.exerciseName}</strong>
                    <p className="small mt">
                      {c.action === 'adjust_sets' && `Sets → ${c.sets}`}
                      {c.action === 'adjust_reps' && `Reps → ${c.reps}`}
                      {c.action === 'adjust_rest' && `Rest → ${c.restSeconds}s`}
                      {c.action === 'swap_exercise' && `Swap → ${c.replacementName}`}
                      {c.action === 'note' && `Note: ${c.note}`}
                    </p>
                  </div>
                ))}
              </div>
              <button className="btn good block mt" onClick={applyProposalNow}>Apply Validated Update</button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pullConfirm}
        title="Overwrite Local Data With Cloud Version?"
        body={pullConfirm ? `This replaces everything on this device with the cloud snapshot from ${new Date(pullConfirm.updatedAt).toLocaleString()}. Export a local backup first if unsure.` : ''}
        confirmLabel="Overwrite With Cloud"
        danger
        onConfirm={() => { applyCloudSnapshot(pullConfirm.payload, pullConfirm.updatedAt); setPullConfirm(null); }}
        onCancel={() => setPullConfirm(null)}
      />
    </>
  );
}

function AvaPanel() {
  const [preview, setPreview] = useState(null);
  return (
    <div className="card">
      <h2>Ava Integration</h2>
      <p className="muted mt">
        FORGE can eventually share your workout schedule, completion history, recovery status, and consistency
        context with Ava. Any future connection requires your explicit permission, and Ava can never edit FORGE
        data without your approval — this section is a readiness layer only, not a live connection.
      </p>
      <button className="btn ghost block mt" onClick={() => setPreview(preview ? null : buildAvaContext())}>
        {preview ? 'Hide' : 'Preview'} What Ava Would See
      </button>
      {preview && (
        <pre className="small mt" style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', background: 'var(--bg-elevated)', padding: 12, borderRadius: 4, border: '1px solid var(--line)' }}>
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}
