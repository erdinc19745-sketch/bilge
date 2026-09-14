import { useObservable } from "dexie-react-hooks";
import { cloudEnabled, syncState$ } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDuration } from "../../lib/time";
import { Chip } from "../../lib/icons";
import { getRole, ROLE_LABEL, type Role } from "../family/family";

/**
 * Aile bölmesi üst kartı: "kim en son ne yaptı" (anne/baba son kayıt) + senkron durumu.
 * Amaç: anne uyurken baba telefona bakınca "en son kim ne zaman besledi" tek bakışta görünsün.
 */
const TYPE_LABEL: Partial<Record<BabyEvent["type"], string>> = { emzirme: "emzirme", biberon: "biberon", bez: "bez", uyku: "uyku", ates: "ateş", ilac: "ilaç", sagma: "sağma", ekgida: "ek gıda", sarilik: "sarılık", not: "not" };

export default function FamilyStatus({ recent }: { recent: BabyEvent[] }) {
  const sync = useObservable(syncState$);
  const me = getRole();
  const roles = [...new Set(recent.map((e) => e.by).filter(Boolean))] as Role[];
  if (me && !roles.includes(me)) roles.unshift(me);
  const now = Date.now();
  const phase: Record<string, string> = { "in-sync": "eşlendi", pushing: "gönderiyor", pulling: "alıyor", offline: "çevrimdışı", error: "hata", "not-in-sync": "bekliyor", initial: "başlıyor" };

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="section-title" style={{ margin: 0 }}>Kim ne zaman</div>
        {cloudEnabled && <span className="text-[10px] muted">senkron: {phase[sync?.phase ?? ""] ?? "—"}</span>}
      </div>
      {roles.length === 0 && <p className="text-xs muted">Henüz rol etiketi olan kayıt yok (Ayarlar → Aile senkronu → "Bu telefonda ben").</p>}
      <ul className="flex flex-col gap-1.5">
        {roles.map((r) => {
          const last = recent.find((e) => e.by === r);
          return (
            <li key={r} className="flex items-center gap-2 text-sm">
              <Chip name={r === "anne" ? "heart" : r === "baba" ? "clock" : "baby"} tone={r === "anne" ? "emzirme" : r === "baba" ? "uyku" : "muted"} size={30} />
              <span className="font-medium">{ROLE_LABEL[r] ?? r}{r === me ? <span className="muted font-normal text-xs"> (bu telefon)</span> : ""}</span>
              <span className="muted text-xs ml-auto text-right">
                {last ? `${TYPE_LABEL[last.type] ?? last.type} · ${fmtDuration(now - last.start)} önce` : "kayıt yok"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
