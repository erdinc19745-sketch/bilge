import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInDays, differenceInHours, format } from "date-fns";
import { tr } from "date-fns/locale";
import { addEvent, db } from "../../db/db";
import type { Baby, BabyEvent } from "../../db/types";
import { Chip, Icon } from "../../lib/icons";

/**
 * Sarılık takibi — ilk 28 gün.
 * TND Yenidoğan Sarılığı rehberi: taburculuk yaşına göre kontrol (72/96/120. saat); term bebekte 2 haftayı
 * geçen sarılık "uzamış"; açık kaka + koyu idrar kolestaz şüphesi; 7 günden sonra yeni başlayan sarılık araştırılır.
 * Günlük gözlem Kramer bölgeleriyle: 0 yok · 1 yüz · 2 gövde · 3 kol-bacak · 4 avuç içi / ayak tabanı.
 */
const ZONES = ["Yok", "Yüz / gözaklar", "Gövde (göbeğe kadar)", "Kol ve bacaklar", "Avuç içi / ayak tabanı"];

export default function JaundiceCard({ baby, recent, onDone }: { baby: Baby; recent: BabyEvent[]; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const ageDays = differenceInDays(Date.now(), new Date(baby.birthDate));
  const ageHours = differenceInHours(Date.now(), new Date(baby.birthDate));
  const logs = recent.filter((e) => e.type === "sarilik").sort((a, b) => b.start - a.start);
  const last = logs[0];
  const lastZone = last?.zone ?? undefined;
  const dischargeAt = baby.dischargeAt;

  // Kontrol zamanı: taburculuk yaşına göre (TND)
  let dueHour: number | undefined;
  if (dischargeAt) {
    const dAge = differenceInHours(dischargeAt, new Date(baby.birthDate));
    dueHour = dAge < 24 ? 72 : dAge < 48 ? 96 : 120;
  }
  const dueAt = dueHour ? new Date(baby.birthDate).getTime() + dueHour * 3600_000 : undefined;
  const all = useLiveQuery(() => db.scheduleDone.get("izlem3"), []); // 15. gün izlemi yapıldıysa artık kontrol geçmiştir
  void all;

  // Uyarı mantığı
  const warnings: string[] = [];
  if (lastZone && lastZone >= 3) warnings.push("Sarılık kol-bacaklara/avuç içine inmiş görünüyor — bugün hekime, bilirubin ölçümü gerekebilir.");
  if (lastZone && ageDays >= 14) warnings.push("14. günü geçen sarılık 'uzamış sarılık' sayılır: aile hekimine söyle (çoğu anne sütü sarılığıdır, emzirme kesilmez; ama açık kaka/koyu idrar araştırılır).");
  const paleStool = recent.some((e) => e.type === "bez" && e.stoolColor && e.stoolColor <= 3);
  if (lastZone && paleStool) warnings.push("Sarılık + soluk renkli kaka: aynı gün hekim (safra yolu değerlendirmesi).");
  if (lastZone && logs.length > 1 && logs.slice(1).every((l) => !l.zone) && ageDays > 7) warnings.push("7. günden sonra yeni başlayan sarılık araştırılmalı.");

  const logZone = async (z: number) => {
    const id = await addEvent({ type: "sarilik", start: Date.now(), zone: z, note: ZONES[z] });
    onDone("sarilik", z ? `Sarılık: ${ZONES[z]}` : "Sarılık yok", () => db.events.delete(id));
  };

  return (
    <>
      <div className="section-title">Sarılık takibi <span className="normal-case tracking-normal font-normal">· ilk 4 hafta</span></div>
      <button className="tile" onClick={() => setOpen((v) => !v)}>
        <Chip name="sun" tone={warnings.length ? "danger" : lastZone ? "biberon" : "accent"} size={40} />
        <span className="flex-1 min-w-0 text-left">
          <span className="block font-semibold leading-tight" style={{ fontSize: 17 }}>{lastZone === undefined ? "Bugün sarılık var mı?" : lastZone ? `Sarılık: ${ZONES[lastZone]}` : "Sarılık yok"}</span>
          <span className="block text-xs leading-tight mt-0.5" style={{ opacity: 0.75 }}>
            {last ? `son gözlem ${format(last.start, "d MMM HH:mm", { locale: tr })}` : "günde bir kez gün ışığında bak"}{dueAt && Date.now() < dueAt ? ` · kontrol ${format(dueAt, "d MMM HH:mm", { locale: tr })}'e kadar` : ""}
          </span>
        </span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={18} />
      </button>
      {warnings.length > 0 && (
        <div className="rounded-xl p-3 text-sm flex flex-col gap-1" style={{ background: "color-mix(in srgb, #e8703f 16%, var(--card))" }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
      {open && (
        <div className="card slide-up flex flex-col gap-3 -mt-1">
          <p className="text-xs muted">Gün ışığında, bebeğin cildine parmakla hafif bastırıp bırak: kalan renk sarıysa sarılık var. Yukarıdan aşağı yayılır; ne kadar aşağıdaysa o kadar önemlidir.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {ZONES.map((z, i) => (
              <button key={i} className={`btn text-sm text-left px-4 ${lastZone === i ? "btn-accent" : ""}`} style={{ minHeight: 44 }} onClick={() => logZone(i)}>
                {i}. {z}{i >= 3 ? " — hekim" : ""}
              </button>
            ))}
          </div>

          <div className="text-xs muted flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between">
              <span>Hastaneden çıkış zamanı {dischargeAt ? `· ${format(dischargeAt, "d MMM HH:mm", { locale: tr })}` : "(kontrol zamanı için)"}</span>
              <input type="datetime-local" className="input mt-0 w-auto text-xs" style={{ padding: "4px 8px" }} defaultValue={dischargeAt ? format(dischargeAt, "yyyy-MM-dd'T'HH:mm") : ""} onChange={(e) => e.target.value && db.baby.update("me", { dischargeAt: new Date(e.target.value).getTime() })} />
            </div>
            {dueHour && <div>TND kuralı: {dueHour === 72 ? "24 saatten önce" : dueHour === 96 ? "24-48 saat arasında" : "48-72 saat arasında"} taburcu → yaşamın <b>{dueHour}. saatinde</b> (≈ {format(dueAt!, "d MMM HH:mm", { locale: tr })}) aile hekimi/çocuk hekimi kontrolü; tartı, kayıp yüzdesi, emme, idrar-kaka sayısı ve rengi değerlendirilir.{ageHours > dueHour ? " Bu zaman geçti; kontrol yapılmadıysa yarın bekleme." : ""}</div>}
            <div>Sarılık ilk 24 saatte başlarsa ya da 14 günü geçerse: hekim. Anne sütü sarılığı 12 haftaya uzayabilir ve zararsızdır — ama bunu hekim söyler, biz değil.</div>
            <div>Türkiye'de G6PD enzim eksikliği sık: naftalin (güve ilacı), bakla gibi hemoliz tetikleyicilerden uzak tutun.</div>
            <div className="text-[10px]">Kaynak: Türk Neonatoloji Derneği, Yenidoğan Sarılıklarında Yaklaşım, İzlem ve Tedavi Rehberi; Kramer bölgeleri.</div>
          </div>
        </div>
      )}
    </>
  );
}
