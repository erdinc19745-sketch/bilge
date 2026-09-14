import { useState } from "react";
import { Chip, Icon, type IconName } from "../../lib/icons";
import { setSegment } from "../log/layout";

const KEY = "bilge.onboarded";
export const isOnboarded = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };

/**
 * İlk açılış turu — 3 ekran, 30 saniye. Bebek kaydı oluştuktan (ya da davetle indikten) sonra bir kez.
 * Son ekran doğum kilosunu girmeye yönlendirir (değerlendirme kartının "veri yok" satırı için).
 */
const SLIDES: { icon: IconName; tone: "emzirme" | "uyku" | "accent"; title: string; lines: string[] }[] = [
  { icon: "plus", tone: "emzirme", title: "Gece 3'te tek dokunuş", lines: ["Kayıt ekranının Hızlı bölmesi: Sol/Sağ emzir, Çiş/Kaka, Uyudu — dokun, kaydolur.", "Yanlış bastın? Altta 6 saniye Geri al çıkar.", "Yüzen 🎤: “sağdan on beş dakika emdi ve kaka yaptı” de — kendi kaydeder.", "Geç mi durdurdun? Kayıttan sonra çıkan şeritten süreyi düzelt."] },
  { icon: "chart", tone: "uyku", title: "Her şey yolunda mı?", lines: ["Özet sekmesi son 24 saati Sağlık Bakanlığı / AAP / WHO eşikleriyle karşılaştırır: iyi · izle · dikkat.", "Aile hekimine giderken 🩺 Rapor: tek sayfa, yazdır ya da WhatsApp'la gönder.", "Takvim: aşı ve izlem günleri, iPhone alarmıyla."] },
  { icon: "ruler", tone: "accent", title: "İlk iş: doğum kilosu", lines: ["Sağlık karnesindeki doğum kilosunu doğum tarihiyle gir; sonra her aile hekimi tartısını.", "İki tartıyla kilo alımı (g/gün) ve WHO persentili hesaplanır.", "Bakım bölmesi → Ölçüm kartı."] },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const finish = (goMeasure: boolean) => {
    try { localStorage.setItem(KEY, "1"); } catch { /* */ }
    if (goMeasure) setSegment("bakim");
    onDone();
  };
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="slide-up card safe-bottom rounded-b-none flex flex-col gap-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">{SLIDES.map((_, k) => <span key={k} className="w-2 h-2 rounded-full" style={{ background: k === i ? "var(--accent)" : "var(--line)" }} />)}</div>
          <button className="text-xs muted" onClick={() => finish(false)}>Atla</button>
        </div>
        <div className="flex items-center gap-3">
          <Chip name={s.icon} tone={s.tone} size={48} />
          <h2 className="text-xl font-bold">{s.title}</h2>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {s.lines.map((l, k) => <li key={k} className="flex gap-2"><Icon name="check" size={16} className="muted shrink-0 mt-0.5" /><span>{l}</span></li>)}
        </ul>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn text-base" style={{ minHeight: 52 }} onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Geri</button>
          {i < SLIDES.length - 1 ? (
            <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={() => setI(i + 1)}>Devam</button>
          ) : (
            <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={() => finish(true)}>Ölçüm kartına git</button>
          )}
        </div>
      </div>
    </div>
  );
}
