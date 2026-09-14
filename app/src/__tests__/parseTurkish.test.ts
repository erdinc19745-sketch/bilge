import { describe, expect, it } from "vitest";
import { parseTurkish, wordsToDigits } from "../features/log/parseTurkish";

describe("wordsToDigits", () => {
  it("Türkçe sayı sözcüklerini çevirir", () => {
    expect(wordsToDigits("on beş dakika")).toBe("15 dakika");
    expect(wordsToDigits("yüz yirmi ml")).toBe("120 ml");
    expect(wordsToDigits("altmış")).toBe("60");
  });
});

describe("parseTurkish", () => {
  const cases: [string, string][] = [
    ["sağdan on beş dakika emdi", "Emzirme · Sağ · 15 dk"],
    ["sol meme 10 dakika", "Emzirme · Sol · 10 dk"],
    ["biberon 80", "Biberon 80 ml anne sütü"],
    ["60 ml mama içti", "Biberon 60 ml mama"],
    ["kaka yaptı", "Bez · kaka"],
    ["bez değiştirdim", "Bez · çiş"],
    ["yarım saat önce uyudu", "Uyku başladı (30 dk önce)"],
    ["45 dakika uyudu", "Uyku · 45 dk"],
    ["uyandı", "Uyandı"],
    ["ateşi otuz yedi virgül sekiz", "Ateş 37.8 °C"],
    ["37 8 ateş", "Ateş 37.8 °C"],
    ["otuz yedi buçuk derece", "Ateş 37.5 °C"],
    ["d vitaminini verdim", "D vitamini verildi"],
    ["100 ml sağdım dondurucuya koydum", "Süt sağma 100 ml → dondurucu"],
    ["bugün çok huzursuzdu", "Not: bugün çok huzursuzdu"],
  ];
  for (const [input, label] of cases) {
    it(`"${input}" → ${label}`, () => {
      expect(parseTurkish(input)?.label).toBe(label);
    });
  }
  it("'X dk önce' süreyi değil zamanı kaydırır", () => {
    const r = parseTurkish("on dakika önce sağdan emdi");
    expect(r?.kind).toBe("add");
    if (r?.kind === "add") {
      expect(r.event.type).toBe("emzirme");
      expect(Date.now() - r.event.start).toBeGreaterThan(9 * 60_000);
      expect(r.event.end).toBe(r.event.start); // süre girilmedi
    }
  });
  it("saçma ateş değerini ateş saymaz", () => {
    expect(parseTurkish("12 derece")?.kind).toBe("add");
    expect((parseTurkish("12 derece") as { event: { type: string } }).event.type).toBe("not");
  });
});
