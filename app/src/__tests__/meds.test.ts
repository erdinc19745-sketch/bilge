import { describe, expect, it } from "vitest";
import type { BabyEvent, Medication } from "../db/types";
import { dosesGiven, tooEarly } from "../features/meds/meds";

const med: Medication = {
  id: "course-1", name: "Medicine", dose: "1 dose", intervalH: 12,
  prn: false, startAt: 0, createdAt: 0,
};
const event = (id: string, start: number, extra: Partial<BabyEvent> = {}): BabyEvent => ({
  id, type: "ilac", medId: med.id, start, createdAt: start, updatedAt: start, ...extra,
});

describe("early dose interval", () => {
  it.each([
    [true, 210, true], [true, 240, false],
    [false, 210, false], [false, 180, true],
    [true, 239, true], [false, 204, false], [false, 203, true],
  ])("PRN %s at %i minutes → early %s", (prn, minutes, early) => {
    expect(tooEarly({ ...med, prn, intervalH: 4 }, [event("dose", 0)], minutes * 60_000))
      .toEqual({ early, sinceMin: minutes });
  });
  it("allows the first dose and ignores other medications", () => {
    expect(tooEarly({ ...med, prn: true }, [], 0).early).toBe(false);
    expect(tooEarly(med, [event("other", 0, { medId: "other" })], 0).early).toBe(false);
  });
  it("uses the latest matching dose regardless of event order", () => {
    expect(tooEarly({ ...med, prn: true, intervalH: 4 }, [event("old", 0), event("new", 60_000)], 240 * 60_000).early).toBe(true);
  });
});

describe("course dose count", () => {
  it("returns zero without doses", () => {
    expect(dosesGiven(med, [])).toBe(0);
  });

  it("counts only medication events for the exact course id", () => {
    expect(dosesGiven(med, [
      event("dose", 1),
      event("other-course", 2, { medId: "course-2", medName: med.name }),
      event("legacy", 3, { medId: undefined, medName: med.name }),
      event("note", 4, { type: "not" }),
    ])).toBe(1);
  });

  it("keeps old doses when more than 200 unrelated events intervene", () => {
    const events = [
      event("first-dose", 1), event("second-dose", 2),
      ...Array.from({ length: 250 }, (_, i) => event(`other-${i}`, i + 3, {
        type: i % 2 ? "bez" : "ilac", medId: "course-2",
      })),
      event("latest-dose", 253),
    ];
    expect(dosesGiven(med, events.slice(-200))).toBe(1);
    expect(dosesGiven(med, events)).toBe(3);
    expect(dosesGiven(med, [...events].reverse())).toBe(3);
  });

  it("reflects dose additions and undo deletions", () => {
    const events = [event("first", 1), event("second", 2)];
    expect(dosesGiven(med, events)).toBe(2);
    expect(dosesGiven(med, events.filter((e) => e.id !== "second"))).toBe(1);
  });
});
