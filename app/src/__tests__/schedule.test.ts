import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { buildSchedule } from "../features/calendar/schedule";

const dates = (birth: string) => Object.fromEntries(
  buildSchedule(birth).map((item) => [item.key, format(item.date, "yyyy-MM-dd")]),
);

describe("buildSchedule regression", () => {
  it("keeps every key unique and dates in nondecreasing order", () => {
    const items = buildSchedule("2026-09-09");
    expect(items).toHaveLength(36);
    expect(new Set(items.map((item) => item.key)).size).toBe(36);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].date.getTime()).toBeGreaterThanOrEqual(items[i - 1].date.getTime());
    }
  });

  it("preserves explicit dates for all doses, screenings and follow-ups", () => {
    expect(dates("2026-09-09")).toEqual({
      hepb1: "2026-09-09", izlem1: "2026-09-09", izlem2: "2026-09-11",
      topuk: "2026-09-13", izlem3: "2026-09-24", dvit: "2026-09-24",
      kalca: "2026-10-09", izlem4: "2026-10-20",
      izlem5: "2026-11-09", bcg: "2026-11-09", altili1: "2026-11-09", kpa1: "2026-11-09",
      izlem6: "2026-12-09",
      izlem7: "2027-01-09", demir: "2027-01-09", altili2: "2027-01-09", kpa2: "2027-01-09",
      izlem8: "2027-03-09", altili3: "2027-03-09", opa1: "2027-03-09",
      izlem9: "2027-06-09", "kkk-ek": "2027-06-09",
      izlem12: "2027-09-09", kkk1: "2027-09-09", sucicegi: "2027-09-09", kpa3: "2027-09-09",
      izlem18: "2028-03-09", altili4: "2028-03-09", opa2: "2028-03-09", hepa1: "2028-03-09",
      izlem24: "2028-09-09", hepa2: "2028-09-09",
      kkk2: "2030-09-09", sucicegi2: "2030-09-09", dabt4: "2030-09-09",
      td13: "2039-09-09",
    });
  });

  it.each([
    ["2023-01-31", "2023-02-15", "2023-03-02", "2023-03-13"],
    ["2024-01-31", "2024-02-15", "2024-03-01", "2024-03-12"],
  ])("keeps day offsets across February for birth %s", (birth, day15, day30, day41) => {
    expect(dates(birth)).toMatchObject({ izlem3: day15, kalca: day30, izlem4: day41 });
    expect(dates(birth)).toMatchObject({
      izlem5: birth.startsWith("2023") ? "2023-03-31" : "2024-03-31",
      izlem6: birth.startsWith("2023") ? "2023-04-30" : "2024-04-30",
    });
  });

  // No one-month entry exists: the two-month visit exercises February clamping.
  it.each([
    ["2022-12-31", "2023-02-28"],
    ["2023-12-31", "2024-02-29"],
  ])("clamps month-end birth %s to %s", (birth, february) => {
    expect(dates(birth)).toMatchObject({ izlem5: february, bcg: february, altili1: february, kpa1: february });
  });

  it("preserves leap-day birth anniversaries and day-based follow-ups", () => {
    expect(dates("2024-02-29")).toMatchObject({
      izlem3: "2024-03-15", izlem4: "2024-04-10", izlem5: "2024-04-29",
      izlem12: "2025-02-28", izlem24: "2026-02-28", sucicegi2: "2028-02-29", td13: "2037-02-28",
    });
  });

  it("keeps follow-up kinds and day windows", () => {
    const items = buildSchedule("2026-09-09");
    expect(items.find((item) => item.key === "izlem3")).toMatchObject({ kind: "izlem", windowDays: 2 });
    expect(items.find((item) => item.key === "izlem4")).toMatchObject({ kind: "izlem", windowDays: 5 });
  });
});
