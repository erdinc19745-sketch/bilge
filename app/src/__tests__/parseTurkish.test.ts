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

describe("parseTurkishMulti + yeni komutlar", async () => {
  const { parseTurkishMulti } = await import("../features/log/parseTurkish");
  it("iki komut tek cümlede", () => {
    const r = parseTurkishMulti("sağdan on beş dakika emdi ve kaka yaptı");
    expect(r.map((p) => p.kind)).toEqual(["add", "add"]);
    expect(r[0].kind === "add" && r[0].event.type).toBe("emzirme");
    expect(r[1].kind === "add" && r[1].event.diaper).toBe("kaka");
  });
  it("virgülle ayrılmış, ondalık virgül bozulmaz", () => {
    expect(parseTurkishMulti("çiş, uyudu").length).toBe(2);
    const f = parseTurkishMulti("37,8 derece");
    expect(f.length).toBe(1); expect(f[0].kind === "add" && f[0].event.tempC).toBe(37.8);
  });
  it("bitti / sağa geç / mama / sağma", () => {
    expect(parseTurkishMulti("bitti")[0].kind).toBe("feedEnd");
    expect(parseTurkishMulti("sağa geç")[0].kind).toBe("switchSide");
    const m = parseTurkishMulti("mama 60")[0]; expect(m.kind === "add" && m.event.bottleKind).toBe("mama");
    const s = parseTurkishMulti("sağma 80")[0]; expect(s.kind === "add" && s.event.type).toBe("sagma");
  });
  it("anlaşılmayan parça atılır, tek parça not olur", () => {
    expect(parseTurkishMulti("kaka yaptı ve bilmemne").length).toBe(1);
    const n = parseTurkishMulti("bugün çok neşeliydi")[0]; expect(n.kind === "add" && n.event.type).toBe("not");
  });
});
