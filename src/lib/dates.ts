/** Date utility functions */

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

export function nightCount(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function hasWeekdayNights(start: Date, end: Date): boolean {
  const d = new Date(start);
  while (d < end) {
    if (isWeekday(d)) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

export function hasWeekendNights(start: Date, end: Date): boolean {
  const d = new Date(start);
  while (d < end) {
    if (isWeekend(d)) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

/** Get month name */
export function monthName(month: number): string {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][month]!;
}

/** Get short day names */
export const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
