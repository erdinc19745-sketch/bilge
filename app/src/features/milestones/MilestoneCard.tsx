import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInDays, format } from "date-fns";
import { tr } from "date-fns/locale";
import { db, familyRealmId } from "../../db/db";
import type { Baby } from "../../db/types";
import { Chip } from "../../lib/icons";
import { CAT_ICON, CAT_LABEL, MILESTONES, PERIOD_NOTES, targetMonth, WINDOWS, type Cat } from "./milestones";

const ageMonths = (baby: Baby) => differenceInDays(Date.now(), new Date(baby.birthDate)) / 30.4375;

/** Basamağı işaretle / kaldır */
async function toggle(key: string, done: boolean) {
  if (done) await db.milestones.delete(key);
  else await db.milestones.put({ key, doneAt: Date.now(), realmId: await familyRealmId() });
}

/**
 * Kayıt ekranındaki "Bu dönem" kartı: hedef ayın basamakları, kapalıyken tek satır ilerleme.
 * Geçmiş pencereden işaretlenmemiş basamak varsa uyarır (aile hekimine söylenecek).
 */
export default function MilestoneCard({ baby }: { baby: Baby }) {
  const done = useLiveQuery(() => db.milestones.toArray(), []) ?? [];
  const [open, setOpen] = useState(false);
  const age = ageMonths(baby);
  const target = targetMonth(age);
  const doneKeys = new Set(done.map((d) => d.key));
  const items = MILESTONES.filter((m) => m.month === target);
  const doneCount = items.filter((m) => doneKeys.has(m.key)).length;
  const overdue = MILESTONES.filter((m) => m.month < target && age > m.month + 1 && !doneKeys.has(m.key));
  const note = PERIOD_NOTES.find((p) => age >= p.from && age < p.to);

  return (
    <div className="card flex flex-col gap-2">
      <button className="flex items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="text-sm font-semibold flex items-center gap-2"><Chip name="sparkles" tone="accent" size={28} /> Gelişim · {target}. aya kadar</div>
          <div className="text-xs muted">{doneCount}/{items.length} işaretli{overdue.length ? ` · ${overdue.length} geçmiş basamak açık` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={doneCount / Math.max(1, items.length)} />
          <span className="muted">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3 pt-1">
          {note && (
            <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}>
              <div className="font-semibold">{note.title}</div>
              <p className="text-xs muted mt-1">{note.text}</p>
              <ul className="text-xs mt-2 flex flex-col gap-1">
                {note.tips.map((t, i) => <li key={i}>• {t}</li>)}
              </ul>
              <div className="text-[10px] muted mt-2">Kaynak: Sağlık Bakanlığı Bebek-Çocuk İzlem Protokolü, GİDR</div>
            </div>
          )}

          <MilestoneList month={target} doneKeys={doneKeys} doneMap={new Map(done.map((d) => [d.key, d.doneAt]))} />

          {overdue.length > 0 && (
            <div className="rounded-xl p-3 text-xs" style={{ background: "color-mix(in srgb, #e2b93b 14%, var(--card))" }}>
              <b>Önceki dönemden işaretlenmemiş:</b> {overdue.map((m) => m.text).join(" · ")}. Yaptıysa işaretle; yapmadıysa aile hekimine söyle — bebekler farklı hızda gelişir, tek başına endişe nedeni değildir.
            </div>
          )}
          <p className="text-[10px] muted">Liste: CDC 2022 (çocukların %75'i bu aya kadar yapar). Teşhis aracı değildir.</p>
        </div>
      )}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="w-14 h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: "var(--accent)" }} />
    </div>
  );
}

/** Bir ayın basamakları, kategoriye göre; dokun → işaretle (tarih kaydedilir) */
export function MilestoneList({ month, doneKeys, doneMap }: { month: number; doneKeys: Set<string>; doneMap: Map<string, number> }) {
  const cats = Object.keys(CAT_LABEL) as Cat[];
  return (
    <div className="flex flex-col gap-2">
      {cats.map((c) => {
        const list = MILESTONES.filter((m) => m.month === month && m.cat === c);
        if (!list.length) return null;
        return (
          <div key={c}>
            <div className="text-xs muted mb-1">{CAT_ICON[c]} {CAT_LABEL[c]}</div>
            <div className="card p-0 divide-y divide-(--line)" style={{ background: "var(--card-2)" }}>
              {list.map((m) => {
                const isDone = doneKeys.has(m.key);
                return (
                  <button key={m.key} className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm active:opacity-70" onClick={() => toggle(m.key, isDone)}>
                    <span className="text-lg w-6 text-center">{isDone ? "✅" : "◻️"}</span>
                    <span className={`flex-1 ${isDone ? "muted line-through" : ""}`}>{m.text}</span>
                    {isDone && doneMap.get(m.key) && <span className="text-[10px] muted">{format(doneMap.get(m.key)!, "d MMM", { locale: tr })}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Profil sayfası: tüm aylar, sekmeli */
export function MilestonesAll({ baby }: { baby: Baby }) {
  const done = useLiveQuery(() => db.milestones.toArray(), []) ?? [];
  const [month, setMonth] = useState<number>(targetMonth(ageMonths(baby)));
  const doneKeys = new Set(done.map((d) => d.key));
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Gelişim basamakları</h2>
        <span className="text-xs muted">{done.length} işaretli</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {WINDOWS.map((w) => {
          const total = MILESTONES.filter((m) => m.month === w).length;
          const d = MILESTONES.filter((m) => m.month === w && doneKeys.has(m.key)).length;
          return (
            <button key={w} className={`btn text-sm ${month === w ? "btn-accent" : ""}`} style={{ minHeight: 44 }} onClick={() => setMonth(w)}>
              {w}. ay<div className="text-[10px] font-normal opacity-80">{d}/{total}</div>
            </button>
          );
        })}
      </div>
      <MilestoneList month={month} doneKeys={doneKeys} doneMap={new Map(done.map((d) => [d.key, d.doneAt]))} />
    </section>
  );
}
