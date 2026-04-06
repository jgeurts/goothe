import { describe, expect, it } from "vitest";

import { estimatePrice } from "./pricing";

describe("estimatePrice", () => {
  it("calculates boarding-only price", () => {
    const result = estimatePrice({
      nights: 3,
      rate: 70,
      pmPickup: false,
      hasWeekdayNights: true,
      hasWeekendNights: false,
      pmMonFriRate: 45.5,
      pmSatSunRate: 38,
    });

    expect(result.boardingSubtotal).toBe(210);
    expect(result.pmPickupMonFri).toBeNull();
    expect(result.pmPickupSatSun).toBeNull();
    expect(result.subtotal).toBe(210);
    expect(result.tax).toBeCloseTo(16.59, 2);
    expect(result.total).toBeCloseTo(226.59, 2);
  });

  it("includes PM pickup Mon-Fri addon", () => {
    const result = estimatePrice({
      nights: 2,
      rate: 70,
      pmPickup: true,
      hasWeekdayNights: true,
      hasWeekendNights: false,
      pmMonFriRate: 45.5,
      pmSatSunRate: 38,
    });

    expect(result.pmPickupMonFri).toBe(45.5);
    expect(result.pmPickupSatSun).toBeNull();
    expect(result.subtotal).toBe(185.5);
  });

  it("includes PM pickup Sat/Sun addon", () => {
    const result = estimatePrice({
      nights: 2,
      rate: 70,
      pmPickup: true,
      hasWeekdayNights: false,
      hasWeekendNights: true,
      pmMonFriRate: 45.5,
      pmSatSunRate: 38,
    });

    expect(result.pmPickupMonFri).toBeNull();
    expect(result.pmPickupSatSun).toBe(38);
    expect(result.subtotal).toBe(178);
  });

  it("includes both PM pickup addons for mixed stays", () => {
    const result = estimatePrice({
      nights: 5,
      rate: 70,
      pmPickup: true,
      hasWeekdayNights: true,
      hasWeekendNights: true,
      pmMonFriRate: 45.5,
      pmSatSunRate: 38,
    });

    expect(result.pmPickupMonFri).toBe(45.5);
    expect(result.pmPickupSatSun).toBe(38);
    expect(result.subtotal).toBe(433.5);
  });

  it("applies 7.9% tax correctly", () => {
    const result = estimatePrice({
      nights: 1,
      rate: 100,
      pmPickup: false,
      hasWeekdayNights: true,
      hasWeekendNights: false,
      pmMonFriRate: 0,
      pmSatSunRate: 0,
    });

    expect(result.tax).toBe(7.9);
    expect(result.total).toBe(107.9);
  });
});
