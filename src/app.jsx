import { useEffect } from 'preact/hooks';
import { profile, initStore, migrationNotice } from './lib/store.js';
import { currentRoute, navigate } from './router.js';
import { AppShell } from './components/AppShell.jsx';
import { Onboarding } from './pages/Onboarding.jsx';
import { Today } from './pages/Today.jsx';
import { Plan } from './pages/Plan.jsx';
import { Train } from './pages/Train.jsx';
import { Progress } from './pages/Progress.jsx';
import { Recovery } from './pages/Recovery.jsx';
import { Library } from './pages/Library.jsx';
import { Settings } from './pages/Settings.jsx';

const PAGES = {
  '/today': Today,
  '/plan': Plan,
  '/train': Train,
  '/progress': Progress,
  '/recovery': Recovery,
  '/library': Library,
  '/settings': Settings
};

export function App() {
  useEffect(() => { initStore(); }, []);

  if (!profile.value.onboarded || currentRoute.value === '/onboarding') {
    return <Onboarding />;
  }

  const Page = PAGES[currentRoute.value] || Today;
  if (!PAGES[currentRoute.value]) navigate('/today');

  return (
    <AppShell>
      {migrationNotice.value && (
        <div className="card" style={{ borderColor: 'var(--ember)', marginBottom: 10 }}>
          <p className="small" style={{ color: 'var(--ember-hi)' }}>{migrationNotice.value}</p>
        </div>
      )}
      <Page />
    </AppShell>
  );
}
