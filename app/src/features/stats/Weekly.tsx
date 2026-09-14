import { lazy, Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";

import { seriesColors } from "../../lib/theme";
const Report = lazy(() => import("../report/Report"));
import Assessment from "./Assessment";

interface Day { day: number; label: string; feeds: number; bottleMl: number; sleepMin: number; longestMin: number; diapers: number; nightWakes: number }

/** Son 7 günü gün gün hesapla */
function summarize(events: BabyEvent[], days = 7): Day[] {
  const now = Date.now();
  const out: Day[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d0 = startOfDay(subDays(now, i)).getTime();
    const d1 = Math.min(d0 + 86_400_000, now);
    const inDay = events.filter((e) => e.start < d1 && (e.end ?? e.start) >= d0);
    const sleeps = inDay.filter((e) => e.type === "uyku");
    let sleepMin = 0, longest = 0;
    for (const s of sleeps) {
      const a = Math.max(s.start, d0), b = Math.min(s.end ?? now, d1);
      const m = Math.max(0, b - a) / 60_000;
      sleepMin += m; longest = Math.max(longest, ((s.end ?? now) - s.start) / 60_000);
    }
    const nightWakes = sleeps.filter((s) => { if (!s.end || s.end < d0 || s.end >= d1) return false; const h = new Date(s.end).getHours(); return h >= 23 || h < 6; }).length;
    out.push({
      day: d0,
      label: format(d0, "EEE", { locale: tr }),
      feeds: inDay.filter((e) => (e.type === "emzirme" || e.type === "biberon") && e.start >= d0 && e.start < d1).length,
      bottleMl: inDay.filter((e) => e.type === "biberon" && e.start >= d0).reduce((s, e) => s + (e.amountMl ?? 0), 0),
      sleepMin: Math.round(sleepMin), longestMin: Math.round(longest),
      diapers: inDay.filter((e) => e.type === "bez" && e.start >= d0).length,
      nightWakes,
    });
  }
  return out;
}

export default function Weekly() {
  const from = startOfDay(subDays(Date.now(), 7)).getTime();
  const events = useLiveQuery(() => db.events.where("start").aboveOrEqual(from).toArray(), [from]) ?? [];
  const [table, setTable] = useState(false);
  const [report, setReport] = useState(false);
  const baby = useLiveQuery(() => db.baby.get("me"));
  const C = seriesColors(); // temaya göre doğrulanmış palet (koyu/açık ayrı adımlar)
  const days = summarize(events);
  const n = Math.max(1, days.filter((d) => d.feeds + d.diapers + d.sleepMin > 0).length);
  const avg = (f: (d: Day) => number) => days.reduce((s, d) => s + f(d), 0) / n;

  if (events.length === 0) return (
    <div className="flex flex-col gap-4 pt-1">
      {baby && <Assessment baby={baby} />}
      <p className="muted text-center pt-4 text-sm">Son 7 günde kayıt yok — Kayıt sekmesinden başla.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pt-1">
      {report && baby && <Suspense fallback={null}><Report baby={baby} onClose={() => setReport(false)} /></Suspense>}
      {baby && <Assessment baby={baby} />}
      <button className="btn btn-accent flex items-center justify-center gap-2" style={{ minHeight: 52 }} onClick={() => setReport(true)}>
        🩺 Aile hekimi raporu
        <span className="text-xs font-normal opacity-80">yazdır / paylaş</span>
      </button>
      {/* ---- Öne çıkan sayılar ---- */}
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Günde beslenme" value={avg((d) => d.feeds).toFixed(1)} sub="ortalama, 7 gün" />
        <Tile label="Günde uyku" value={fmtDuration(avg((d) => d.sleepMin) * 60_000)} sub="ortalama" />
        <Tile label="En uzun uyku" value={fmtDuration(Math.max(...days.map((d) => d.longestMin)) * 60_000)} sub="bu hafta" />
        <Tile label="Gece uyanma" value={avg((d) => d.nightWakes).toFixed(1)} sub="23:00–06:00, ortalama" />
      </div>

      <div className="flex justify-end">
        <button className="text-xs muted underline" onClick={() => setTable((v) => !v)}>{table ? "Grafik" : "Tablo"}</button>
      </div>

      {table ? (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="muted text-xs"><tr><th className="text-left px-3 py-2">Gün</th><th>Beslenme</th><th>Uyku</th><th>En uzun</th><th>Bez</th><th>Gece</th></tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day} className="border-t border-(--line) text-center tabular-nums">
                  <td className="text-left px-3 py-1.5">{format(d.day, "d MMM EEE", { locale: tr })}</td>
                  <td>{d.feeds}</td><td>{fmtDuration(d.sleepMin * 60_000)}</td><td>{fmtDuration(d.longestMin * 60_000)}</td><td>{d.diapers}</td><td>{d.nightWakes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Chart title="Günlük uyku" color={C.uyku} data={days.map((d) => ({ label: d.label, value: d.sleepMin / 60, text: fmtDuration(d.sleepMin * 60_000) }))} unit="sa" />
          <Chart title="Günlük beslenme" color={C.emzirme} data={days.map((d) => ({ label: d.label, value: d.feeds, text: `${d.feeds} kez` }))} />
          <Chart title="Günlük bez" color={C.bez} data={days.map((d) => ({ label: d.label, value: d.diapers, text: `${d.diapers} bez` }))} />
        </>
      )}
      <p className="text-xs muted">Yenidoğanda günde 8-12 beslenme, 6+ ıslak bez ve 14-17 saat uyku beklenir; sapmalarda aile hekimine danışın.</p>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card py-3">
      <div className="text-xs muted">{label}</div>
      <div className="text-2xl font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-xs muted">{sub}</div>
    </div>
  );
}

/**
 * Tek serili çubuk grafik (SVG). İnce çubuk, üstte 4px yuvarlak, tabana oturur;
 * sadece en yüksek ve son çubuk etiketli; dokununca tooltip. Tek eksen, silik ızgara.
 */
function Chart({ title, color, data, unit }: { title: string; color: string; data: { label: string; value: number; text: string }[]; unit?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320, H = 140, padL = 26, padB = 20, padT = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = unit === "sa" ? Math.ceil(max / 4) * 4 : Math.ceil(max / 5) * 5 || 5;
  const slot = (W - padL) / data.length;
  const bw = Math.min(18, slot * 0.42); // ince çubuk
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / niceMax);
  const maxIdx = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  const r = 4;

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {active !== null && <span className="text-xs muted">{data[active].label} · {data[active].text}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }} onMouseLeave={() => setActive(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke="var(--line)" />
            <text x={padL - 4} y={y(niceMax * f) + 3} fontSize="9" textAnchor="end" fill="var(--muted)">{Math.round(niceMax * f)}{unit ? ` ${unit}` : ""}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - bw) / 2;
          const top = y(d.value), base = y(0), h = Math.max(0, base - top);
          const rr = Math.min(r, h);
          const path = h === 0 ? "" : `M${x},${base} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + bw - rr} Q${x + bw},${top} ${x + bw},${top + rr} V${base} Z`;
          const labeled = i === maxIdx || i === data.length - 1;
          return (
            <g key={i} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: "pointer" }}>
              <rect x={padL + slot * i} y={padT} width={slot} height={H - padT} fill="transparent" />
              {path && <path d={path} fill={color} opacity={active === null || active === i ? 1 : 0.55} />}
              {(labeled || active === i) && d.value > 0 && (
                <text x={x + bw / 2} y={top - 4} fontSize="10" textAnchor="middle" fill="var(--text)">{d.text}</text>
              )}
              <text x={x + bw / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeOpacity={0.5} />
      </svg>
    </div>
  );
}
