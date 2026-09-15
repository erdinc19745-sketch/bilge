import { useState } from "react";
import { ask } from "../../lib/confirm";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { db, familyRealmId, uid } from "../../db/db";
import type { Baby, Measurement } from "../../db/types";
import type { Indicator } from "./who";
import { IND_LABEL, percentile, valueAtZ, Z_LINES, zScore } from "./percentile";

const ageMonths = (baby: Baby, at: number) => differenceInDays(at, parseISO(baby.birthDate)) / 30.4375;

/** Ölçüm girişi + WHO persentil eğrisi (aile hekiminin kullandığı eğrinin aynısı) */
export default function Growth({ baby }: { baby: Baby }) {
  const list = useLiveQuery(() => db.measurements.orderBy("at").toArray(), []) ?? [];
  const [ind, setInd] = useState<Indicator>("weight");
  const [open, setOpen] = useState(false);

  const last = [...list].reverse().find((m) => val(m, ind) != null);
  const lastZ = last ? zScore(baby.sex, ind, ageMonths(baby, last.at), val(last, ind)!) : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Büyüme</h2>
        <button className="btn text-sm px-3" style={{ minHeight: 36 }} onClick={() => setOpen((v) => !v)}>{open ? "Kapat" : "+ Ölçüm"}</button>
      </div>
      {open && <MeasureForm onDone={() => setOpen(false)} />}

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(IND_LABEL) as Indicator[]).map((k) => (
          <button key={k} className={`btn text-sm ${ind === k ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setInd(k)}>
            {IND_LABEL[k].title}
          </button>
        ))}
      </div>

      {last && lastZ != null && (
        <div className="card py-3 flex justify-between items-baseline">
          <div>
            <div className="text-xs muted">Son {IND_LABEL[ind].title.toLowerCase()} · {format(last.at, "d MMM", { locale: tr })}</div>
            <div className="text-2xl font-bold tabular-nums">{fmtVal(val(last, ind)!, ind)} {IND_LABEL[ind].unit}</div>
          </div>
          <div className="text-right">
            <div className="text-xs muted">persentil</div>
            <div className="text-2xl font-bold tabular-nums">P{percentile(lastZ)}</div>
            <div className="text-xs muted">z = {lastZ.toFixed(2)}</div>
          </div>
        </div>
      )}

      <Curve baby={baby} ind={ind} points={list.filter((m) => val(m, ind) != null).map((m) => ({ age: ageMonths(baby, m.at), v: val(m, ind)!, at: m.at }))} />

      {list.length > 0 && (
        <div className="card p-0 divide-y divide-(--line)">
          {[...list].reverse().map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="muted w-16">{format(m.at, "d MMM", { locale: tr })}</span>
              <span className="flex-1 tabular-nums">
                {m.weightG ? `${(m.weightG / 1000).toFixed(2)} kg` : ""} {m.lengthCm ? `· ${m.lengthCm} cm` : ""} {m.headCm ? `· baş ${m.headCm} cm` : ""}
              </span>
              <button className="muted text-xs px-2" onClick={async () => (await ask({ title: "Ölçüm silinsin mi?", ok: "Sil", danger: true })) && db.measurements.delete(m.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function val(m: Measurement, ind: Indicator): number | undefined {
  if (ind === "weight") return m.weightG ? m.weightG / 1000 : undefined;
  if (ind === "length") return m.lengthCm;
  return m.headCm;
}
const fmtVal = (v: number, ind: Indicator) => (ind === "weight" ? v.toFixed(2) : v.toFixed(1));

export function MeasureForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(format(Date.now(), "yyyy-MM-dd"));
  const [w, setW] = useState("");
  const [l, setL] = useState("");
  const [h, setH] = useState("");
  const inputCls = "input";
  const save = async () => {
    if (!w && !l && !h) return;
    await db.measurements.add({
      id: uid(),
      at: new Date(date + "T12:00").getTime(),
      weightG: w ? Math.round(parseFloat(w.replace(",", ".")) * (parseFloat(w) > 100 ? 1 : 1000)) : undefined, // 3.45 kg ya da 3450 g
      lengthCm: l ? parseFloat(l.replace(",", ".")) : undefined,
      headCm: h ? parseFloat(h.replace(",", ".")) : undefined,
      realmId: await familyRealmId(),
    });
    onDone();
  };
  return (
    <div className="card flex flex-col gap-2">
      <label className="text-sm muted">Tarih<input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm muted">Kilo (kg)<input inputMode="decimal" placeholder="3.45" className={inputCls} value={w} onChange={(e) => setW(e.target.value)} /></label>
        <label className="text-sm muted">Boy (cm)<input inputMode="decimal" placeholder="51" className={inputCls} value={l} onChange={(e) => setL(e.target.value)} /></label>
        <label className="text-sm muted">Baş (cm)<input inputMode="decimal" placeholder="35" className={inputCls} value={h} onChange={(e) => setH(e.target.value)} /></label>
      </div>
      <button className="btn btn-accent" style={{ minHeight: 48 }} onClick={save}>Kaydet</button>
    </div>
  );
}

/**
 * Persentil eğrisi: P3/P15/P50/P85/P97 silik çizgiler (sağ uçta etiket), bebeğin ölçümleri 2px çizgi + 8px nokta.
 * Tek eksen; dokununca değer ve persentil.
 */
function Curve({ baby, ind, points }: { baby: Baby; ind: Indicator; points: { age: number; v: number; at: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const nowAge = ageMonths(baby, Date.now());
  const maxAge = Math.min(24, Math.max(3, Math.ceil(nowAge + 1), ...points.map((p) => Math.ceil(p.age + 0.5))));
  const W = 320, H = 200, padL = 34, padB = 22, padT = 10, padR = 28;

  const curves = Z_LINES.map((zl) => ({
    ...zl,
    pts: Array.from({ length: maxAge * 2 + 1 }, (_, i) => i / 2).map((a) => [a, valueAtZ(baby.sex, ind, a, zl.z) ?? 0] as [number, number]),
  }));
  const allV = [...curves.flatMap((c) => c.pts.map((p) => p[1])), ...points.map((p) => p.v)];
  const vMin = Math.floor(Math.min(...allV) * 0.95), vMax = Math.ceil(Math.max(...allV) * 1.03);
  const x = (a: number) => padL + ((W - padL - padR) * a) / maxAge;
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - vMin) / (vMax - vMin));
  const path = (pts: [number, number][]) => pts.map(([a, v], i) => `${i ? "L" : "M"}${x(a).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = 4;

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="text-sm font-semibold">{IND_LABEL[ind].title} — WHO {baby.sex === "kiz" ? "kız" : "erkek"}</h3>
        {active !== null && points[active] && (
          <span className="text-xs muted">
            {format(points[active].at, "d MMM", { locale: tr })} · {fmtVal(points[active].v, ind)} {IND_LABEL[ind].unit} · P{percentile(zScore(baby.sex, ind, points[active].age, points[active].v) ?? 0)}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 210 }}>
        {Array.from({ length: ticks + 1 }, (_, i) => vMin + ((vMax - vMin) * i) / ticks).map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={padL - 4} y={y(v) + 3} fontSize="9" textAnchor="end" fill="var(--muted)">{ind === "weight" ? v.toFixed(1) : Math.round(v)}</text>
          </g>
        ))}
        {Array.from({ length: maxAge + 1 }, (_, a) => a).filter((a) => maxAge <= 8 || a % 3 === 0).map((a) => (
          <text key={a} x={x(a)} y={H - 6} fontSize="9" textAnchor="middle" fill="var(--muted)">{a} ay</text>
        ))}
        {curves.map((c) => (
          <g key={c.label}>
            <path d={path(c.pts)} fill="none" stroke="var(--muted)" strokeOpacity={c.label === "P50" ? 0.7 : 0.35} strokeWidth={c.label === "P50" ? 1.5 : 1} />
            <text x={W - padR + 3} y={y(c.pts[c.pts.length - 1][1]) + 3} fontSize="9" fill="var(--muted)">{c.label}</text>
          </g>
        ))}
        {points.length > 1 && <path d={path(points.map((p) => [p.age, p.v]))} fill="none" stroke="var(--c-uyku)" strokeWidth={2} className="draw-line" />}
        {points.map((p, i) => (
          <g key={i} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
            <circle cx={x(p.age)} cy={y(p.v)} r={12} fill="transparent" />
            <circle cx={x(p.age)} cy={y(p.v)} r={active === i ? 6 : 4.5} fill="var(--c-uyku)" stroke="var(--card)" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {points.length === 0 && <p className="text-xs muted">Henüz ölçüm yok. Aile hekimi tartısını “+ Ölçüm” ile gir; nokta eğrinin üstüne düşer.</p>}
    </div>
  );
}
