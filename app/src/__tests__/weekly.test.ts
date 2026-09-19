import { describe, expect, it } from "vitest";
import type { BabyEvent } from "../db/types";
import { summarize } from "../features/stats/summarize";

const at = (day: number, hour: number) => new Date(2026, 8, day, hour).getTime();
const event = (type: BabyEvent["type"], start: number, end?: number): BabyEvent =>
  ({ id: `${type}-${start}`, type, start, end, createdAt: start, updatedAt: start });

describe("haftalık gün içi süre", () => {
  it("gece yarısını aşan bitmiş uykuyu iki güne böler", () => {
    const days = summarize([event("uyku", at(19, 23), at(20, 2))], at(20, 4), 2);
    expect(days.map((d) => d.sleepMin)).toEqual([60, 120]);
    expect(days.map((d) => d.longestMin)).toEqual([180, 180]);
    expect(days.map((d) => d.nightWakes)).toEqual([0, 1]);
  });

  it("önceki gün başlayan devam eden uykuyu şimdiye kadar sayar", () => {
    const days = summarize([event("uyku", at(19, 23))], at(20, 2), 2);
    expect(days.map((d) => d.sleepMin)).toEqual([60, 120]);
    expect(days.map((d) => d.longestMin)).toEqual([180, 180]);
    expect(days.map((d) => d.nightWakes)).toEqual([0, 0]);
  });

  it("gün dışında kalan ve gelecekte başlayan uykuları saymaz", () => {
    const days = summarize([
      event("uyku", at(19, 22), at(20, 0)),
      event("uyku", at(20, 3)),
    ], at(20, 2), 1);
    expect(days[0].sleepMin).toBe(0);
  });

  it("beslenme ve bez kayıtlarını yalnız başladıkları güne sayar", () => {
    const days = summarize([
      event("emzirme", at(19, 23)),
      event("biberon", at(19, 23)),
      event("bez", at(19, 23)),
    ], at(20, 2), 2);
    expect(days.map((d) => d.feeds)).toEqual([2, 0]);
    expect(days.map((d) => d.diapers)).toEqual([1, 0]);
    expect(days.map((d) => d.sleepMin)).toEqual([0, 0]);
  });
});
