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

/* ---- Bulanık eşleme: dikte hataları ("emsirdi", "kaga", "uyuttu") ve bölünmüş ekler ("sağ dan") ----
 * Kısa kökler (≤3 harf: sağ, sol, çiş) tam aranır; 4+ harfli köklerde bir harf hatası (ekleme/silme/değişme) affedilir.
 * Kök eşleşmesi sözcüğün BAŞINDA aranır: "emzir" → "emzirdim", "emsirdi" ✓, ama "meme" "memnun"u yakalamaz (4 harf, 1 hata olur… bu yüzden
 * riskli kökler listeye alınmadı). */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // harf yer değiştirme
  }
  return d[a.length][b.length];
}
/** Metinde köklerden biri geçiyor mu. "~kök": bir harf hatası affedilir (yalnız 4+ harf); düz kök: tam önek ("kaka" → "kadar"ı yakalamasın) */
export function has(t: string, stems: string[]): boolean {
  const toks = t.split(/\s+/);
  return stems.some((s) => {
    const fuzzy = s.startsWith("~"), k = fuzzy ? s.slice(1) : s;
    return toks.some((w) => w.startsWith(k) || (fuzzy && k.length >= 4 && (editDistance(w.slice(0, k.length), k) <= 1 || editDistance(w.slice(0, k.length + 1), k) <= 1)));
  });
}
/** Dikte kaynaklı bölünmeler: "sağ dan" → "sağdan", "de vitamini" → "d vitamini", "on beş" zaten sayıya çevrildi */
function joinSplits(t: string): string {
  return t
    .replace(/(^|\s)(sağ|sag|sol)\s+(dan|den|a|e|ı|i|u|ü)(?=\s|$)/g, "$1$2$3")
    .replace(/\bde\s+vitamin/g, "d vitamin")
    .replace(/\bd\s+vit\b/g, "d vitamin");
}

/** "X dakika/saat" → dakika (metnin tamamında ilk eşleşme) */
function durationMin(t: string): number | undefined {
  const h = t.match(/(\d+(?:\.\d+)?)\s*saat/);
  const m = t.match(/(\d+)\s*(dakika|dk|dakka)/);
  if (h || m) return (h ? parseFloat(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return undefined;
}

export function parseTurkish(raw: string): Parsed | null {
  let t = joinSplits(normalizeDecimals(wordsToDigits(raw.trim().toLowerCase().replace(/[.!?]+$/g, ""))));
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
  if (/d\s*vitamin/.test(t) || has(t, ["~dvitamin"])) return { kind: "add", event: { type: "ilac", start: at, medName: "D vitamini" }, label: `D vitamini verildi${when}` };
  if (has(t, ["demir"])) return { kind: "add", event: { type: "ilac", start: at, medName: "Demir" }, label: `Demir verildi${when}` };
  if (/aşı|asi oldu|aşısı/.test(t)) return { kind: "add", event: { type: "ilac", start: at, medName: "Aşı" }, label: `Aşı yapıldı${when}` };

  // --- belirti ---
  {
    const SYM: [string[], string][] = [[["~kustu", "kusma", "~kusuyor"], "kusma"], [["ishal"], "ishal"], [["kabız"], "kabızlık"], [["döküntü", "dokuntu", "kızarıklık"], "döküntü"], [["öksür", "oksur"], "öksürük"], [["burnu", "burun ak", "hapşır"], "burun akıntısı"], [["gaz sancı", "gazı var", "gaz "], "gaz sancısı"], [["huzursuz"], "huzursuzluk"], [["az emiyor", "az emdi", "emmiyor"], "az emme"], [["pişik", "pisik"], "pişik"], [["çapak", "capak"], "göz çapağı"]];
    const found = SYM.filter(([ks]) => ks.some((k) => (k.includes(" ") ? t.includes(k) : has(t, [k])))).map(([, v]) => v);
    if (found.length) return { kind: "add", event: { type: "belirti", start: at, symptoms: found }, label: `Belirti: ${found.join(", ")}${when}` };
  }
  // --- aktivite ---
  if (has(t, ["banyo", "~yıkadı", "~yikadi"])) return { kind: "add", event: { type: "aktivite", start: at, activity: "banyo" }, label: `Banyo${when}` };
  if (/karın üstü|karin ustu|tummy/.test(t)) { const d = durationMin(t) ?? 3; return { kind: "add", event: { type: "aktivite", start: at - d * 60_000, end: at, activity: "karin" }, label: `Karın üstü ${d} dk${when}` }; }
  if (has(t, ["dışarı", "disari", "gezdi", "parka", "yürüyüş"])) return { kind: "add", event: { type: "aktivite", start: at, activity: "disari" }, label: `Dışarı çıkıldı${when}` };

  // --- devam eden emzirme: bitir / taraf değiştir ---
  if (/(sağa|saga|sola)\s*geç/.test(t) || /(diğer|öbür|obur) meme|taraf değiş/.test(t)) return { kind: "switchSide", at, label: `Diğer memeye geç${when}` };
  if (/^(bitti|bitir|bıraktı|birakti|doydu|kes|kestim|tamam bitti)$/.test(t.trim()) || /emzirme(yi)?\s*bit/.test(t) || (has(t, ["bitti", "bitir", "~bırak", "~birak", "doydu"]) && !has(t, ["uyu", "uyan"]) && durationMin(t) === undefined)) return { kind: "feedEnd", at, label: `Emzirme bitti${when}` };

  // --- süt sağma ---
  if (/sağ(dım|dı|ıldı|ma)|sagdim/.test(t) || has(t, ["~pompa", "~sağma", "~sagma"])) {
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
  const kaka = has(t, ["kaka", "~büyük", "~buyuk", "~dışkı"]);
  const islak = has(t, ["çiş", "cis", "~ıslak", "~islak", "pipi", "~küçük", "~kucuk", "~işedi", "~isedi"]);
  if (kaka || islak || has(t, ["bez", "~altını", "~altini"])) {
    const d = (kaka && islak) || /ikisi/.test(t) ? "ikisi" : kaka ? "kaka" : "islak";
    return { kind: "add", event: { type: "bez", start: at, diaper: d }, label: `${d === "ikisi" ? "Bez · çiş + kaka" : d === "kaka" ? "Bez · kaka" : "Bez · çiş"}${when}` };
  }

  // --- emzirme ---
  const side = /\bsağ|\bsag/.test(t) ? "sag" : /\bsol/.test(t) ? "sol" : undefined;
  if (side || has(t, ["emz", "emdi", "emmi", "meme", "~emiyor", "~emzir"])) {
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
  if (has(t, ["uyan", "~kalktı", "~kalkti"])) return { kind: "sleepEnd", at, label: `Uyandı${when}` };
  if (has(t, ["uyu", "uyku", "~yattı", "~yatti", "~daldı"])) {
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
