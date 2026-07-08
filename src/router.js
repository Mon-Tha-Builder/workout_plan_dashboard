import { signal } from '@preact/signals';

function readHash() {
  const h = location.hash.replace(/^#/, '');
  return h || '/today';
}

export const currentRoute = signal(readHash());

window.addEventListener('hashchange', () => {
  currentRoute.value = readHash();
});

export function navigate(path) {
  if (location.hash.replace(/^#/, '') === path) {
    currentRoute.value = path;
    return;
  }
  location.hash = path;
}

export const ROUTES = [
  { path: '/today', label: 'Today' },
  { path: '/plan', label: 'Plan' },
  { path: '/train', label: 'Train' },
  { path: '/progress', label: 'Progress' },
  { path: '/recovery', label: 'Recovery' },
  { path: '/library', label: 'Library' },
  { path: '/settings', label: 'Settings' }
];
