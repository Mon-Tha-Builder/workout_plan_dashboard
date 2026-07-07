import { ROUTES, currentRoute, navigate } from '../router.js';
import { IconToday, IconPlan, IconTrain, IconProgress, IconRecovery, IconLibrary, IconSettings } from './icons.jsx';

const ICONS = {
  '/today': IconToday, '/plan': IconPlan, '/train': IconTrain, '/progress': IconProgress,
  '/recovery': IconRecovery, '/library': IconLibrary, '/settings': IconSettings
};

function NavLink({ path, label, className }) {
  const Icon = ICONS[path];
  const active = currentRoute.value === path;
  return (
    <a
      href={`#${path}`}
      className={`${className}${active ? ' active' : ''}`}
      onClick={e => { e.preventDefault(); navigate(path); }}
    >
      {Icon && <Icon />}
      <span>{label}</span>
    </a>
  );
}

export function AppShell({ children }) {
  return (
    <>
      <header className="topbar">
        <a href="#/today" className="brand" onClick={e => { e.preventDefault(); navigate('/today'); }}>
          <span className="brand-mark" />
          FORGE
        </a>
        <nav>
          {ROUTES.map(r => <NavLink key={r.path} path={r.path} label={r.label} className="" />)}
        </nav>
      </header>
      <main className="shell">{children}</main>
      <nav className="tabbar">
        {ROUTES.map(r => <NavLink key={r.path} path={r.path} label={r.label} className="" />)}
      </nav>
    </>
  );
}
