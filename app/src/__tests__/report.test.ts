import { describe, expect, it } from "vitest";
import { percentileLabel } from "../features/report/percentileLabel";

describe("rapor persentili", () => {
  it.each([-1, 30])("veri aralığı dışındaki yaşta (%s ay) hesaplanamadı gösterir", (age) => {
    expect(percentileLabel("kiz", "weight", age, 12)).toBe("hesaplanamadı");
  });

  it("hesaplanabilen medyan ölçümü P50 gösterir", () => {
    expect(percentileLabel("kiz", "weight", 1, 4.1873)).toBe("P50");
  });
});
