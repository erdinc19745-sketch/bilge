import { useState } from "react";
import { startOfDay } from "date-fns";
import { addEvent, db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";
import ActionTile from "../log/ActionTile";

/**
 * Aktivite: karın üstü süresi (tummy time), banyo, dışarı çıkma.
 * Kaynak: AAP HealthyChildren — karın üstü: doğumdan itibaren, uyanık ve gözetim altında, günde 2-3 kez birkaç dakika,
 * kademeli artırılır (boyun/omuz gücü, düz kafa önlenir). Banyo: göbek düşene kadar silme banyosu; haftada 2-3 banyo yeterli
 * (cilt kurumasın). Hedef sayı vermiyoruz; bugünkü toplamı ve son banyoyu gösteriyoruz.
 */
export default function ActivityBlock({ recent, lit, onDone }: { recent: BabyEvent[]; lit: string | null; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const [tummyOpen, setTummyOpen] = useState(false);
  const now = Date.now(), day0 = startOfDay(now).getTime();
  const tummyToday = recent.filter((e) => e.type === "aktivite" && e.activity === "karin" && e.start >= day0);
  const tummyMs = tummyToday.reduce((s, e) => s + ((e.end ?? e.start) - e.start), 0);
  const lastBath = recent.find((e) => e.type === "aktivite" && e.activity === "banyo");
  const lastOut = recent.find((e) => e.type === "aktivite" && e.activity === "disari");

  const tummy = async (min: number) => {
    const s = Date.now() - min * 60_000;
    const id = await addEvent({ type: "aktivite", activity: "karin", start: s, end: s + min * 60_000 });
    setTummyOpen(false);
    onDone("karin", `Karın üstü ${min} dk`, () => db.events.delete(id));
  };
  const simple = async (activity: "banyo" | "disari", label: string) => {
    const id = await addEvent({ type: "aktivite", activity, start: Date.now() });
    onDone(activity, label, () => db.events.delete(id));
  };

  return (
    <>
      <div className="section-title">Aktivite</div>
      <ActionTile k="karin" lit={lit} icon="baby" tone="biberon" title="Karın üstü" sub={`bugün ${tummyMs ? fmtDuration(tummyMs) : "0 dk"} (${tummyToday.length} kez) · uyanık, gözetimli, günde 2-3 kez (AAP)`} onTap={() => setTummyOpen((v) => !v)} />
      {tummyOpen && (
        <div className="grid grid-cols-5 gap-2 -mt-1">
          {[1, 2, 3, 5, 10].map((m) => (
            <button key={m} className="btn text-base" style={{ minHeight: 48 }} onClick={() => tummy(m)}>{m} dk</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ActionTile compact k="banyo" lit={lit} icon="droplet" tone="uyku" title="Banyo" sub={lastBath ? `son ${fmtDuration(now - lastBath.start)} önce · haftada 2-3 yeter` : "haftada 2-3 yeter (AAP)"} onTap={() => simple("banyo", "Banyo yapıldı")} />
        <ActionTile compact k="disari" lit={lit} icon="sun" tone="biberon" title="Dışarı çıktı" sub={lastOut ? `son ${fmtDuration(now - lastOut.start)} önce` : "hava, gün ışığı"} onTap={() => simple("disari", "Dışarı çıkıldı")} />
      </div>
    </>
  );
}
