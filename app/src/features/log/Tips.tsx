import { useState } from "react";

const KEY = "bilge.tipsSeen";

/** İlk kullanım ipuçları — bir kez gösterilir, "Anladım" ile kapanır */
export default function Tips() {
  const [seen, setSeen] = useState(() => { if (location.search.includes("notips")) return true; try { return localStorage.getItem(KEY) === "1"; } catch { return true; } });
  if (seen) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* */ } setSeen(true); };
  return (
    <div className="card flex flex-col gap-2 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--card))" }}>
      <div className="font-semibold">Nasıl kullanılır</div>
      <ul className="flex flex-col gap-1 text-xs">
        <li>• Her şey <b>tek dokunuş</b>: Emzir → başlar, tekrar dokun → biter.</li>
        <li>• Yanlış bastın? Altta 6 saniye <b>Geri al</b> çıkar.</li>
        <li>• "20 dk önce oldu" → Şerit'te kayda dokun, saati kaydır.</li>
        <li>• Alttaki kutuya <b>söyle</b>: "sağdan on beş dakika emdi".</li>
        <li>• Üstteki fotoğrafa dokun → büyüme ve albüm.</li>
      </ul>
      <button className="btn btn-accent text-sm self-end px-4" style={{ minHeight: 36 }} onClick={close}>Anladım</button>
    </div>
  );
}
