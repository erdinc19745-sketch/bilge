import type { BabyEvent } from "../../db/types";

/**
 * Türkçe serbest cümle → kayıt. Klavye diktesinden (ya da yazarak) gelen metin için.
 *
 * Bu bir yapay zekâ değil, kural tabanlı ayrıştırıcı: bilinen kalıpları (taraf, süre, ml, bez türü,
 * ateş, "X dakika önce"…) yakalar; tanımadığı cümleyi NOT olarak kaydeder, asla uydurmaz.
 * Kullanıcı önizlemeyi ("Anladım: …") onaylamadan hiçbir şey yazılmaz.
 *
 * Örnekler:
 *   "sağdan on beş dakika emdi"        → emzirme sağ, 15 dk, şimdi bitti
 *   "on dakika önce sağdan emdi"       → emzirme sağ, 10 dk önce (süre girilmedi)
 *   "yarım saat önce uyudu"            → uyku 30 dk önce başladı (devam ediyor)
 *   "iki saat önce uyandı"             → devam eden uyku 2 sa önce bitti
 *   "altmış ml içti" / "biberon 80"    → biberon 60 / 80 ml
 *   "kaka yaptı" / "çiş" / "bez değiştirdim" → bez
 *   "otuz yedi virgül sekiz" / "37 8 ateş" / "otuz yedi buçuk derece" → ateş 37.8 / 37.8 / 37.5
 *   "d vitamini verdim" / "demir verdim" / "aşısı oldu" → ilaç
 *   "bitti" / "emzirme bitti"           → devam eden emzirmeyi bitir
 *   "sağa geç" / "sola geçtim"          → devam eden emzirmeyi bitir, öbür tarafı başlat
 *   "mama 60" / "sağma 80"              → biberon mama 60 ml / süt sağma 80 ml
 *   Birden çok komut: "sağdan 15 dakika emdi ve kaka yaptı" → iki kayıt (parseTurkishMulti)
 */

export type Parsed =
  | { kind: "add"; event: Omit<BabyEvent, "id" | "createdAt" | "updatedAt" | "realmId">; label: string }
  | { kind: "sleepStart"; at: number; label: string }
  | { kind: "sleepEnd"; at: number; label: string }
  | { kind: "feedEnd"; at: number; label: string }
  | { kind: "switchSide"; at: number; label: string };

/** Cümleyi "ve", virgül, "sonra", "ayrıca", "bir de" ile böl; her parçayı ayrı ayrıştır. Anlaşılmayan parça atılır (tek parçaysa not olur). */
export function parseTurkishMulti(raw: string): Parsed[] {
  const parts = raw.split(/\s+ve\s+|,\s+|\s+sonra\s+|\s+ayrıca\s+|\s+ayrica\s+|\s+bir de\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) { const p = parseTurkish(raw); return p ? [p] : []; }
  const out: Parsed[] = [];
  for (const p of parts) {
    const r = parseTurkish(p);
    if (r && !(r.kind === "add" && r.event.type === "not")) out.push(r);
  }
  if (out.length) return out;
  const whole = parseTurkish(raw);
  return whole ? [whole] : [];
}

const ONES: Record<string, number> = { sıfır: 0, bir: 1, iki: 2, üç: 3, uç: 3, dört: 4, dort: 4, beş: 5, bes: 5, altı: 6, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kırk: 40, kirk: 40, elli: 50, altmış: 60, altmis: 60, yetmiş: 70, yetmis: 70, seksen: 80, doksan: 90 };

/** Türkçe sayı sözcüklerini rakama çevirir: "on beş" → "15", "yüz yirmi" → "120" */
export function wordsToDigits(text: string): string {
  const toks = text.toLowerCase().split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < toks.length) {
    let val: number | null = null;
    let j = i;
    if (toks[j] === "yüz" || toks[j] === "yuz") { val = 100; j++; }
    else if (ONES[toks[j]] !== undefined && (toks[j + 1] === "yüz" || toks[j + 1] === "yuz")) { val = ONES[toks[j]] * 100; j += 2; }
    if (TENS[toks[j]] !== undefined) { val = (val ?? 0) + TENS[toks[j]]; j++; }
    if (ONES[toks[j]] !== undefined) { val = (val ?? 0) + ONES[toks[j]]; j++; }
    if (val !== null && j > i) { out.push(String(val)); i = j; }
    else { out.push(toks[i]); i++; }
  }
  return out.join(" ");
}

