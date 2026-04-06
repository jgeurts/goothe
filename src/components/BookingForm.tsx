import { useState, useEffect, useMemo, useCallback } from "react";

import type { GooseClient } from "@/api/client";
import {
  createReservation,
  searchPetAddons,
  searchPrimary,
  updateReservation,
} from "@/api/booking";
import type {
  Offer,
  OrderSummary,
  PetProfile,
  SearchResult,
  ServiceType,
  UserProfile,
} from "@/api/types";
import { addDays, formatDate, hasWeekdayNights, hasWeekendNights, nightCount } from "@/lib/dates";
import { defaultCheckInTime, defaultCheckOutTime } from "@/lib/defaults";
import { estimatePrice, type PriceEstimate } from "@/lib/pricing";

import Calendar from "./Calendar";
import type { BookingMode } from "./ModeToggle";
import ModeToggle from "./ModeToggle";
import PriceSummary from "./PriceSummary";
import TimeSelect, { generateTimeSlots } from "./TimeSelect";
import UpcomingBookings from "./UpcomingBookings";

interface BookingFormProps {
  client: GooseClient;
  userProfile: UserProfile;
  pets: PetProfile[];
  serviceTypes: ServiceType[];
  offers: Offer[];
  orders: OrderSummary[];
  checkInPeriods: Array<{
    dayOfWeek: string[];
    start: string;
    end: string;
  }>;
  checkOutPeriods: Array<{
    dayOfWeek: string[];
    start: string;
    end: string;
  }>;
  leadTimeMinutes: number;
  maxBookingWindowMinutes: number;
}

