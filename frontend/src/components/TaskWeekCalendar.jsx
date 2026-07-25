import { useMemo } from 'react';
import { classNames } from '../utils/helpers';

/** Sunday-start week containing refDate */
export function getSunSatWeek(refDate = new Date()) {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const x = new Date(sun);
    x.setDate(sun.getDate() + i);
    days.push({
      date: x.toISOString().slice(0, 10),
      label: x.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: x.getDate(),
      isToday: x.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    });
  }
  return days;
}

export function taskActiveOnDate(task, dateStr) {
  const start = task.startDate ? String(task.startDate).slice(0, 10) : null;
  const end = task.endDate ? String(task.endDate).slice(0, 10) : null;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

export default function TaskWeekCalendar({
  weekDays,
  selectedDate,
  onSelectDate,
  taskDailyDates = [],
  className = '',
}) {
  const days = useMemo(() => weekDays || getSunSatWeek(), [weekDays]);

  return (
    <div className={classNames('card !p-3 min-w-0 overflow-hidden', className)}>
      <p className="text-xs font-semibold text-concrete uppercase tracking-wider mb-3">Week calendar (Sun – Sat)</p>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 min-w-0">
        {days.map((day) => {
          const submitted = taskDailyDates.includes(day.date);
          const selected = selectedDate === day.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={classNames(
                'rounded-lg sm:rounded-xl border px-0.5 py-1.5 sm:py-2 text-center transition-all min-h-[58px] sm:min-h-[72px] flex flex-col items-center justify-center gap-0.5 min-w-0',
                selected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-steel-100 hover:border-primary/30 bg-white',
                day.isToday && !selected && 'border-primary/40',
              )}
            >
              <span className="text-[9px] sm:text-[10px] text-concrete font-medium truncate w-full">{day.label}</span>
              <span className="text-sm sm:text-lg font-bold text-steel">{day.dayNum}</span>
              {submitted && (
                <span className="text-[9px] font-semibold text-success bg-success/10 px-1.5 rounded-full">Done</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
