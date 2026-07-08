export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="btns">
          <button className="btn ghost block" onClick={onCancel}>Cancel</button>
          <button className={`btn block ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
