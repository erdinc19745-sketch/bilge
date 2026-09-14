import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { addEvent, db, familyRealmId, uid } from "../../db/db";
import type { BabyEvent, Medication } from "../../db/types";
import { ask } from "../../lib/confirm";
import { Icon } from "../../lib/icons";
import { fmtDuration, fmtTime } from "../../lib/time";
import ActionTile from "../log/ActionTile";
import { dosesGiven, INTERVALS, isActive, lastDose, nextDoseAt, tooEarly } from "./meds";

/**
 * Kayıt ekranı "İlaçlar" bloğu: aktif kürlerin kartları (sonraki doz, kim/kaçta verdi), "verildi",
 * erken doz uyarısı, yeni ilaç ekleme, kürü bitirme. Bildirimler reminders.ts üzerinden.
 */
export default function MedsBlock({ recent, lit, onDone }: { recent: BabyEvent[]; lit: string | null; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const meds = useLiveQuery(() => db.meds.toArray(), []) ?? [];
  const active = meds.filter((m) => isActive(m));
  const [adding, setAdding] = useState(false);
  const now = Date.now();

  const give = async (m: Medication) => {
    const { early, sinceMin } = tooEarly(m, recent);
    if (early) {
      const ok = await ask({ title: "Erken doz?", text: `${m.name} son ${fmtDuration(sinceMin * 60_000)} önce verildi; aralık ${m.intervalH} saat. Yine de kaydedilsin mi?`, ok: "Evet, verildi", danger: true });
      if (!ok) return;
    } else if (!(await ask({ title: `${m.name} verildi mi?`, text: m.dose, ok: "Verildi" }))) return;
    const id = await addEvent({ type: "ilac", start: now, medName: m.name, medId: m.id, note: m.dose });
    onDone(`med-${m.id}`, `${m.name} verildi`, () => db.events.delete(id));
  };

  const finish = async (m: Medication) => {
    if (!(await ask({ title: `${m.name} kürü bitsin mi?`, text: `${dosesGiven(m, recent)} doz verildi. Kart kalkar, geçmiş Şerit'te kalır.`, ok: "Bitir" }))) return;
    await db.meds.update(m.id, { endedAt: now });
  };

  return (
    <>
      <div className="section-title flex items-center justify-between">
        <span>İlaçlar</span>
        <button className="normal-case tracking-normal text-xs underline" onClick={() => setAdding((v) => !v)}>{adding ? "kapat" : "+ ilaç ekle"}</button>
      </div>
      {adding && <MedForm onDone={() => setAdding(false)} />}
      {active.length === 0 && !adding && (
        <p className="text-xs muted px-1 -mt-1">Doktor ilaç yazınca "+ ilaç ekle": doz, aralık, gün → sonraki dozu hesaplar, hatırlatır, erken dozu engeller.</p>
      )}
      {active.map((m) => {
        const last = lastDose(m, recent);
        const next = nextDoseAt(m, recent);
        const due = next !== undefined && next <= now;
        const { early } = tooEarly(m, recent);
        const sub = m.prn
          ? `gerekirse · en az ${m.intervalH} sa ara${last ? ` · son ${fmtTime(last.start)}${last.by ? ` (${last.by})` : ""}` : ""}`
          : due
            ? `şimdi verilebilir${last ? ` · son ${fmtTime(last.start)}${last.by ? ` (${last.by})` : ""}` : " · ilk doz"}`
            : `sonraki ${fmtTime(next!)} (${fmtDuration(next! - now)})${last ? ` · son ${fmtTime(last.start)}${last.by ? ` (${last.by})` : ""}` : ""}`;
        return (
          <div key={m.id} className="flex flex-col gap-1">
            <ActionTile
              k={`med-${m.id}`} lit={lit} icon="pill" tone={due ? "accent" : "muted"} accent={due}
              title={`${m.name} · ${m.dose}`} sub={sub}
              right={<span className="text-xs font-normal">{dosesGiven(m, recent)}{m.totalDoses ? `/${m.totalDoses}` : ""} doz</span>}
              className={early && !m.prn ? "opacity-70" : ""}
              onTap={() => give(m)}
            />
            <div className="flex justify-between px-2 text-[10px] muted">
              <span>{m.intervalH} saatte bir{m.endAt ? ` · ${format(m.endAt, "d MMM", { locale: tr })}'e kadar` : ""}{m.prn ? " · gerekirse" : ""}</span>
              <button className="underline" onClick={() => finish(m)}>kürü bitir</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function MedForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [intervalH, setIntervalH] = useState<number>(12);
  const [days, setDays] = useState<number>(7);
  const [prn, setPrn] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim()) return setErr("İlaç adı gerekli.");
    const now = Date.now();
    await db.meds.add({
      id: uid(), name: name.trim(), dose: dose.trim() || "1 doz", intervalH, prn,
      startAt: now, endAt: prn || !days ? undefined : now + days * 86_400_000,
      totalDoses: prn || !days ? undefined : Math.round((days * 24) / intervalH),
      createdAt: now, realmId: await familyRealmId(),
    });
    onDone();
  };

  return (
    <div className="card slide-up flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm muted">İlaç<input className="input" placeholder="Antibiyotik şurup" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-sm muted">Doz<input className="input" placeholder="2,5 ml" value={dose} onChange={(e) => setDose(e.target.value)} /></label>
      </div>
      <div>
        <div className="text-xs muted mb-1">Aralık</div>
        <div className="grid grid-cols-5 gap-2">
          {INTERVALS.map((h) => (
            <button key={h} className={`btn text-sm ${intervalH === h ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setIntervalH(h)}>{h} sa</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs muted mb-1">Süre</div>
        <div className="grid grid-cols-6 gap-2">
          {[3, 5, 7, 10, 14].map((d) => (
            <button key={d} className={`btn text-sm ${!prn && days === d ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => { setDays(d); setPrn(false); }}>{d} gün</button>
          ))}
          <button className={`btn text-sm ${prn ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setPrn(true)}>gerekirse</button>
        </div>
        <p className="text-[10px] muted mt-1">{prn ? `Plan yok; "en az ${intervalH} saat ara" korumasıyla istediğinde verirsin (ateş düşürücü gibi).` : `${days} gün × ${24 / intervalH} doz/gün = ${Math.round((days * 24) / intervalH)} doz; sonraki dozlar hatırlatılır.`}</p>
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn text-base" style={{ minHeight: 48 }} onClick={onDone}>Vazgeç</button>
        <button className="btn btn-accent flex items-center justify-center gap-2" style={{ minHeight: 48 }} onClick={save}><Icon name="check" size={18} /> Kaydet</button>
      </div>
    </div>
  );
}
