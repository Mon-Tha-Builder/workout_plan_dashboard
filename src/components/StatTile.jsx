export function StatTile({ label, value, accent = false }) {
  return (
    <div className={`stat${accent ? ' accent' : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
