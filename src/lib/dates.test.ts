import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDate,
  hasWeekdayNights,
  hasWeekendNights,
  isBefore,
  isSameDay,
  nightCount,
  parseDate,
} from "./dates";

describe("nightCount", () => {
  it("returns 0 for same day", () => {
    const d = new Date(2026, 3, 10);
    expect(nightCount(d, d)).toBe(0);
  });

  it("returns 1 for consecutive days", () => {
    expect(nightCount(new Date(2026, 3, 10), new Date(2026, 3, 11))).toBe(1);
  });

  it("returns correct count for multi-night stay", () => {
    expect(nightCount(new Date(2026, 3, 10), new Date(2026, 3, 15))).toBe(5);
  });

  it("returns 0 when end is before start", () => {
    expect(nightCount(new Date(2026, 3, 15), new Date(2026, 3, 10))).toBe(0);
  });
});

describe("hasWeekdayNights", () => {
  it("returns true for a Monday-Friday range", () => {
    // 2026-04-06 is Monday, 2026-04-10 is Friday
    expect(hasWeekdayNights(new Date(2026, 3, 6), new Date(2026, 3, 10))).toBe(true);
  });

  it("returns false for Saturday-Sunday only", () => {
    // 2026-04-11 is Saturday, 2026-04-12 is Sunday
    expect(hasWeekdayNights(new Date(2026, 3, 11), new Date(2026, 3, 12))).toBe(false);
  });
});

describe("hasWeekendNights", () => {
  it("returns true when range includes a weekend night", () => {
    // 2026-04-10 is Friday, 2026-04-12 is Sunday — includes Saturday night
    expect(hasWeekendNights(new Date(2026, 3, 10), new Date(2026, 3, 12))).toBe(true);
  });

  it("returns false for Monday-Friday", () => {
    // 2026-04-06 (Mon) to 2026-04-10 (Fri) — no weekend nights
    expect(hasWeekendNights(new Date(2026, 3, 6), new Date(2026, 3, 10))).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 3, 5))).toBe("2026-04-05");
  });

  it("pads single-digit months and days", () => {
    expect(formatDate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("parseDate", () => {
  it("parses YYYY-MM-DD string", () => {
    const d = parseDate("2026-04-05");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // 0-indexed
    expect(d.getDate()).toBe(5);
  });
});

describe("isSameDay", () => {
  it("returns true for same date", () => {
    expect(isSameDay(new Date(2026, 3, 5), new Date(2026, 3, 5))).toBe(true);
  });

  it("returns false for different dates", () => {
    expect(isSameDay(new Date(2026, 3, 5), new Date(2026, 3, 6))).toBe(false);
  });

  it("ignores time component", () => {
    const a = new Date(2026, 3, 5, 8, 0);
    const b = new Date(2026, 3, 5, 18, 30);
    expect(isSameDay(a, b)).toBe(true);
  });
});

describe("addDays", () => {
  it("adds days correctly", () => {
    const result = addDays(new Date(2026, 3, 5), 3);
    expect(result.getDate()).toBe(8);
  });

  it("handles month boundary", () => {
    const result = addDays(new Date(2026, 3, 29), 3);
    expect(result.getMonth()).toBe(4); // May
    expect(result.getDate()).toBe(2);
  });

  it("does not mutate original date", () => {
    const original = new Date(2026, 3, 5);
    addDays(original, 5);
    expect(original.getDate()).toBe(5);
  });
});

describe("isBefore", () => {
  it("returns true when a is before b", () => {
    expect(isBefore(new Date(2026, 3, 5), new Date(2026, 3, 6))).toBe(true);
  });

  it("returns false when a equals b", () => {
    const d = new Date(2026, 3, 5);
    expect(isBefore(d, d)).toBe(false);
  });

  it("returns false when a is after b", () => {
    expect(isBefore(new Date(2026, 3, 6), new Date(2026, 3, 5))).toBe(false);
  });
});
