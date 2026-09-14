import { describe, expect, it } from "vitest";
import { ageWindow, observedWakeSpans, predictWindow } from "../features/sleep/sleepWindow";
import { computeStock } from "../features/milk/milk";
import { percentile, valueAtZ, zScore } from "../features/growth/percentile";
import { scoreEpds } from "../features/mother/epds";
import { targetMonth } from "../features/milestones/milestones";
import type { BabyEvent } from "../db/types";

const ev = (p: Partial<BabyEvent> & { type: BabyEvent["type"]; start: number }): BabyEvent =>
  ({ id: Math.random().toString(36).slice(2), createdAt: 0, updatedAt: 0, ...p });
const H = 3600_000, M = 60_000;

describe("uyku penceresi", () => {
  it("yaş bandı", () => {
    expect(ageWindow(1).minMin).toBe(30);
    expect(ageWindow(3).maxMin).toBe(120);
    expect(ageWindow(11).minMin).toBe(180);
  });
  it("5 örnekten azsa yaş bandı, çoksa kişisel medyan (banda kırpılmış)", () => {
    const now = Date.now();
    const events: BabyEvent[] = [];
    // 6 uyku, aralarında 70 dk uyanıklık
    for (let i = 0; i < 6; i++) {
      const s = now - (6 - i) * 3 * H;
      events.push(ev({ type: "uyku", start: s, end: s + 110 * M }));
    }
    expect(observedWakeSpans(events).length).toBe(5);
    const p = predictWindow(1, events);
    expect(p.personal).toBe(true);
    expect(p.fromMin).toBeGreaterThanOrEqual(30);
    expect(p.toMin).toBeLessThanOrEqual(105);
    expect(predictWindow(1, events.slice(0, 3)).personal).toBe(false);
  });
});

describe("süt stoku (FIFO)", () => {
  it("anne sütü biberonu en eski sütten düşer", () => {
    const now = Date.now();
    const events = [
      ev({ type: "sagma", start: now - 3 * 86_400_000, amountMl: 100, store: "dolap" }),
      ev({ type: "sagma", start: now - 1 * 86_400_000, amountMl: 80, store: "dondurucu" }),
      ev({ type: "biberon", start: now - H, amountMl: 60, bottleKind: "sut" }),
      ev({ type: "biberon", start: now - H, amountMl: 60, bottleKind: "mama" }), // stoktan düşmez
    ];
    const s = computeStock(events, now);
    expect(s.totalMl).toBe(120);
    expect(s.dolapMl).toBe(40);
    expect(s.dondurucuMl).toBe(80);
    expect(s.warnings.length).toBe(0);
  });
  it("dolapta 4 günü geçen süt uyarır", () => {
    const now = Date.now();
    const s = computeStock([ev({ type: "sagma", start: now - 5 * 86_400_000, amountMl: 50, store: "dolap" })], now);
    expect(s.warnings[0]).toMatch(/4 günü geçti/);
  });
});

describe("WHO persentil", () => {
  it("medyan P50", () => {
    expect(percentile(zScore("kiz", "weight", 1, 4.1873)!)).toBe(50);
    expect(percentile(zScore("erkek", "weight", 6, 7.93)!)).toBe(50);
  });
  it("valueAtZ ve zScore tutarlı", () => {
    const v = valueAtZ("kiz", "length", 3, 1.0)!;
    expect(zScore("kiz", "length", 3, v)!).toBeCloseTo(1.0, 2);
  });
  it("aralık dışı yaşta null", () => {
    expect(zScore("kiz", "weight", 30, 12)).toBeNull();
  });
});

describe("EPDS", () => {
  it("toplam ve kesme", () => {
    expect(scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).level).toBe("dusuk");
    expect(scoreEpds([1, 1, 1, 1, 1, 1, 1, 1, 2, 0]).level).toBe("sinir");
    expect(scoreEpds([2, 2, 2, 2, 2, 2, 1, 0, 0, 0]).level).toBe("yuksek");
  });
  it("10. madde > 0 ise puan ne olursa olsun yüksek", () => {
    const r = scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(r.selfHarm).toBe(true);
    expect(r.level).toBe("yuksek");
  });
});

describe("gelişim hedef ayı", () => {
  it("1 aylık → 2. ay listesi; 2.7 aylık → 4. ay", () => {
    expect(targetMonth(1)).toBe(2);
    expect(targetMonth(2.7)).toBe(4);
    expect(targetMonth(13)).toBe(12);
  });
});
