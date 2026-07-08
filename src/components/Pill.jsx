export function Pill({ children, tone = '' }) {
  return <span className={`pill${tone ? ' ' + tone : ''}`}>{children}</span>;
}

export function Tag({ children, tone = '' }) {
  return <span className={`tag${tone ? ' ' + tone : ''}`}>{children}</span>;
}
