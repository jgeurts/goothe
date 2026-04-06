import { describe, expect, it } from "vitest";

import { defaultCheckInTime, defaultCheckOutTime, formatTime } from "./defaults";

describe("defaultCheckInTime", () => {
  it("returns 07:30 for weekdays", () => {
    expect(defaultCheckInTime(1)).toBe("07:30"); // Monday
    expect(defaultCheckInTime(5)).toBe("07:30"); // Friday
  });

  it("returns 09:00 for weekends", () => {
    expect(defaultCheckInTime(0)).toBe("09:00"); // Sunday
    expect(defaultCheckInTime(6)).toBe("09:00"); // Saturday
  });
});

describe("defaultCheckOutTime", () => {
  it("returns PM times when pmPickup is true", () => {
    expect(defaultCheckOutTime(1, true)).toBe("18:00"); // Monday PM
    expect(defaultCheckOutTime(6, true)).toBe("16:30"); // Saturday PM
  });

  it("returns AM times when pmPickup is false", () => {
    expect(defaultCheckOutTime(1, false)).toBe("07:30"); // Monday AM
    expect(defaultCheckOutTime(6, false)).toBe("09:00"); // Saturday AM
  });
});

describe("formatTime", () => {
  it("formats morning times", () => {
    expect(formatTime("07:30")).toBe("7:30am");
    expect(formatTime("09:00")).toBe("9:00am");
  });

  it("formats afternoon times", () => {
    expect(formatTime("13:00")).toBe("1:00pm");
    expect(formatTime("18:00")).toBe("6:00pm");
  });

  it("formats noon", () => {
    expect(formatTime("12:00")).toBe("12:00pm");
  });

  it("formats midnight", () => {
    expect(formatTime("00:00")).toBe("12:00am");
  });
});
