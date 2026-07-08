const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconToday() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7L12 16l-5 3 1-5.7-4-4 5.5-.8z" />
    </svg>
  );
}
export function IconPlan() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  );
}
export function IconTrain() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M4 12h2M18 12h2M6 8v8M18 8v8M8.5 12h7" strokeWidth="2" />
    </svg>
  );
}
export function IconProgress() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}
export function IconRecovery() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M12 20s-7-4.4-9-9.2C1.6 6.9 4 4 7 4c2 0 3.7 1.2 5 3 1.3-1.8 3-3 5-3 3 0 5.4 2.9 4 6.8C19 15.6 12 20 12 20z" />
    </svg>
  );
}
export function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <path d="M5 4.5h4.5a2 2 0 012 2V20a1.5 1.5 0 00-1.5-1.5H5zM19 4.5h-4.5a2 2 0 00-2 2V20a1.5 1.5 0 011.5-1.5H19z" />
    </svg>
  );
}
export function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.14-1.4l2-1.5-2-3.4-2.3.9a7 7 0 00-2.4-1.4L14 3h-4l-.16 2.2a7 7 0 00-2.4 1.4l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .5.05.9.14 1.4l-2 1.5 2 3.4 2.3-.9c.7.6 1.5 1.1 2.4 1.4L10 21h4l.16-2.2c.9-.3 1.7-.8 2.4-1.4l2.3.9 2-3.4-2-1.5c.1-.5.14-.9.14-1.4z" />
    </svg>
  );
}
