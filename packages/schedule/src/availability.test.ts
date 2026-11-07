// @ts-expect-error - bun:test types are provided by the Bun runtime, not tsc
import { describe, expect, test } from "bun:test";

import { getBookableSlots, getStartOptions } from "./availability";
import { formatWeekRange } from "./schedule-utils";

const MONDAY = "2026-11-09";
const SUNDAY = "2026-11-15";
const before = { iso: "2026-11-07", minutes: 8 * 60 };

describe("getBookableSlots", () => {
  test("leaves out classes on a weekday", () => {
    expect(getBookableSlots(MONDAY, [], before)).toEqual([
      { startTime: "12:00", endTime: "15:00" },
      { startTime: "17:00", endTime: "19:00" },
    ]);
  });

  test("a weekend is free all day", () => {
    expect(getBookableSlots(SUNDAY, [], before)).toEqual([
      { startTime: "08:00", endTime: "19:00" },
    ]);
  });

  test("leaves out busy events", () => {
    const events = [{ dateISO: SUNDAY, startTime: "10:00", endTime: "11:00" }];
    expect(getBookableSlots(SUNDAY, events, before)).toEqual([
      { startTime: "08:00", endTime: "10:00" },
      { startTime: "11:00", endTime: "19:00" },
    ]);
  });

  test("today keeps an hour's notice and snaps to the half hour", () => {
    const now = { iso: SUNDAY, minutes: 9 * 60 + 40 };
    expect(getBookableSlots(SUNDAY, [], now)).toEqual([{ startTime: "11:00", endTime: "19:00" }]);
  });

  test("past days and days beyond the window have no slots", () => {
    expect(getBookableSlots("2026-11-06", [], before)).toEqual([]);
    expect(getBookableSlots("2027-01-07", [], before)).toEqual([]);
  });
});

describe("getStartOptions", () => {
  test("stops where the meeting would overrun the slot", () => {
    const slots = [{ startTime: "12:00", endTime: "13:30" }];
    expect(getStartOptions(slots, 60)).toEqual(["12:00", "12:30"]);
    expect(getStartOptions(slots, 120)).toEqual([]);
  });
});

test("the week range runs Monday to Sunday", () => {
  expect(formatWeekRange("2026-11-02")).toBe("2 – 8 Nov 2026");
  expect(formatWeekRange("2026-11-30")).toBe("30 Nov – 6 Dec 2026");
});
