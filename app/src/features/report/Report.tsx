import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInCalendarDays, differenceInDays, format, parseISO, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { db } from "../../db/db";
import type { Baby, BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";
import { buildSchedule } from "../calendar/schedule";
import { percentileLabel } from "./percentileLabel";
import { MILESTONES, targetMonth } from "../milestones/milestones";

/**
 * Aile hekimi raporu: 1 sayfa, yazdırılabilir (PDF) ya da metin olarak paylaşılabilir.
 * Hekimin sorduğu her şey tek yerde: beslenme/uyku/bez ortalamaları, ölçümler + persentil,
 * aşı/izlem, gelişim, ateş/ilaç, notlar ve ailenin soruları.
 */
const QKEY = "bilge.doctorQuestions";

interface Stats { days: number; feeds: number; breast: number; bottle: number; bottleMl: number; pumpedMl: number; wet: number; poo: number; sleepMin: number; longest: number; nightWakes: number; dvitDays: number }

function stats(events: BabyEvent[], days: number): Stats {
  const now = Date.now();
  const from = startOfDay(subDays(now, days - 1)).getTime();
  const ev = events.filter((e) => e.start >= from || (e.end ?? 0) >= from);
  // Ortalama, kayıt olan günlere bölünür (30 günlük pencerede 7 günlük kayıt varsa 7'ye)
  const first = ev.length ? Math.min(...ev.map((e) => e.start)) : now;
  days = Math.max(1, Math.min(days, Math.ceil((now - Math.max(from, startOfDay(first).getTime())) / 86_400_000)));
  const sleeps = ev.filter((e) => e.type === "uyku");
  let sleepMin = 0, longest = 0, nightWakes = 0;
  for (const s of sleeps) {
    const a = Math.max(s.start, from), b = Math.min(s.end ?? now, now);
    sleepMin += Math.max(0, b - a) / 60_000;
    longest = Math.max(longest, ((s.end ?? now) - s.start) / 60_000);
    if (s.end) { const h = new Date(s.end).getHours(); if (h >= 23 || h < 6) nightWakes++; }
  }
  const dvitDays = new Set(ev.filter((e) => e.type === "ilac" && e.medName === "D vitamini").map((e) => startOfDay(e.start).getTime())).size;
  const bottles = ev.filter((e) => e.type === "biberon" && e.start >= from);
  return {
    days,
    feeds: ev.filter((e) => (e.type === "emzirme" || e.type === "biberon") && e.start >= from).length,
    breast: ev.filter((e) => e.type === "emzirme" && e.start >= from).length,
    bottle: bottles.length,
    bottleMl: bottles.reduce((s, e) => s + (e.amountMl ?? 0), 0),
    pumpedMl: ev.filter((e) => e.type === "sagma" && e.start >= from).reduce((s, e) => s + (e.amountMl ?? 0), 0),
    wet: ev.filter((e) => e.type === "bez" && e.start >= from && e.diaper !== "kaka").length,
    poo: ev.filter((e) => e.type === "bez" && e.start >= from && e.diaper !== "islak").length,
    sleepMin, longest, nightWakes, dvitDays,
  };
}

export default function Report({ baby, onClose }: { baby: Baby; onClose: () => void }) {
  const from30 = startOfDay(subDays(Date.now(), 29)).getTime();
  const events = useLiveQuery(() => db.events.where("start").aboveOrEqual(from30).toArray(), [from30]) ?? [];
  const measurements = useLiveQuery(() => db.measurements.orderBy("at").toArray(), []) ?? [];
  const scheduleDone = useLiveQuery(() => db.scheduleDone.toArray(), []) ?? [];
  const milestonesDone = useLiveQuery(() => db.milestones.toArray(), []) ?? [];
  const [questions, setQuestions] = useState(() => { try { return localStorage.getItem(QKEY) ?? ""; } catch { return ""; } });
  useEffect(() => { try { localStorage.setItem(QKEY, questions); } catch { /* */ } }, [questions]);

  const ageDays = differenceInDays(Date.now(), parseISO(baby.birthDate));
  const s7 = stats(events, 7), s30 = stats(events, 30);
  const doneKeys = new Set(scheduleDone.map((d) => d.key));
  const schedule = buildSchedule(baby.birthDate);
  const scheduleDoneList = schedule.filter((i) => doneKeys.has(i.key));
  const upcoming = schedule.filter((i) => !doneKeys.has(i.key) && differenceInCalendarDays(i.date, new Date()) >= -(i.windowDays ?? 0)).slice(0, 4);
  const overdue = schedule.filter((i) => !doneKeys.has(i.key) && differenceInCalendarDays(i.date, new Date()) < -(i.windowDays ?? 0));
  const target = targetMonth(ageDays / 30.4375);
  const msDone = new Set(milestonesDone.map((m) => m.key));
  const msTarget = MILESTONES.filter((m) => m.month <= target);
  const fevers = events.filter((e) => e.type === "ates").sort((a, b) => b.start - a.start);
  const notes = events.filter((e) => e.type === "not").sort((a, b) => b.start - a.start);
  const symptoms = events.filter((e) => e.type === "belirti" && e.start > Date.now() - 7 * 86_400_000).sort((a, b) => b.start - a.start);
  const paleStools = events.filter((e) => e.type === "bez" && e.stoolColor && e.stoolColor <= 3);
  const medEvents = events.filter((e) => e.type === "ilac" && e.medId);
  const medSummary = Object.values(medEvents.reduce((acc, e) => { const k = e.medName ?? "?"; (acc[k] ??= { name: k, n: 0, first: e.start, last: e.start }); acc[k].n++; acc[k].first = Math.min(acc[k].first, e.start); acc[k].last = Math.max(acc[k].last, e.start); return acc; }, {} as Record<string, { name: string; n: number; first: number; last: number }>));
  const per = (d: number, n: number) => (n / d).toFixed(1);

  const asText = () => {
    const L: string[] = [];
    L.push(`${baby.name} — aile hekimi özeti (${format(Date.now(), "d MMM yyyy", { locale: tr })})`);
    L.push(`Doğum: ${format(parseISO(baby.birthDate), "d MMM yyyy", { locale: tr })} · ${ageDays} günlük (${Math.floor(ageDays / 7)} hf ${ageDays % 7} g)`);
    for (const s of [s7, s30]) {
      L.push(`Son ${s.days} gün: günde ${per(s.days, s.feeds)} beslenme (${s.breast} emzirme, ${s.bottle} biberon${s.bottle ? ` ort. ${Math.round(s.bottleMl / s.bottle)} ml` : ""}), ${per(s.days, s.wet)} ıslak, ${per(s.days, s.poo)} kaka, uyku ${fmtDuration((s.sleepMin / s.days) * 60_000)}/gün, en uzun ${fmtDuration(s.longest * 60_000)}, gece uyanma ${per(s.days, s.nightWakes)}, D vit ${s.dvitDays}/${s.days} gün`);
    }
    if (measurements.length) L.push("Ölçümler: " + measurements.map((m) => `${format(m.at, "d MMM", { locale: tr })}: ${[m.weightG ? `${(m.weightG / 1000).toFixed(2)} kg ${percentileLabel(baby.sex, "weight", differenceInDays(m.at, parseISO(baby.birthDate)) / 30.4375, m.weightG / 1000)}` : "", m.lengthCm ? `${m.lengthCm} cm` : "", m.headCm ? `baş ${m.headCm} cm` : ""].filter(Boolean).join(", ")}`).join(" · "));
    if (scheduleDoneList.length) L.push("Yapılan: " + scheduleDoneList.map((i) => i.title).join(", "));
    if (overdue.length) L.push("Gecikmiş: " + overdue.map((i) => i.title).join(", "));
    L.push(`Gelişim (${target}. ay listesi): ${msTarget.filter((m) => msDone.has(m.key)).length}/${msTarget.length} işaretli` + (msTarget.some((m) => !msDone.has(m.key)) ? `; işaretlenmemiş: ${msTarget.filter((m) => !msDone.has(m.key)).map((m) => m.text).join(", ")}` : ""));
    if (symptoms.length) L.push("Belirtiler (7 gün): " + symptoms.map((s) => `${format(s.start, "d MMM HH:mm", { locale: tr })} ${[...(s.symptoms ?? []), s.note].filter(Boolean).join(", ")}`).join(" · "));
    if (fevers.length) L.push("Ateş: " + fevers.slice(0, 6).map((f) => `${format(f.start, "d MMM HH:mm", { locale: tr })} ${f.tempC?.toFixed(1)}°C`).join(", "));
    if (notes.length) L.push("Notlar: " + notes.slice(0, 6).map((n) => `${format(n.start, "d MMM", { locale: tr })} ${n.note}`).join(" · "));
    if (questions.trim()) L.push("Sorularımız: " + questions.trim());
    return L.join("\n");
  };
  const share = () => {
    const text = asText();
    if (navigator.share) navigator.share({ text, title: `${baby.name} — hekim özeti` }).catch(() => undefined);
    else navigator.clipboard?.writeText(text);
  };

  return (
    <div className="report fixed inset-0 z-30 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 pb-8 safe-top">
        <div className="no-print flex items-center justify-between py-3">
          <button className="muted" onClick={onClose}>✕ Kapat</button>
          <div className="flex gap-2">
            <button className="btn text-sm px-3" style={{ minHeight: 40 }} onClick={share}>📨 Metin paylaş</button>
            <button className="btn btn-accent text-sm px-3" style={{ minHeight: 40 }} onClick={() => window.print()}>🖨 Yazdır / PDF</button>
          </div>
        </div>

        <h1 className="text-2xl font-bold">{baby.name} — aile hekimi özeti</h1>
        <p className="muted text-sm">
          Doğum {format(parseISO(baby.birthDate), "d MMMM yyyy", { locale: tr })} · {ageDays} günlük ({Math.floor(ageDays / 7)} hafta {ageDays % 7} gün) · Rapor {format(Date.now(), "d MMMM yyyy", { locale: tr })}
        </p>

        <Sec title="Beslenme, uyku, bez">
          <table className="w-full text-sm">
            <thead className="muted text-xs"><tr><th className="text-left">Günlük ortalama</th><th>Son {s7.days} gün</th><th>Son {s30.days} gün</th></tr></thead>
            <tbody className="tabular-nums text-center">
              <Row l="Beslenme (toplam)" a={per(s7.days, s7.feeds)} b={per(s30.days, s30.feeds)} />
              <Row l="— emzirme / biberon" a={`${per(s7.days, s7.breast)} / ${per(s7.days, s7.bottle)}`} b={`${per(s30.days, s30.breast)} / ${per(s30.days, s30.bottle)}`} />
              <Row l="Biberon ort. miktar" a={s7.bottle ? `${Math.round(s7.bottleMl / s7.bottle)} ml` : "—"} b={s30.bottle ? `${Math.round(s30.bottleMl / s30.bottle)} ml` : "—"} />
              <Row l="Sağılan süt (toplam)" a={s7.pumpedMl ? `${s7.pumpedMl} ml` : "—"} b={s30.pumpedMl ? `${s30.pumpedMl} ml` : "—"} />
              <Row l="Çiş bezi" a={per(s7.days, s7.wet)} b={per(s30.days, s30.wet)} />
              <Row l="Kaka" a={per(s7.days, s7.poo)} b={per(s30.days, s30.poo)} />
              <Row l="Uyku (toplam)" a={fmtDuration((s7.sleepMin / s7.days) * 60_000)} b={fmtDuration((s30.sleepMin / s30.days) * 60_000)} />
              <Row l="En uzun uyku" a={fmtDuration(s7.longest * 60_000)} b={fmtDuration(s30.longest * 60_000)} />
              <Row l="Gece uyanma (23-06)" a={per(s7.days, s7.nightWakes)} b={per(s30.days, s30.nightWakes)} />
              <Row l="D vitamini verilen gün" a={`${s7.dvitDays}/${s7.days}`} b={`${s30.dvitDays}/${s30.days}`} />
            </tbody>
          </table>
        </Sec>

        <Sec title="Ölçümler (WHO persentil)">
          {measurements.length === 0 ? <p className="muted text-sm">Ölçüm girilmemiş.</p> : (
            <table className="w-full text-sm">
              <thead className="muted text-xs"><tr><th className="text-left">Tarih</th><th>Kilo</th><th>Boy</th><th>Baş</th></tr></thead>
              <tbody className="tabular-nums text-center">
                {measurements.map((m) => {
                  const age = differenceInDays(m.at, parseISO(baby.birthDate)) / 30.4375;
                  const p = (ind: "weight" | "length" | "head", v?: number) => { if (!v) return "—"; return `${v} (${percentileLabel(baby.sex, ind, age, v)})`; };
                  return <Row key={m.id} l={format(m.at, "d MMM yyyy", { locale: tr })} a={p("weight", m.weightG ? +(m.weightG / 1000).toFixed(2) : undefined)} b={p("length", m.lengthCm)} c={p("head", m.headCm)} />;
                })}
              </tbody>
            </table>
          )}
        </Sec>

        <Sec title="Aşı, izlem, tarama">
          <p className="text-sm"><b>Yapıldı:</b> {scheduleDoneList.length ? scheduleDoneList.map((i) => i.title).join(" · ") : "işaretlenmemiş"}</p>
          {overdue.length > 0 && <p className="text-sm" style={{ color: "#e8703f" }}><b>Gecikmiş / kontrol:</b> {overdue.map((i) => i.title).join(" · ")}</p>}
          <p className="text-sm"><b>Yaklaşan:</b> {upcoming.map((i) => `${i.title} (${format(i.date, "d MMM", { locale: tr })})`).join(" · ")}</p>
        </Sec>

        <Sec title={`Gelişim (${target}. ay listesi, CDC 2022)`}>
          <p className="text-sm"><b>İşaretli:</b> {msTarget.filter((m) => msDone.has(m.key)).map((m) => m.text).join(" · ") || "—"}</p>
          <p className="text-sm"><b>Henüz değil:</b> {msTarget.filter((m) => !msDone.has(m.key)).map((m) => m.text).join(" · ") || "—"}</p>
        </Sec>

        {symptoms.length > 0 && (
          <Sec title="Belirtiler (7 gün)">
            <ul className="text-sm list-disc pl-4">{symptoms.map((s) => <li key={s.id}>{format(s.start, "d MMM HH:mm", { locale: tr })} — {[...(s.symptoms ?? []), s.note].filter(Boolean).join(", ")}</li>)}</ul>
          </Sec>
        )}

        {medSummary.length > 0 && (
          <Sec title="İlaçlar (30 gün)">
            {medSummary.map((m) => <p key={m.name} className="text-sm">{m.name}: {m.n} doz · {format(m.first, "d MMM", { locale: tr })} – {format(m.last, "d MMM", { locale: tr })}</p>)}
          </Sec>
        )}

        {paleStools.length > 0 && (
          <Sec title="Kaka rengi — dikkat">
            <p className="text-sm" style={{ color: "#e8703f" }}>Soluk/kil rengi kaka kaydı: {paleStools.map((p) => format(p.start, "d MMM HH:mm", { locale: tr })).join(", ")} (kart renk {paleStools.map((p) => p.stoolColor).join("/")}). Biliyer atrezi açısından değerlendirilmesi rica olunur.</p>
          </Sec>
        )}

        {(fevers.length > 0 || notes.length > 0) && (
          <Sec title="Ateş ve notlar (30 gün)">
            {fevers.length > 0 && <p className="text-sm"><b>Ateş:</b> {fevers.map((f) => `${format(f.start, "d MMM HH:mm", { locale: tr })} ${f.tempC?.toFixed(1)} °C`).join(" · ")}</p>}
            {notes.map((n) => <p key={n.id} className="text-sm">{format(n.start, "d MMM", { locale: tr })} — {n.note}</p>)}
          </Sec>
        )}

        <Sec title="Sorularımız">
          <textarea className="input no-print" rows={3} placeholder="Hekime sormak istediklerin…" value={questions} onChange={(e) => setQuestions(e.target.value)} />
          <p className="print-only text-sm whitespace-pre-wrap">{questions || "—"}</p>
        </Sec>

        <p className="text-[10px] muted mt-4">Bilge bebek defteri · aile kayıtlarından otomatik üretildi; tıbbi belge değildir.</p>
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mt-3 flex flex-col gap-2 print-card">
      <h2 className="font-semibold text-sm uppercase tracking-wide muted">{title}</h2>
      {children}
    </section>
  );
}
function Row({ l, a, b, c }: { l: string; a: string; b: string; c?: string }) {
  return (
    <tr className="border-t border-(--line)">
      <td className="text-left py-1">{l}</td><td>{a}</td><td>{b}</td>{c !== undefined && <td>{c}</td>}
    </tr>
  );
}
