import { useState } from "react";
import { addEvent, db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";
import { Chip, Icon } from "../../lib/icons";
import ActionTile from "../log/ActionTile";
import { computeStock } from "./milk";

/**
 * Süt sağma kaydı + süt stoku. Kayıt: taraf, ml, nereye (dolap / dondurucu / hemen verildi).
 * Stok anne sütü biberonlarıyla otomatik düşer (en eski önce).
 */
export default function PumpBlock({ recent, lit, onDone }: { recent: BabyEvent[]; lit: string | null; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"sol" | "sag" | "ikisi">("ikisi");
  const [ml, setMl] = useState("");
  const [store, setStore] = useState<"dolap" | "dondurucu" | "taze">("dolap");
  const stock = computeStock(recent);

  const save = async () => {
    const amount = Number(ml);
    if (!amount) return;
    const id = await addEvent({ type: "sagma", start: Date.now(), amountMl: amount, side: side === "ikisi" ? undefined : side, store });
    setMl(""); setOpen(false);
    onDone("sagma", `${amount} ml sağıldı${store === "taze" ? "" : ` → ${store}`}`, () => db.events.delete(id));
  };

  const oldestAge = stock.oldest ? fmtDuration(Date.now() - stock.oldest.at) : null;

  return (
    <>
      <div className="section-title">Süt sağma</div>
      <ActionTile
        k="sagma-ac" lit={lit} icon="droplet" tone="biberon" title="Süt sağma"
        sub={stock.totalMl > 0 ? `stok ${stock.totalMl} ml · dolap ${stock.dolapMl} · dondurucu ${stock.dondurucuMl}${oldestAge ? ` · en eski ${oldestAge}` : ""}` : "sağılan sütü kaydet, stok otomatik"}
        right={<Icon name={open ? "chevronDown" : "chevronRight"} size={18} />}
        onTap={() => setOpen((v) => !v)}
      />
      {stock.warnings.length > 0 && (
        <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #e8703f 16%, var(--card))" }}>
          {stock.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
      {open && (
        <div className="card slide-up flex flex-col gap-3 -mt-1">
          <div className="grid grid-cols-3 gap-2">
            {(["sol", "sag", "ikisi"] as const).map((s) => (
              <button key={s} className={`btn text-sm ${side === s ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setSide(s)}>
                {s === "sol" ? "Sol" : s === "sag" ? "Sağ" : "İkisi"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Chip name="bottle" tone="biberon" size={36} />
            <input inputMode="numeric" placeholder="ml" value={ml} onChange={(e) => setMl(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && save()} className="input mt-0 text-xl text-center font-semibold" style={{ minHeight: 48 }} />
            <span className="muted text-sm">ml</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["dolap", "Dolap", "≤ 4 gün"], ["dondurucu", "Dondurucu", "≤ 6 ay"], ["taze", "Hemen verildi", "stoka girmez"]] as const).map(([v, l, h]) => (
              <button key={v} className={`btn text-sm ${store === v ? "btn-accent" : ""}`} style={{ minHeight: 48 }} onClick={() => setStore(v)}>
                {l}<div className="text-[10px] font-normal opacity-80">{h}</div>
              </button>
            ))}
          </div>
          <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={save} disabled={!ml}>Kaydet</button>
          {stock.items.length > 0 && (
            <div className="text-xs muted">
              Stok (eskiden yeniye): {stock.items.map((i) => `${i.left} ml ${i.store === "dolap" ? "dolap" : "dondurucu"} (${fmtDuration(Date.now() - i.at)})`).join(" · ")}
            </div>
          )}
        </div>
      )}
    </>
  );
}
