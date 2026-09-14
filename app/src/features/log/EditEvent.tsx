import { useState } from "react";
import { ask } from "../../lib/confirm";
import { format, parse } from "date-fns";
import { db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import StoolColorPicker from "../stool/StoolColorPicker";

const DT = "yyyy-MM-dd'T'HH:mm"; // <input type="datetime-local"> biçimi
const toInput = (t: number) => format(t, DT);
const fromInput = (s: string) => parse(s, DT, new Date()).getTime();

/**
 * Kayıt düzenleme paneli (alttan açılır).
 * "20 dk önce emzirdi, şimdi giriyorum" → −15 dk kısayolları; yanlış kayıt → Sil.
 */
export default function EditEvent({ e, onClose }: { e: BabyEvent; onClose: () => void }) {
  const [start, setStart] = useState(toInput(e.start));
  const [end, setEnd] = useState(e.end ? toInput(e.end) : "");
  const [side, setSide] = useState(e.side);
  const [amountMl, setAmountMl] = useState(e.amountMl?.toString() ?? "");
  const [bottleKind, setBottleKind] = useState(e.bottleKind);
  const [store, setStore] = useState(e.store);
  const [diaper, setDiaper] = useState(e.diaper);
  const [stoolColor, setStoolColor] = useState(e.stoolColor);
  const [tempC, setTempC] = useState(e.tempC?.toString() ?? "");
  const [note, setNote] = useState(e.note ?? "");
  const [err, setErr] = useState("");

  const timed = e.type === "emzirme" || e.type === "uyku";

  const shift = (min: number) => setStart(toInput(fromInput(start) + min * 60_000));

  const save = async () => {
    const s = fromInput(start);
    const en = timed && end ? fromInput(end) : undefined;
    if (isNaN(s)) return setErr("Başlangıç saati geçersiz.");
    if (en !== undefined && (isNaN(en) || en < s)) return setErr("Bitiş, başlangıçtan önce olamaz.");
    await db.events.update(e.id, {
      start: s,
      end: en,
      side,
      amountMl: amountMl ? Number(amountMl) : undefined,
      bottleKind: e.type === "biberon" ? bottleKind : undefined,
      store: e.type === "sagma" ? store : undefined,
      diaper,
      stoolColor: diaper && diaper !== "islak" ? stoolColor : undefined,
      tempC: tempC ? Number(tempC) : undefined,
      note: note || undefined,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const remove = async () => {
    if (!(await ask({ title: "Bu kayıt silinsin mi?", ok: "Sil", danger: true }))) return;
    await db.events.delete(e.id);
    onClose();
  };

  const inputCls = "input";
  const chip = (active: boolean) => `btn text-sm ${active ? "btn-accent" : ""}`;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="slide-up card safe-bottom rounded-b-none flex flex-col gap-3 max-h-[90vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">{TITLE[e.type]} düzenle</h2>
          <button className="muted px-2" onClick={onClose}>✕</button>
        </div>

        <label className="text-sm muted">
          {timed ? "Başlangıç" : "Saat"}
          <input type="datetime-local" className={inputCls} value={start} onChange={(ev) => setStart(ev.target.value)} />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[-5, -15, -30, -60].map((m) => (
            <button key={m} className="btn text-sm" style={{ minHeight: 40 }} onClick={() => shift(m)}>
              {m} dk
            </button>
          ))}
        </div>

        {timed && (
          <label className="text-sm muted">
            Bitiş {end ? "" : "(boş = devam ediyor)"}
            <input type="datetime-local" className={inputCls} value={end} onChange={(ev) => setEnd(ev.target.value)} />
          </label>
        )}

        {e.type === "emzirme" && (
          <div className="grid grid-cols-2 gap-2">
            <button className={chip(side === "sol")} style={{ minHeight: 44 }} onClick={() => setSide("sol")}>Sol</button>
            <button className={chip(side === "sag")} style={{ minHeight: 44 }} onClick={() => setSide("sag")}>Sağ</button>
          </div>
        )}

        {(e.type === "biberon" || e.type === "sagma") && (
          <label className="text-sm muted">
            Miktar (ml)
            <input type="number" inputMode="numeric" className={inputCls} value={amountMl} onChange={(ev) => setAmountMl(ev.target.value)} />
          </label>
        )}
        {e.type === "biberon" && (
          <div className="grid grid-cols-2 gap-2">
            <button className={chip(bottleKind === "sut")} style={{ minHeight: 44 }} onClick={() => setBottleKind("sut")}>Anne sütü</button>
            <button className={chip(bottleKind === "mama")} style={{ minHeight: 44 }} onClick={() => setBottleKind("mama")}>Mama</button>
          </div>
        )}
        {e.type === "sagma" && (
          <div className="grid grid-cols-3 gap-2">
            {(["dolap", "dondurucu", "taze"] as const).map((v) => (
              <button key={v} className={chip(store === v)} style={{ minHeight: 44 }} onClick={() => setStore(v)}>{v === "taze" ? "Hemen verildi" : v === "dolap" ? "Dolap" : "Dondurucu"}</button>
            ))}
          </div>
        )}

        {e.type === "bez" && (
          <div className="grid grid-cols-3 gap-2">
            {(["islak", "kaka", "ikisi"] as const).map((d) => (
              <button key={d} className={chip(diaper === d)} style={{ minHeight: 44 }} onClick={() => setDiaper(d)}>
                {d === "islak" ? "Çiş" : d === "kaka" ? "Kaka" : "Çiş + Kaka"}
              </button>
            ))}
          </div>
        )}

        {e.type === "bez" && diaper && diaper !== "islak" && (
          <div>
            <div className="text-sm muted mb-1">Kaka rengi (kart)</div>
            <StoolColorPicker compact value={stoolColor} onChange={setStoolColor} />
          </div>
        )}

        {e.type === "ates" && (
          <label className="text-sm muted">
            Ateş (°C)
            <input type="number" inputMode="decimal" step="0.1" className={inputCls} value={tempC} onChange={(ev) => setTempC(ev.target.value)} />
          </label>
        )}

        <label className="text-sm muted">
          Not
          <input className={inputCls} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="isteğe bağlı" />
        </label>

        {err && <p className="text-sm text-red-300">{err}</p>}

        <div className="grid grid-cols-[1fr_2fr] gap-2 pt-1">
          <button className="btn text-base text-red-300" style={{ minHeight: 52 }} onClick={remove}>Sil</button>
          <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={save}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

const TITLE: Record<BabyEvent["type"], string> = {
  emzirme: "Emzirme",
  biberon: "Biberon",
  bez: "Bez",
  uyku: "Uyku",
  ates: "Ateş",
  ilac: "İlaç",
  not: "Not",
  sagma: "Süt sağma",
  sarilik: "Sarılık gözlemi",
  ekgida: "Ek gıda",
};
