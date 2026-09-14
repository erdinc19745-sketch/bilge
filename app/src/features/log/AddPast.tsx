import { useState } from "react";
import { format, parse } from "date-fns";
import { addEvent } from "../../db/db";

const DT = "yyyy-MM-dd'T'HH:mm";
type Kind = "emzir-sol" | "emzir-sag" | "biberon" | "uyku" | "bez-islak" | "bez-kaka";
const KINDS: { id: Kind; label: string }[] = [
  { id: "emzir-sol", label: "Sol emzirme" }, { id: "emzir-sag", label: "Sağ emzirme" }, { id: "biberon", label: "Biberon" },
  { id: "uyku", label: "Uyku" }, { id: "bez-islak", label: "Çiş bezi" }, { id: "bez-kaka", label: "Kaka" },
];

/**
 * Geçmişe kayıt ekleme (Şerit üstünden): kronometreyi başlatmayı unuttuğunda "14:10'da 15 dk emdi" gibi.
 * Başlangıç saati + (süreli kayıtlarda) dakika, biberonda ml.
 */
export default function AddPast({ onClose, onAdded }: { onClose: () => void; onAdded: (label: string) => void }) {
  const [kind, setKind] = useState<Kind>("emzir-sol");
  const [start, setStart] = useState(format(Date.now() - 30 * 60_000, DT));
  const [min, setMin] = useState("15");
  const [ml, setMl] = useState("60");
  const [err, setErr] = useState("");
  const timed = kind === "uyku" || kind.startsWith("emzir");

  const add = async () => {
    const s = parse(start, DT, new Date()).getTime();
    if (isNaN(s)) return setErr("Saat geçersiz.");
    if (s > Date.now()) return setErr("Gelecekteki bir saat olamaz.");
    const m = Number(min), a = Number(ml);
    if (timed && (!m || m <= 0)) return setErr("Süre (dakika) gerekli.");
    if (kind === "biberon" && (!a || a <= 0)) return setErr("Miktar (ml) gerekli.");
    if (kind === "uyku") await addEvent({ type: "uyku", start: s, end: s + m * 60_000 });
    else if (kind.startsWith("emzir")) await addEvent({ type: "emzirme", start: s, end: s + m * 60_000, side: kind === "emzir-sol" ? "sol" : "sag" });
    else if (kind === "biberon") await addEvent({ type: "biberon", start: s, amountMl: a, bottleKind: "sut" });
    else await addEvent({ type: "bez", start: s, diaper: kind === "bez-islak" ? "islak" : "kaka" });
    onAdded(`${KINDS.find((k) => k.id === kind)!.label} eklendi · ${format(s, "HH:mm")}${timed ? ` · ${m} dk` : kind === "biberon" ? ` · ${a} ml` : ""}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="slide-up card safe-bottom rounded-b-none flex flex-col gap-3" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Geçmişe kayıt ekle</h2>
          <button className="muted px-2" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button key={k.id} className={`btn text-sm ${kind === k.id ? "btn-accent" : ""}`} style={{ minHeight: 44 }} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        <label className="text-sm muted">
          {timed ? "Başlangıç" : "Saat"}
          <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[-15, -30, -60, -120].map((m) => (
            <button key={m} className="btn text-sm" style={{ minHeight: 40 }} onClick={() => setStart(format(parse(start, DT, new Date()).getTime() + m * 60_000, DT))}>{m} dk</button>
          ))}
        </div>
        {timed && (
          <label className="text-sm muted">
            Süre (dakika)
            <div className="flex gap-2 items-center">
              <input inputMode="numeric" className="input mt-0 w-24 text-center" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
              {[5, 10, 15, 20, 30, 45].map((m) => (
                <button key={m} className={`btn text-xs px-2 ${Number(min) === m ? "btn-accent" : ""}`} style={{ minHeight: 36 }} onClick={() => setMin(String(m))}>{m}</button>
              ))}
            </div>
          </label>
        )}
        {kind === "biberon" && (
          <label className="text-sm muted">
            Miktar (ml)
            <input inputMode="numeric" className="input" value={ml} onChange={(e) => setMl(e.target.value.replace(/\D/g, ""))} />
          </label>
        )}
        {err && <p className="text-sm" style={{ color: "#e8703f" }}>{err}</p>}
        <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={add}>Ekle</button>
      </div>
    </div>
  );
}
