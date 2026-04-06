import { TAX_RATE } from "./defaults";

/** Client-side price estimation */

export interface PriceEstimate {
  boardingRate: number;
  nights: number;
  boardingSubtotal: number;
  pmPickupMonFri: number | null;
  pmPickupSatSun: number | null;
  subtotal: number;
  tax: number;
  total: number;
}

export function estimatePrice(opts: {
  nights: number;
  rate: number;
  pmPickup: boolean;
  hasWeekdayNights: boolean;
  hasWeekendNights: boolean;
  pmMonFriRate: number;
  pmSatSunRate: number;
}): PriceEstimate {
  const boardingSubtotal = opts.nights * opts.rate;

  const pmPickupMonFri = opts.pmPickup && opts.hasWeekdayNights ? opts.pmMonFriRate : null;
  const pmPickupSatSun = opts.pmPickup && opts.hasWeekendNights ? opts.pmSatSunRate : null;

  const subtotal = boardingSubtotal + (pmPickupMonFri ?? 0) + (pmPickupSatSun ?? 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    boardingRate: opts.rate,
    nights: opts.nights,
    boardingSubtotal,
    pmPickupMonFri,
    pmPickupSatSun,
    subtotal,
    tax,
    total,
  };
}