/** Ondalıklar: "37 virgül 8" → "37.8", "37 buçuk" → "37.5", "37 8 ateş" → "37.8", "bir buçuk saat" → "1.5 saat" */
function normalizeDecimals(t: string): string {
  t = t.replace(/(\d+)\s*(virgül|virgul|nokta)\s*(\d+)/g, "$1.$3");
  t = t.replace(/(\d+),(\d+)/g, "$1.$2"); // dikte "37,8" yazar
  t = t.replace(/(\d+)\s*buçuk|(\d+)\s*bucuk/g, (_m, a, b) => `${Number(a ?? b) + 0.5}`);
  t = t.replace(/yarım saat|yarim saat/g, "30 dakika");
  t = t.replace(/(\d{2})\s(\d)(?=\s*(ateş|ates|derece))/g, "$1.$2"); // "37 8 ateş"
  return t;
}

/** "X dakika/saat" → dakika (metnin tamamında ilk eşleşme) */
function durationMin(t: string): number | undefined {
  const h = t.match(/(\d+(?:\.\d+)?)\s*saat/);
  const m = t.match(/(\d+)\s*(dakika|dk|dakka)/);
  if (h || m) return (h ? parseFloat(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return undefined;
}

export function parseTurkish(raw: string): Parsed | null {
  let t = normalizeDecimals(wordsToDigits(raw.trim().toLowerCase().replace(/[.!?]+$/g, "")));
  const now = Date.now();

  // --- "X dakika/saat önce": olay zamanını kaydır; süre olarak sayma ---
  let offsetMin = 0;
  const off = t.match(/(\d+(?:\.\d+)?)\s*(dakika|dk|saat)\s*önce|(\d+(?:\.\d+)?)\s*(dakika|dk|saat)\s*evvel/);
  if (off) {
    const n = parseFloat(off[1] ?? off[3]), u = off[2] ?? off[4];
    offsetMin = u === "saat" ? n * 60 : n;
    t = t.replace(off[0], " ");
  }
  const at = now - offsetMin * 60_000;
  const when = offsetMin ? ` (${offsetMin >= 60 ? `${Math.round(offsetMin / 60 * 10) / 10} sa` : `${offsetMin} dk`} önce)` : "";

  // --- ateş ---
  const fever = t.match(/(\d{2}(?:\.\d)?)\s*(derece|ateş|ates|°)/) ?? t.match(/(?:ateş|ates|ateşi|atesi)\s*(\d{2}(?:\.\d)?)/);
  if (fever) {
    const v = parseFloat(fever[1]);
    if (v >= 34 && v <= 43) return { kind: "add", event: { type: "ates", start: at, tempC: v }, label: `Ateş ${v.toFixed(1)} °C${when}` };
  }

  // --- ilaç / aşı ---
  if (/d\s*vitamin/.test(t)) return { kind: "add", event: { type: "ilac", start: at, medName: "D vitamini" }, label: `D vitamini verildi${when}` };
  if (/demir/.test(t)) return { kind: "add", event: { type: "ilac", start: at, medName: "Demir" }, label: `Demir verildi${when}` };
  if (/aşı|asi oldu|aşısı/.test(t)) return { kind: "add", event: { type: "ilac", start: at, medName: "Aşı" }, label: `Aşı yapıldı${when}` };

  // --- devam eden emzirme: bitir / taraf değiştir ---
  if (/(sağa|saga|sola)\s*geç/.test(t)) return { kind: "switchSide", at, label: `Diğer memeye geç${when}` };
  if (/^(bitti|bitir|emzirme bitti|emzirmeyi bitir|bıraktı|birakti|doydu)$/.test(t.trim()) || /emzirme(yi)?\s*bit/.test(t)) return { kind: "feedEnd", at, label: `Emzirme bitti${when}` };

  // --- süt sağma ---
  if (/sağ(dım|dı|ıldı|ma)|sagdim|pompa/.test(t)) {
    const m2 = t.match(/(\d+)\s*(ml|mililitre|cc)/) ?? t.match(/(?:sağma|sagma|pompa)\s*(\d+)/);
    if (m2) {
      const store = /dondurucu/.test(t) ? "dondurucu" : /taze|hemen|verdim/.test(t) ? "taze" : "dolap";
      return { kind: "add", event: { type: "sagma", start: at, amountMl: Number(m2[1]), store }, label: `Süt sağma ${m2[1]} ml → ${store}${when}` };
    }
  }

  // --- biberon ---
  const ml = t.match(/(\d+)\s*(ml|mililitre|cc)/) ?? t.match(/(?:biberon|mama)\s*(\d+)/) ?? t.match(/(\d+)\s*(?:biberon|mama)/);
  if (ml) {
    const amount = Number(ml[1]);
    if (amount > 0 && amount < 500) {
      const kind = /mama|formül|formul/.test(t) ? "mama" : "sut";
      return { kind: "add", event: { type: "biberon", start: at, amountMl: amount, bottleKind: kind }, label: `Biberon ${amount} ml ${kind === "mama" ? "mama" : "anne sütü"}${when}` };
    }
  }

  // --- bez ---
  const kaka = /kaka|büyük|buyuk/.test(t);
  const islak = /çiş|cis|ıslak|islak|pipi|küçük|kucuk/.test(t);
  if (kaka || islak || /bez|altını|altini/.test(t)) {
    const d = (kaka && islak) || /ikisi/.test(t) ? "ikisi" : kaka ? "kaka" : "islak";
    return { kind: "add", event: { type: "bez", start: at, diaper: d }, label: `${d === "ikisi" ? "Bez · çiş + kaka" : d === "kaka" ? "Bez · kaka" : "Bez · çiş"}${when}` };
  }

  // --- emzirme ---
  const side = /sağ|sag/.test(t) ? "sag" : /sol/.test(t) ? "sol" : undefined;
  if (side || /emz|emdi|meme/.test(t)) {
    const dur = durationMin(t);
    const sideLabel = side === "sol" ? "Sol" : side === "sag" ? "Sağ" : "?";
    if (dur) {
      // "sağdan 15 dk emdi" → şimdi (ya da X önce) bitti, 15 dk sürdü
      return { kind: "add", event: { type: "emzirme", start: at - dur * 60_000, end: at, side }, label: `Emzirme · ${sideLabel} · ${dur} dk${when}` };
    }
    if (offsetMin) {
      // "10 dk önce sağdan emdi" → süre bilinmiyor; kayıt o anda, Şerit'ten süre eklenebilir
      return { kind: "add", event: { type: "emzirme", start: at, end: at, side }, label: `Emzirme · ${sideLabel}${when} · süre girilmedi` };
    }
    if (side) return { kind: "add", event: { type: "emzirme", start: now, side }, label: `Emzirme · ${sideLabel} başladı` };
  }

  // --- uyku ---
  if (/uyan/.test(t)) return { kind: "sleepEnd", at, label: `Uyandı${when}` };
  if (/uyu|uyku/.test(t)) {
    const dur = durationMin(t);
    if (dur && !offsetMin) return { kind: "add", event: { type: "uyku", start: now - dur * 60_000, end: now }, label: `Uyku · ${dur} dk` };
    if (dur && offsetMin) return { kind: "add", event: { type: "uyku", start: at - dur * 60_000, end: at }, label: `Uyku · ${dur} dk${when}` };
    return { kind: "sleepStart", at, label: `Uyku başladı${when}` };
  }

  // --- not ---
  if (raw.trim().length > 3) return { kind: "add", event: { type: "not", start: now, note: raw.trim() }, label: `Not: ${raw.trim()}` };
  return null;
}

/** Yardım metni: neleri anlıyor */
export const PARSER_EXAMPLES = [
  "sağdan on beş dakika emdi",
  "soldan emiyor",
  "bitti",
  "sağa geç",
  "kaka yaptı",
  "uyudu",
  "uyandı",
  "60 ml içti",
  "on dakika önce soldan emdi ve çiş",
  "otuz yedi virgül sekiz derece",
  "d vitamini verdim",
];
