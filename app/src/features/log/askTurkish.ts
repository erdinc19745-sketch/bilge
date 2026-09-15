import { differenceInDays, parseISO, startOfDay } from "date-fns";
import type { Baby, BabyEvent, Measurement } from "../../db/types";
import { fmtDuration, fmtTime } from "../../lib/time";
import { DEFAULT_RULES } from "../notify/reminders";
import { has } from "./parseTurkish";

/**
 * Verine soru sor (Robin Baby'nin "ask" özelliğinin Türkçe, kural tabanlı, cihaz içi karşılığı).
 * "son beslenme ne zaman?", "bugün kaç bez?", "ne kadar uyudu?", "d vitamini verildi mi?", "sıra hangi memede?"
 * Soru olmayan metin null döner → normal kayıt ayrıştırıcısına gider. Uydurmaz: veri yoksa "kayıt yok" der.
 */
export interface AskCtx { events: BabyEvent[]; baby?: Baby | null; measurements?: Measurement[]; now?: number }

const Q_WORDS = ["ne zaman", "kaç", "ne kadar", "verildi mi", "yaptı mı", "uyuyor mu", "hangi", "nasıl", "var mı", "mı", "mi", "mu", "mü"];
export function isQuestion(raw: string): boolean {
  const t = raw.toLowerCase().trim();
  if (t.endsWith("?")) return true;
  return Q_WORDS.some((w) => (w.length <= 2 ? new RegExp(`\\s${w}$`).test(t) : t.includes(w)));
}

const ago = (t: number, now: number) => `${fmtDuration(now - t)} önce`;
/** Kök (tek sözcük → bulanık has) ya da kalıp (boşluklu → metinde geçiyor mu) */
const hit = (t: string, items: string[]) => items.some((i) => (i.includes(" ") ? t.includes(i) : has(t, [i])));

