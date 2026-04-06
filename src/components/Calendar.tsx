import { useState, useCallback } from 'react';

import {
  addDays,
  DAY_NAMES,
  formatDate,
  isBefore,
  isSameDay,
  monthName,
} from '@/lib/dates';

import type { BookingMode } from './ModeToggle';

interface CalendarProps {
  mode: BookingMode;
  startDate: Date | null;
  endDate: Date | null;
  onSelectStart: (date: Date) => void;
  onSelectEnd: (date: Date) => void;
  onClear: () => void;
  minDate: Date;
  maxDate: Date;
  unavailableDates?: Set<string>;
}

export default function Calendar({
  mode,
  startDate,
  endDate,
  onSelectStart,
  onSelectEnd,
  onClear,
  minDate,
  maxDate,
  unavailableDates,
}: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const handlePrev = useCallback(() => {
    setViewMonth(prev => {
      const m = prev.month - 1;
      return m < 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: m };
    });
  }, []);

  const handleNext = useCallback(() => {
    setViewMonth(prev => {
      const m = prev.month + 1;
      return m > 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: m };
    });
  }, []);

  const handleDayClick = useCallback(
    (date: Date) => {
      if (mode === 'daycare') {
        // Daycare: single date select. Sunday disabled.
        if (date.getDay() === 0) return;
        onSelectStart(date);
        onSelectEnd(addDays(date, 1));
        return;
      }

      // Boarding: range select
      if (!startDate || (startDate && endDate)) {
        // First click or third click (reset)
        onClear();
        onSelectStart(date);
      } else {
        // Second click — set end date
        if (isBefore(date, startDate)) {
          // Clicked before start — swap
          onSelectEnd(addDays(startDate, 0));
          onSelectStart(date);
        } else if (isSameDay(date, startDate)) {
          // Same day — minimum 1 night
          onSelectEnd(addDays(date, 1));
        } else {
          onSelectEnd(date);
        }
      }
    },
    [mode, startDate, endDate, onSelectStart, onSelectEnd, onClear]
  );

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrev}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft />
        </button>
        <span className="text-base font-semibold">
          {monthName(viewMonth.month)} {viewMonth.year}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          aria-label="Next month"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div
            key={d}
            className="text-center text-xs font-medium text-text-secondary py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {buildMonthDays(viewMonth.year, viewMonth.month).map(
          (day, i) => (
            <DayCell
              key={i}
              day={day}
              mode={mode}
              startDate={startDate}
              endDate={endDate}
              minDate={minDate}
              maxDate={maxDate}
              unavailableDates={unavailableDates}
              onClick={handleDayClick}
            />
          )
        )}
      </div>
    </div>
  );
}

interface DayCellProps {
  day: Date | null;
  mode: BookingMode;
  startDate: Date | null;
  endDate: Date | null;
  minDate: Date;
  maxDate: Date;
  unavailableDates?: Set<string>;
  onClick: (date: Date) => void;
}

function DayCell({
  day,
  mode,
  startDate,
  endDate,
  minDate,
  maxDate,
  unavailableDates,
  onClick,
}: DayCellProps) {
  if (!day) {
    return <div className="h-11" />;
  }

  const dateStr = formatDate(day);
  const isDisabled =
    isBefore(day, minDate) ||
    (!isSameDay(day, maxDate) && day > maxDate) ||
    (mode === 'daycare' && day.getDay() === 0);
  const isUnavailable = unavailableDates?.has(dateStr) ?? false;
  const isStart = startDate && isSameDay(day, startDate);
  const isEnd = endDate && isSameDay(day, endDate);
  const isInRange =
    startDate && endDate && day > startDate && day < endDate;
  const isSelected = isStart || isEnd;

  let className =
    'h-11 flex items-center justify-center text-sm relative transition-colors ';

  if (isDisabled || isUnavailable) {
    className += 'text-gray-300 cursor-default';
    if (isUnavailable) className = className.replace('text-gray-300', 'text-danger/50');
  } else if (isSelected) {
    className += 'bg-bvb-teal text-white font-semibold cursor-pointer';
    if (isStart && endDate && !isSameDay(startDate!, endDate)) {
      className += ' rounded-l-full';
    }
    if (isEnd && startDate && !isSameDay(startDate!, endDate!)) {
      className += ' rounded-r-full';
    }
    if (isStart && isEnd) {
      className += ' rounded-full';
    }
  } else if (isInRange) {
    className += 'bg-bvb-teal/15 text-bvb-teal-d cursor-pointer';
  } else {
    className += 'hover:bg-bvb-teal/10 cursor-pointer';
  }

  return (
    <button
      type="button"
      disabled={isDisabled || isUnavailable}
      onClick={() => !isDisabled && !isUnavailable && onClick(day)}
      className={className}
      aria-label={dateStr}
    >
      {day.getDate()}
    </button>
  );
}

/** Build array of Date|null for a month grid (null = empty cell before day 1) */
function buildMonthDays(
  year: number,
  month: number
): Array<Date | null> {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M12.5 15L7.5 10L12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 15L12.5 10L7.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
