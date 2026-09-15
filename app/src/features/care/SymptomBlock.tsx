import { useState } from "react";
import { addEvent, db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";
import { Icon } from "../../lib/icons";
import ActionTile from "../log/ActionTile";

/**
 * Belirti günlüğü: hekime giderken "3 gündür öksürüyor, dün 2 kez kustu" diyebilmek için.
 * Çipler + not; rapora "Belirtiler (7 gün)" bölümü olarak girer. Teşhis yok; acil işaretler NICE NG194'ten.
 */
export const SYMPTOMS = ["kusma", "ishal", "kabızlık", "döküntü", "öksürük", "burun akıntısı", "huzursuzluk", "gaz sancısı", "az emme", "uykuya meyil", "göz çapağı", "pişik"] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export default function SymptomBlock({ recent, lit, onDone }: { recent: BabyEvent[]; lit: string | null; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Symptom[]>([]);
  const [note, setNote] = useState("");
  const last = recent.find((e) => e.type === "belirti");
  const now = Date.now();
  const week = recent.filter((e) => e.type === "belirti" && e.start > now - 7 * 86_400_000);

  const save = async () => {
    if (sel.length === 0 && !note.trim()) return;
    const id = await addEvent({ type: "belirti", start: Date.now(), symptoms: [...sel], note: note.trim() || undefined });
    onDone("belirti", `Belirti: ${[...sel, note.trim()].filter(Boolean).join(", ")}`, () => db.events.delete(id));
    setSel([]); setNote(""); setOpen(false);
  };

  return (
    <>
      <div className="section-title">Belirti</div>
      <ActionTile
        k="belirti" lit={lit} icon="thermometer" tone="danger" title="Belirti günlüğü"
        sub={last ? `son: ${(last.symptoms ?? []).join(", ") || last.note} · ${fmtDuration(now - last.start)} önce${week.length > 1 ? ` · 7 günde ${week.length} kayıt` : ""}` : "kusma, ishal, döküntü, öksürük… hekime anlatmak için"}
        right={<Icon name={open ? "chevronDown" : "chevronRight"} size={18} />}
        onTap={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="card flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => (
              <button key={s} className={`btn text-xs px-3 ${sel.includes(s) ? "btn-accent" : ""}`} style={{ minHeight: 36 }} onClick={() => setSel((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))}>{s}</button>
            ))}
          </div>
          <input className="input mt-0" placeholder="not (kaç kez, ne zaman başladı, renk…)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] muted">Hemen hekim/112: nefes darlığı, morarma, yeşil/kanlı kusma, kanlı kaka, 3 aydan küçükte ≥38 °C, uyandırılamıyor (NICE NG194).</span>
            <button className="btn btn-accent text-sm px-4 shrink-0" style={{ minHeight: 40 }} onClick={save}>Kaydet</button>
          </div>
        </div>
      )}
    </>
  );
}
