import { percentile, zScore } from "../growth/percentile";
import type { Indicator, Sex } from "../growth/who";

/** Ekran ve paylaşımda hesaplanamayan persentili koru. */
export function percentileLabel(sex: Sex, indicator: Indicator, ageMonths: number, value: number): string {
  const z = zScore(sex, indicator, ageMonths, value);
  return z == null ? "hesaplanamadı" : `P${percentile(z)}`;
}
