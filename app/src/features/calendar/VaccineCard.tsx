import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import type { Baby } from "../../db/types";
import { buildSchedule } from "./schedule";
import { fmtDuration } from "../../lib/time";
import { parseISO } from "date-fns";

/**
 * Aşı sonrası 48 saat kartı (Hızlı bölmesi): Takvim'de bir aşı "yapıldı" işaretlenince 2 gün görünür.
 * İçerik: Sağlık Bakanlığı Aşı Portalı "aşı sonrası görülebilecek durumlar" + AAP HealthyChildren (ne zaman hekime).
 * Ateş eşiği uygulamanın genel kuralıyla aynı (3 aydan küçükte ≥38 °C → hekime). Teşhis değil, hatırlatma.
 */
const WINDOW_MS = 48 * 3600_000;

export default function VaccineCard({ baby, onFever }: { baby: Baby; onFever: () => void }) {
  const done = useLiveQuery(() => db.scheduleDone.toArray(), []) ?? [];
  const [hidden, setHidden] = useState<string>(() => { try { return localStorage.getItem("bilge.vaccineSeen") ?? ""; } catch { return ""; } });
  const now = Date.now();
  const items = buildSchedule(baby.birthDate).filter((i) => i.kind === "asi");
  const recent = done
    .filter((d) => d.doneAt && now - d.doneAt < WINDOW_MS)
    .map((d) => ({ d, i: items.find((x) => x.key === d.key) }))
    .filter((x) => x.i);
  if (recent.length === 0) return null;
  const sig = recent.map((x) => x.d.key).sort().join(",");
  if (hidden === sig) return null;
  const latest = Math.max(...recent.map((x) => x.d.doneAt));
  const left = WINDOW_MS - (now - latest);
  const bcg = recent.some((x) => x.d.key === "bcg");
  const young = (now - parseISO(baby.birthDate).getTime()) / 86_400_000 < 90;

  return (
    <div className="card flex flex-col gap-2" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">💉 Aşı sonrası takip <span className="muted font-normal text-xs">· {fmtDuration(left)} daha</span></div>
        <button className="text-xs muted underline" onClick={() => { try { localStorage.setItem("bilge.vaccineSeen", sig); } catch { /* */ } setHidden(sig); }}>tamam</button>
      </div>
      <div className="text-xs muted">{recent.map((x) => x.i!.title).join(" · ")}</div>
      <ul className="text-xs flex flex-col gap-1">
        <li>• İlk 1-2 gün hafif ateş, huzursuzluk, aşı yerinde kızarıklık/şişlik/ağrı olabilir; aşı yerine soğuk uygulama yeter, ovma-ilaç sürme.</li>
        <li>• Ateş düşürücüyü yalnız hekimin önerdiği doz ve şekilde ver; aşıdan önce "koruyucu" ateş düşürücü verilmez.</li>
        <li>• Hekime başvur: {young ? <b>≥38 °C (3 aydan küçük)</b> : "≥38 °C ve genel durum bozuk"}, 48 saatten uzun ateş, sürekli/ tiz ağlama, emmeme, şişliğin büyümesi, döküntü.</li>
        {bcg && <li>• <b>BCG:</b> 2-6 hafta sonra aşı yerinde kızarıklık → küçük yara → 2-3 ayda iyileşip iz bırakır. Normaldir; sıkma, pansuman ve ilaç gerekmez.</li>}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-[10px] muted">SB Aşı Portalı · AAP HealthyChildren</span>
        <button className="btn text-sm px-4" style={{ minHeight: 40 }} onClick={onFever}>🌡 Ateş ölçtüm</button>
      </div>
    </div>
  );
}
