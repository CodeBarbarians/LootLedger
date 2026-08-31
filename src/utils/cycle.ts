import { addMonths, format, getDate, lastDayOfMonth, setDate, subDays, subMonths } from 'date-fns';

export interface CycleBounds {
  start: Date;
  end: Date;
  periodKey: string;
}

function clampToMonth(date: Date, day: number): Date {
  const lastDay = getDate(lastDayOfMonth(date));
  return setDate(date, Math.min(day, lastDay));
}

/**
 * Given "today" and the user's configured cycle start day (1-28), returns the
 * start/end of the budget cycle that contains today, plus a stable key for it.
 */
export function getCycleBoundsForDate(today: Date, cycleStartDay: number): CycleBounds {
  const thisMonthStart = clampToMonth(today, cycleStartDay);

  let start: Date;
  if (getDate(today) >= getDate(thisMonthStart)) {
    start = thisMonthStart;
  } else {
    start = clampToMonth(subMonths(today, 1), cycleStartDay);
  }

  const nextStart = clampToMonth(addMonths(start, 1), cycleStartDay);
  const end = subDays(nextStart, 1);

  return { start, end, periodKey: format(start, 'yyyy-MM-dd') };
}

export function formatPeriodLabel(startIso: string): string {
  return format(new Date(startIso), 'MMMM yyyy');
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
