import { useState } from "react";
import { db } from "../../db/db";
import { fmtDuration, fmtTime } from "../../lib/time";

/**
 * Kayıttan hemen sonra süre/başlangıç düzeltme şeridi (30 sn ya da Tamam'a kadar).
 * "27 dk oldu ama 15 dk emdi" → süre çipleri; "aslında 10 dk önce başladı" → başlangıç çipleri.
 * Şerit'e gidip düzenlemeye gerek kalmaz.
 */
export interface Adjust { id: string; mode: "sure" | "baslangic"; start: number; end: number; what: string }

export default function AdjustCard({ a, onClose }: { a: Adjust; onClose: () => void }) {
  const [start, setStart] = useState(a.start);
  const [end, setEnd] = useState(a.end);
  const curMin = Math.max(1, Math.round((end - start) / 60_000));

  const setDuration = async (min: number) => {
    const e = start + Math.max(1, min) * 60_000;
    setEnd(e);
    await db.events.update(a.id, { end: e, updatedAt: Date.now() });
  };
  const shiftStart = async (min: number) => {
    const s = a.start - min * 60_000; // her çip orijinale göre (üst üste binmez)
    setStart(s);
    await db.events.update(a.id, { start: s, updatedAt: Date.now() });
  };

  if (a.mode === "sure") {
    // Ölçülen sürenin altındaki hazır değerler: 27 dk → 5 10 15 20 · ayrıca −5/+5
    const chips = [5, 10, 15, 20, 30, 45].filter((m) => m < Math.round((a.end - a.start) / 60_000));
    return (
      <div className="card slide-up flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">{a.what} süresi: <span className="tabular-nums">{fmtDuration(end - start)}</span> <span className="muted font-normal text-xs">geç mi durdurdun?</span></span>
          <button className="btn text-xs px-3" style={{ minHeight: 32 }} onClick={onClose}>Tamam</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
          <button className="btn text-sm px-3 shrink-0" style={{ minHeight: 38 }} onClick={() => setDuration(curMin - 5)}>−5</button>
          {chips.map((m) => (
            <button key={m} className={`btn text-sm px-3 shrink-0 ${curMin === m ? "btn-accent" : ""}`} style={{ minHeight: 38 }} onClick={() => setDuration(m)}>{m} dk</button>
          ))}
          <button className="btn text-sm px-3 shrink-0" style={{ minHeight: 38 }} onClick={() => setDuration(curMin + 5)}>+5</button>
        </div>
      </div>
    );
  }
  const shifted = Math.round((a.start - start) / 60_000);
  return (
    <div className="card slide-up flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold">{a.what} başlangıcı: <span className="tabular-nums">{fmtTime(start)}</span> <span className="muted font-normal text-xs">daha önce mi başladı?</span></span>
        <button className="btn text-xs px-3" style={{ minHeight: 32 }} onClick={onClose}>Tamam</button>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {[0, 5, 10, 15, 30].map((m) => (
          <button key={m} className={`btn text-sm ${shifted === m ? "btn-accent" : ""}`} style={{ minHeight: 38 }} onClick={() => shiftStart(m)}>{m === 0 ? "şimdi" : `−${m} dk`}</button>
        ))}
      </div>
    </div>
  );
}
