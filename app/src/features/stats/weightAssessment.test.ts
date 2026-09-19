import { describe, expect, it } from "vitest";
import { weightAssessment } from "./weightAssessment";

describe("birth weight assessment", () => {
  it.each([
    [3, 3800, "iyi"], [5, 3680, "izle"], [5, 3560, "dikkat"],
    [14, 3680, "dikkat"], [14, 3920, "dikkat"], [14, 4040, "iyi"],
    [20, 3880, "dikkat"], [20, 4120, undefined],
    [5, 3720, "iyi"], [5, 3600, "izle"], [14, 4000, "iyi"],
  ])("day %i, %i g → %s", (day, grams, status) => {
    expect(weightAssessment(4000, grams, day)?.status).toBe(status);
  });
  it("includes the measurement day in the delayed recovery warning", () => {
    expect(weightAssessment(4000, 3880, 20)?.note).toBe("20. günde hâlâ doğum kilosunun altında — hekime söyle");
  });
  it("keeps the greater than 10% warning first", () => {
    expect(weightAssessment(4000, 3560, 14)?.note).toContain("%10'undan fazla");
  });
  it("defers to growth rate without birth weight or after recovery beyond day 14", () => {
    expect(weightAssessment(undefined, 4000, 5)).toBeNull();
    expect(weightAssessment(4000, 4000, 20)).toBeNull();
  });
});
