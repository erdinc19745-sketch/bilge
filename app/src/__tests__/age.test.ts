import { describe, expect, it } from "vitest";
import { ageDays, ageMonths } from "../lib/age";

describe("age helpers", () => {
  it.each([
    ["2025-01-01", new Date(2025, 0, 1, 23, 59).getTime(), 0],
    ["2025-01-01", new Date(2025, 0, 31).getTime(), 30],
    ["2025-01-01", new Date(2026, 0, 1).getTime(), 365],
    ["2024-02-29", new Date(2025, 1, 28).getTime(), 365],
    ["2025-01-31", new Date(2025, 1, 28).getTime(), 28],
    ["2025-01-02", new Date(2025, 0, 1).getTime(), -1],
    ["2025-01-01T12:00:00", new Date(2025, 0, 2, 11, 59).getTime(), 0],
    ["2025-01-01T12:00:00", new Date(2025, 0, 2, 12).getTime(), 1],
  ])("preserves completed days and unrounded months for %s at %s", (birth, now, days) => {
    expect(ageDays(birth, now)).toBe(days);
    expect(ageMonths(birth, now)).toBe(days / 30.4375);
  });

  it("preserves NaN for invalid birth dates or reference times", () => {
    expect(ageDays("not-a-date", Date.now())).toBeNaN();
    expect(ageMonths("not-a-date", Date.now())).toBeNaN();
    expect(ageDays("2025-01-01", NaN)).toBeNaN();
    expect(ageMonths("2025-01-01", NaN)).toBeNaN();
  });
});
