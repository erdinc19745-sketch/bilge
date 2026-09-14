import { useState } from "react";
import { averageCenterColor, nearestSwatch, SWATCHES } from "./stoolCard";

/**
 * Renk kartı seçici. Kaka kaydından sonra şerit olarak (isteğe bağlı) ya da düzenleme panelinde.
 * Soluk renk (1-3) seçilirse uyarı: aynı gün hekime.
 */
export default function StoolColorPicker({ value, onChange, compact }: { value?: number; onChange: (n: number) => void; compact?: boolean }) {
  const [hint, setHint] = useState<string>("");
  const [suggest, setSuggest] = useState<number | null>(null);

  const fromPhoto = async (f: File) => {
    try {
      const rgb = await averageCenterColor(f);
      const { swatch, distance } = nearestSwatch(rgb);
      setSuggest(swatch.n);
      setHint(distance > 25 ? `Fotoğraf net karar için yeterli değil; en yakın: ${swatch.n} (${swatch.label}). Gün ışığında bez karta bakarak seç.` : `Fotoğrafa en yakın renk: ${swatch.n} (${swatch.label}). Doğruysa dokun.`);
    } catch { setHint("Fotoğraf okunamadı."); }
  };
  const sel = SWATCHES.find((s) => s.n === value);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {SWATCHES.map((s) => (
          <button
            key={s.n}
            onClick={() => onChange(s.n)}
            className="rounded-xl flex flex-col items-center justify-end pb-1 text-[10px] font-semibold"
            style={{
              background: s.hex, color: s.n <= 4 ? "#3a2f10" : "#fff", height: compact ? 44 : 56,
              outline: value === s.n ? "3px solid var(--accent)" : suggest === s.n ? "2px dashed var(--accent)" : "none", outlineOffset: -3,
            }}
            aria-label={`${s.n} ${s.label}`}
          >
            {s.n}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs muted">
        <span>1-3 soluk (dikkat) · 4-7 normal{sel ? ` · seçili: ${sel.n} ${sel.label}` : ""}</span>
        <label className="underline cursor-pointer">
          📷 fotoğrafla
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fromPhoto(e.target.files[0])} />
        </label>
      </div>
      {hint && <p className="text-xs muted">{hint}</p>}
      {sel?.abnormal && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, #b3423a 18%, var(--card))" }}>
          <b>Soluk / kil rengi kaka</b> safra akışı sorununun (biliyer atrezi) belirtisi olabilir; erken tanı çok önemli, ilk 60 gün kritik.
          <b> Aynı gün aile hekimine ya da çocuk doktoruna gösterin</b> — bezi ya da fotoğrafını yanınıza alın. Tek başına teşhis değildir.
        </div>
      )}
    </div>
  );
}