export function answerQuestion(raw: string, ctx: AskCtx): string | null {
  const t = raw.toLowerCase().replace(/\?/g, " ").trim();
  const now = ctx.now ?? Date.now();
  const ev = [...ctx.events].sort((a, b) => b.start - a.start);
  const day0 = startOfDay(now).getTime();
  const today = ev.filter((e) => e.start >= day0);
  const h24 = ev.filter((e) => e.start >= now - 86_400_000);

  // --- beslenme ---
  const feedish = hit(t, ["besle", "emz", "emdi", "yedi", "yemek", "meme", "biberon", "mama"]);
  const lastFeed = ev.find((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");
  const runningFeed = ev.find((e) => e.type === "emzirme" && e.end == null);
  if (hit(t, ["sonraki", "bir sonraki", "ne zaman ver"]) && feedish) {
    const gap = ctx.baby?.reminders?.feedGapMin ?? DEFAULT_RULES.feedGapMin;
    if (!lastFeed) return "Henüz beslenme kaydı yok; sonraki için tahmin yapamam.";
    const at = (lastFeed.end ?? lastFeed.start) + gap * 60_000;
    return at > now ? `Sonraki beslenme yaklaşık ${fmtTime(at)} (${fmtDuration(at - now)} sonra; kural ${Math.round(gap / 60 * 10) / 10} saat).` : `Beslenme zamanı geldi: son beslenmeden ${ago(lastFeed.end ?? lastFeed.start, now)}.`;
  }
  if (hit(t, ["sıra", "hangi meme", "hangi taraf", "sol mu", "sağ mı"])) {
    if (runningFeed) return `Şu an ${runningFeed.side === "sol" ? "sol" : "sağ"} emiyor (${fmtDuration(now - runningFeed.start)}).`;
    if (lastFeed?.type === "emzirme") return `Son emzirme ${lastFeed.side === "sol" ? "sol" : "sağ"}dan (${fmtTime(lastFeed.start)}); sıra ${lastFeed.side === "sol" ? "sağ" : "sol"}da.`;
    return "Taraf bilgisi olan emzirme kaydı yok.";
  }
  if (feedish && hit(t, ["kaç", "sayı"])) {
    const n = (list: BabyEvent[]) => list.filter((e) => e.type === "emzirme" || e.type === "biberon").length;
    return `Bugün ${n(today)} beslenme (son 24 saatte ${n(h24)}).`;
  }
  if (feedish) {
    if (runningFeed) return `Şu an emiyor: ${runningFeed.side === "sol" ? "sol" : "sağ"}, ${fmtTime(runningFeed.start)}'den beri.`;
    if (!lastFeed) return "Henüz beslenme kaydı yok.";
    const what = lastFeed.type === "biberon" ? `biberon ${lastFeed.amountMl ?? "?"} ml` : `${lastFeed.side === "sol" ? "sol" : "sağ"}${lastFeed.end ? `, ${fmtDuration(lastFeed.end - lastFeed.start)}` : ""}`;
    return `Son beslenme ${fmtTime(lastFeed.start)} — ${what} (${ago(lastFeed.end ?? lastFeed.start, now)}).`;
  }

  // --- bez ---
  if (hit(t, ["bez", "çiş", "cis", "kaka", "işe", "altı"])) {
    const wet = (l: BabyEvent[]) => l.filter((e) => e.type === "bez" && e.diaper !== "kaka").length;
    const poo = (l: BabyEvent[]) => l.filter((e) => e.type === "bez" && e.diaper !== "islak").length;
    const last = ev.find((e) => e.type === "bez");
    const lastPoo = ev.find((e) => e.type === "bez" && e.diaper !== "islak");
    if (hit(t, ["kaç", "sayı"])) return `Bugün ${wet(today)} çiş, ${poo(today)} kaka (son 24 saatte ${wet(h24)} çiş, ${poo(h24)} kaka).`;
    if (hit(t, ["kaka"])) return lastPoo ? `Son kaka ${fmtTime(lastPoo.start)} (${ago(lastPoo.start, now)}); bugün ${poo(today)} kaka.` : "Kaka kaydı yok.";
    return last ? `Son bez ${fmtTime(last.start)} (${last.diaper === "islak" ? "çiş" : last.diaper === "kaka" ? "kaka" : "çiş+kaka"}, ${ago(last.start, now)}); bugün ${wet(today)} çiş, ${poo(today)} kaka.` : "Bez kaydı yok.";
  }

  // --- uyku ---
  if (hit(t, ["uyu", "uyku", "uyan", "yattı"])) {
    const running = ev.find((e) => e.type === "uyku" && e.end == null);
    const lastSleep = ev.find((e) => e.type === "uyku" && e.end != null);
    const sleeps = ev.filter((e) => e.type === "uyku" && e.start < now && (e.end ?? now) > day0);
    const total = sleeps.reduce((s, e) => s + Math.min(e.end ?? now, now) - Math.max(e.start, day0), 0);
    const longest = sleeps.reduce((m, e) => Math.max(m, (e.end ?? now) - e.start), 0);
    if (hit(t, ["uyuyor mu", "uyuyor"])) return running ? `Evet, ${fmtTime(running.start)}'den beri uyuyor (${fmtDuration(now - running.start)}).` : lastSleep?.end ? `Hayır, ${fmtTime(lastSleep.end)}'de uyandı (${ago(lastSleep.end, now)}).` : "Uyku kaydı yok.";
    if (hit(t, ["en uzun"])) return longest ? `Bugünkü en uzun uyku ${fmtDuration(longest)}.` : "Bugün uyku kaydı yok.";
    if (hit(t, ["uyan"])) return lastSleep?.end ? `${fmtTime(lastSleep.end)}'de uyandı (${ago(lastSleep.end, now)}), ${fmtDuration(lastSleep.end - lastSleep.start)} uyumuştu.` : running ? "Hâlâ uyuyor." : "Uyanma kaydı yok.";
    return `Bugün toplam ${fmtDuration(total)} uyku${running ? " (şu an uyuyor)" : ""}${longest ? `, en uzun ${fmtDuration(longest)}` : ""}.`;
  }

  // --- D vitamini / ilaç ---
  if (/d\s*vitamin/.test(t) || hit(t, ["~dvitamin"])) {
    const d = ev.find((e) => e.type === "ilac" && e.medName === "D vitamini");
    if (!d) return "D vitamini kaydı yok.";
    const todayD = d.start >= day0;
    return todayD ? `Evet, bugün ${fmtTime(d.start)}'de verildi${d.by ? ` (${d.by})` : ""}.` : `Bugün verilmedi; son ${fmtTime(d.start)} (${ago(d.start, now)}).`;
  }
  if (hit(t, ["ilaç", "ilac", "doz", "demir", "probiyotik", "antibiyotik"])) {
    const m = ev.find((e) => e.type === "ilac" && e.medName !== "D vitamini");
    return m ? `Son ilaç: ${m.medName}${m.note ? ` ${m.note}` : ""}, ${fmtTime(m.start)} (${ago(m.start, now)})${m.by ? `, ${m.by}` : ""}.` : "İlaç kaydı yok.";
  }

  // --- ateş ---
  if (hit(t, ["ateş", "ates", "derece"])) {
    const f = ev.find((e) => e.type === "ates");
    return f ? `Son ateş ${f.tempC?.toFixed(1)} °C, ${fmtTime(f.start)} (${ago(f.start, now)}).` : "Ateş kaydı yok.";
  }

  // --- kilo / boy ---
  if (hit(t, ["kilo", "tartı", "gram", "boy", "baş çevresi"])) {
    const m = [...(ctx.measurements ?? [])].sort((a, b) => b.at - a.at)[0];
    if (!m) return "Ölçüm kaydı yok (Bakım → Ölçüm).";
    const parts = [m.weightG ? `${(m.weightG / 1000).toFixed(2)} kg` : "", m.lengthCm ? `${m.lengthCm} cm` : "", m.headCm ? `baş ${m.headCm} cm` : ""].filter(Boolean);
    return `Son ölçüm ${new Date(m.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}: ${parts.join(", ")}.`;
  }

  // --- yaş ---
  if (hit(t, ["kaç günlük", "kaç haftalık", "kaç aylık", "yaş"]) && ctx.baby) {
    const d = differenceInDays(now, parseISO(ctx.baby.birthDate));
    return `${ctx.baby.name} ${d} günlük (${Math.floor(d / 7)} hafta ${d % 7} gün).`;
  }

  // --- genel özet ---
  if (hit(t, ["özet", "nasıl geçti", "bugün", "durum"])) {
    const feeds = today.filter((e) => e.type === "emzirme" || e.type === "biberon").length;
    const wet = today.filter((e) => e.type === "bez" && e.diaper !== "kaka").length;
    const poo = today.filter((e) => e.type === "bez" && e.diaper !== "islak").length;
    const sleeps = ev.filter((e) => e.type === "uyku" && (e.end ?? now) > day0);
    const total = sleeps.reduce((s, e) => s + Math.min(e.end ?? now, now) - Math.max(e.start, day0), 0);
    return `Bugün: ${feeds} beslenme, ${wet} çiş, ${poo} kaka, ${fmtDuration(total)} uyku.`;
  }
  return null;
}
