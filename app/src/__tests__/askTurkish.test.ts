import { describe, expect, it } from "vitest";
import { answerQuestion, isQuestion } from "../features/log/askTurkish";
import type { BabyEvent } from "../db/types";

const ev = (p: Partial<BabyEvent> & { type: BabyEvent["type"]; start: number }): BabyEvent =>
  ({ id: Math.random().toString(36).slice(2), createdAt: 0, updatedAt: 0, ...p });
const H = 3600_000, M = 60_000;
const now = new Date(2026, 8, 15, 14, 0).getTime();
const events = [
  ev({ type: "emzirme", start: now - 2 * H, end: now - 2 * H + 15 * M, side: "sol" }),
  ev({ type: "bez", start: now - 3 * H, diaper: "islak" }),
  ev({ type: "bez", start: now - 1 * H, diaper: "kaka" }),
  ev({ type: "uyku", start: now - 5 * H, end: now - 3 * H }),
  ev({ type: "ilac", start: now - 4 * H, medName: "D vitamini", by: "anne" }),
];
const baby = { id: "me" as const, name: "Bilge", birthDate: "2026-09-09", sex: "kiz" as const };

describe("soru tespiti", () => {
  it("soru / kayıt ayrımı", () => {
    expect(isQuestion("son beslenme ne zaman")).toBe(true);
    expect(isQuestion("bugün kaç bez?")).toBe(true);
    expect(isQuestion("d vitamini verildi mi")).toBe(true);
    expect(isQuestion("sağdan on beş dakika emdi")).toBe(false);
    expect(isQuestion("d vitamini verdim")).toBe(false);
  });
});

describe("cevaplar", () => {
  const a = (q: string) => answerQuestion(q, { events, baby, now })!;
  it("beslenme", () => {
    expect(a("son beslenme ne zaman")).toContain("12:00");
    expect(a("son beslenme ne zaman")).toContain("sol");
    expect(a("sonraki beslenme ne zaman")).toContain("15:15"); // 12:15 bitiş + 3 sa
    expect(a("sıra hangi memede")).toContain("sağ");
  });
  it("bez ve uyku", () => {
    expect(a("bugün kaç bez")).toContain("1 çiş, 1 kaka");
    expect(a("ne kadar uyudu")).toContain("2 sa 0 dk");
    expect(a("uyuyor mu")).toContain("Hayır");
  });
  it("d vitamini ve yaş", () => {
    expect(a("d vitamini verildi mi")).toContain("Evet");
    expect(a("kaç günlük")).toContain("6 günlük");
  });
  it("bilinmeyen soru null", () => {
    expect(answerQuestion("hava nasıl", { events, baby, now })).toBeNull();
  });
});
