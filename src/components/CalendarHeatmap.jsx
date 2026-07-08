import { logs, recoveryLogs, sessions, plan } from '../lib/store.js';
import { todayISO, dateKey } from '../lib/models.js';

function statusFor(dateKey, todayKey, planStartKey) {
  if (logs.value.some(l => l.date === dateKey)) return 'trained';
  const recovery = recoveryLogs.value[dateKey];
  if (recovery && recovery.zone === 'red') return 'recovery';
  const session = sessions.value[dateKey];
  if (session && session.status === 'in_progress') return 'partial';
  if (dateKey < todayKey) return planStartKey && dateKey < planStartKey ? 'before' : 'missed';
  return 'open';
}

export function CalendarHeatmap({ pastDays = 27, futureDays = 6 }) {
  const todayKey = todayISO();
  const planStartKey = plan.value ? plan.value.startDate : null;
  const cells = [];
  for (let i = pastDays; i >= -futureDays; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    cells.push({
      key,
      dayNumber: d.getDate(),
      status: statusFor(key, todayKey, planStartKey),
      isToday: key === todayKey,
      isFuture: key > todayKey
    });
  }
  return (
    <div className="calendar">
      {cells.map(c => (
        <div key={c.key} className={`day ${c.isFuture && c.status === 'open' ? 'future' : c.status} ${c.isToday ? 'today-marker' : ''}`}>
          <b>{c.dayNumber}</b>
          {c.isFuture ? 'Open' : c.status === 'trained' ? 'Trained' : c.status === 'recovery' ? 'Recovery' : c.status === 'partial' ? 'Partial' : c.status === 'missed' ? 'Missed' : c.status === 'before' ? '' : 'Open'}
        </div>
      ))}
    </div>
  );
}