export default function BookingForm({
  client,
  userProfile,
  pets,
  serviceTypes,
  offers,
  orders,
  checkInPeriods,
  checkOutPeriods,
  leadTimeMinutes,
  maxBookingWindowMinutes,
}: BookingFormProps) {
  const [mode, setMode] = useState<BookingMode>("boarding");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pmPickup, setPmPickup] = useState(true);
  const [checkInTime, setCheckInTime] = useState("07:30");
  const [checkOutTime, setCheckOutTime] = useState("18:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<SearchResult | null>(null);
  const [petSearchData, setPetSearchData] = useState<SearchResult | null>(null);

  const pet = pets[0]; // Primary pet

  // Resolve service type IDs
  const boardingType = serviceTypes.find((s) => s.name === "boarding");
  const daycareType = serviceTypes.find((s) => s.name === "daycare");

  // Resolve offer IDs
  const boardingServiceTypeId = boardingType?.id;
  const daycareServiceTypeId = daycareType?.id;

  const boardingOffer = offers.find(
    (o) => o.locationServiceTypeId === boardingServiceTypeId && o.type === "PRIMARY",
  );
  const daycareOffers = offers.filter(
    (o) => o.locationServiceTypeId === daycareServiceTypeId && o.type === "PRIMARY",
  );
  const pmPickupOffers = offers.filter(
    (o) => o.locationServiceTypeId === boardingServiceTypeId && o.type === "PET",
  );

  // Calendar bounds
  const minDate = useMemo(() => {
    return addDays(new Date(), Math.ceil(leadTimeMinutes / (60 * 24)));
  }, [leadTimeMinutes]);

  const maxDate = useMemo(() => {
    return addDays(new Date(), Math.floor(maxBookingWindowMinutes / (60 * 24)));
  }, [maxBookingWindowMinutes]);

  // Update check-in/out times when dates change
  useEffect(() => {
    if (startDate) {
      const dow = startDate.getDay();
      setCheckInTime(defaultCheckInTime(dow));
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      const dow = endDate.getDay();
      setCheckOutTime(defaultCheckOutTime(dow, pmPickup));
    }
  }, [endDate, pmPickup]);

  // Build time dropdown options based on day-of-week
  const checkInOptions = useMemo(() => {
    if (!startDate) return ["07:00", "07:30"];
    const dow = startDate.getDay();
    const period = findPeriodForDay(checkInPeriods, dow);
    return period ? generateTimeSlots(period.start, period.end) : ["07:00", "07:30"];
  }, [startDate, checkInPeriods]);

  const checkOutOptions = useMemo(() => {
    if (!endDate) return ["16:00", "16:30", "17:00", "17:30", "18:00"];
    const dow = endDate.getDay();
    // Filter periods to AM or PM based on pickup toggle
    const allPeriods = checkOutPeriods.filter((p) =>
      p.dayOfWeek.some((d) => dayNameToNumber(d) === dow),
    );
    if (pmPickup) {
      // PM periods (start >= 12:00)
      const pmPeriod = allPeriods.find((p) => parseInt(p.start) >= 12);
      return pmPeriod
        ? generateTimeSlots(pmPeriod.start, pmPeriod.end)
        : ["16:00", "16:30", "17:00", "17:30", "18:00"];
    } else {
      // AM periods (start < 12:00)
      const amPeriod = allPeriods.find((p) => parseInt(p.start) < 12);
      return amPeriod
        ? generateTimeSlots(amPeriod.start, amPeriod.end)
        : ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"];
    }
  }, [endDate, pmPickup, checkOutPeriods]);

  // Search for availability when dates are selected (boarding)
  useEffect(() => {
    if (mode !== "boarding" || !startDate || !endDate || !pet) return;
    const serviceType = "boarding";
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    setSearchData(null);
    setPetSearchData(null);

    Promise.all([
      searchPrimary(client, serviceType, start, end, pet),
      searchPetAddons(client, serviceType, start, end, pet),
    ])
      .then(([primary, petAddons]) => {
        setSearchData(primary);
        setPetSearchData(petAddons);
      })
      .catch(() => {
        // Search failed — we'll show estimated prices
      });
  }, [mode, startDate, endDate, pet, client]);

  // Price estimate
  const priceEstimate: PriceEstimate | null = useMemo(() => {
    if (mode !== "boarding" || !startDate || !endDate) return null;

    const nights = nightCount(startDate, endDate);
    if (nights <= 0) return null;

    // Use search data rate if available, fallback to $70
    const rate =
      searchData?.results[0]?.availabilityGroups[0]?.availabilities[0]?.price?.rate ?? 70;

    // PM pickup rates from search or fallback
    let pmMonFriRate = 45.5;
    let pmSatSunRate = 38.0;

    if (petSearchData?.results) {
      for (const r of petSearchData.results) {
        const name = r.offer.name.toLowerCase();
        const offerRate = r.availabilityGroups[0]?.availabilities[0]?.price?.rate;
        if (offerRate) {
          if (name.includes("mon-fri") || name.includes("mon-fre")) {
            pmMonFriRate = offerRate;
          } else if (name.includes("sat") && name.includes("sun")) {
            pmSatSunRate = offerRate;
          }
        }
      }
    }

    return estimatePrice({
      nights,
      rate,
      pmPickup,
      hasWeekdayNights: hasWeekdayNights(startDate, endDate),
      hasWeekendNights: hasWeekendNights(startDate, endDate),
      pmMonFriRate,
      pmSatSunRate,
    });
  }, [mode, startDate, endDate, pmPickup, searchData, petSearchData]);

  // Daycare rate
  const daycareRate = useMemo(() => {
    if (mode !== "daycare" || !startDate) return undefined;
    const dow = startDate.getDay();
    // Saturday = different offer/rate
    return dow === 6 ? 38.0 : 45.5;
  }, [mode, startDate]);

  const handleClear = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setError(null);
  }, []);

  // Submit booking
  const handleSubmit = useCallback(async () => {
    if (!startDate || !endDate || !pet) return;

    setSubmitting(true);
    setError(null);

    try {
      const serviceType = mode === "boarding" ? "boarding" : "daycare";
      let primaryOfferId: string;
      const petOfferIds: Array<{ id: string }> = [];

      if (mode === "boarding") {
        primaryOfferId = boardingOffer?.id ?? "";

        // Add PM pickup offers if enabled
        if (pmPickup) {
          if (hasWeekdayNights(startDate, endDate)) {
            const monFri = pmPickupOffers.find(
              (o) =>
                o.name.toLowerCase().includes("mon-fri") ||
                o.name.toLowerCase().includes("mon-fre"),
            );
            if (monFri) petOfferIds.push({ id: monFri.id });
          }
          if (hasWeekendNights(startDate, endDate)) {
            const satSun = pmPickupOffers.find(
              (o) =>
                o.name.toLowerCase().includes("sat") &&
                o.name.toLowerCase().includes("sun") &&
                !o.name.toLowerCase().includes("2nd"),
            );
            if (satSun) petOfferIds.push({ id: satSun.id });
          }
        }
      } else {
        // Daycare — pick offer based on day of week
        const dow = startDate.getDay();
        const daycareOffer =
          dow === 6
            ? daycareOffers.find((o) => o.name.toLowerCase().includes("saturday"))
            : daycareOffers.find(
                (o) => o.name.toLowerCase().includes("mon") && o.name.toLowerCase().includes("fri"),
              );
        primaryOfferId = daycareOffer?.id ?? "";
      }

      if (!primaryOfferId) {
        setError("Could not find the right offer. Please try again.");
        setSubmitting(false);
        return;
      }

      // 1. Create reservation
      const reservation = await createReservation(client, {
        serviceType,
        pet,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        primaryOfferId,
        petOfferIds,
      });

      const orderId = reservation.order.id;

      // 2. Update with times + contact info
      await updateReservation(client, orderId, {
        checkInTime,
        checkOutTime,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        phone: userProfile.phone,
        email: userProfile.email,
        street: userProfile.streetAddress,
        street2: userProfile.streetAddress2 ?? "",
        city: userProfile.city,
        state: userProfile.state,
        zip: userProfile.zipCode,
      });

      // 3. Redirect to Goose payment page
      window.location.href = "https://booking.goose.pet/bay-view-bark/booking/payment";
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        setError("Session expired. Please log in and try again.");
      } else {
        setError(err?.message ?? "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }, [
    startDate,
    endDate,
    pet,
    mode,
    pmPickup,
    checkInTime,
    checkOutTime,
    client,
    userProfile,
    boardingOffer,
    pmPickupOffers,
    daycareOffers,
  ]);

  const nights = startDate && endDate ? nightCount(startDate, endDate) : 0;
  const hasSelection = mode === "boarding" ? nights > 0 : !!startDate;

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <ModeToggle
        mode={mode}
        onChange={(m) => {
          setMode(m);
          handleClear();
        }}
      />

      {/* Calendar */}
      <Calendar
        mode={mode}
        startDate={startDate}
        endDate={endDate}
        onSelectStart={setStartDate}
        onSelectEnd={setEndDate}
        onClear={handleClear}
        minDate={minDate}
        maxDate={maxDate}
      />

      {/* Selection summary */}
      {hasSelection && mode === "boarding" && (
        <p className="text-sm text-text-secondary text-center">
          {nights} night{nights !== 1 ? "s" : ""} selected
        </p>
      )}

      {/* Time selects + PM pickup (boarding only) */}
      {hasSelection && (
        <div className="space-y-3 bg-surface-alt rounded-xl p-4">
          <TimeSelect
            label="Check-in"
            value={checkInTime}
            options={checkInOptions}
            onChange={setCheckInTime}
          />
          <TimeSelect
            label="Check-out"
            value={checkOutTime}
            options={checkOutOptions}
            onChange={setCheckOutTime}
          />
          {mode === "boarding" && (
            <label className="flex items-center gap-3 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={pmPickup}
                onChange={(e) => setPmPickup(e.target.checked)}
                className="w-5 h-5 rounded border-border text-bvb-teal focus:ring-bvb-teal"
              />
              <span className="text-sm font-medium">PM Pickup</span>
            </label>
          )}
        </div>
      )}

      {/* Price summary */}
      {hasSelection && (
        <PriceSummary estimate={priceEstimate} mode={mode} daycareRate={daycareRate} />
      )}

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Submit button */}
      {hasSelection && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-bvb-teal hover:bg-bvb-teal-d active:bg-bvb-teal-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? "Creating Booking..." : "Book & Pay"}
        </button>
      )}

      {/* Upcoming bookings */}
      <UpcomingBookings orders={orders} />
    </div>
  );
}

/** Find the time period matching a day-of-week number */
function findPeriodForDay(
  periods: Array<{ dayOfWeek: string[]; start: string; end: string }>,
  dow: number,
) {
  return periods.find((p) => p.dayOfWeek.some((d) => dayNameToNumber(d) === dow));
}

function dayNameToNumber(name: string): number {
  const map: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  return map[name.toUpperCase()] ?? -1;
}
