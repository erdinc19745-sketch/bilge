import { differenceInHours } from "date-fns";
import { describe, expect, it } from "vitest";
import { birthInstant } from "./birthInstant";

describe("local birth instant", () => {
  it("uses the supplied local time", () => {
    expect(birthInstant("2026-09-20", "13:45")).toEqual(new Date(2026, 8, 20, 13, 45));
  });
  it.each([undefined, "", "00:00"])("uses midnight for %s", (time) => {
    expect(birthInstant("2026-09-20", time)).toEqual(new Date(2026, 8, 20));
  });
  it("preserves the date across the midnight boundary", () => {
    const birth = birthInstant("2026-09-20", "23:30");
    expect(differenceInHours(new Date(2026, 8, 21, 0, 30), birth)).toBe(1);
    expect(new Date(birth.getTime() + 72 * 3600_000)).toEqual(new Date(2026, 8, 23, 23, 30));
  });
  it.each([23, 24, 47, 48])("preserves discharge age at %i hours", (hours) => {
    const birth = birthInstant("2026-09-20", "23:30");
    expect(differenceInHours(new Date(2026, 8, 20, 23 + hours, 30), birth)).toBe(hours);
  });
});
