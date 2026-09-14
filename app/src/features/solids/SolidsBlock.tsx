import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, differenceInDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { addEvent, db } from "../../db/db";
import type { Baby, BabyEvent } from "../../db/types";
import { Chip, Icon } from "../../lib/icons";
import ActionTile from "../log/ActionTile";

/**
 * Ek gıda (tamamlayıcı beslenme). WHO 2023: 6. ayda (180. gün) başla, emzirmeye devam; et/balık/yumurta ve
 * meyve-sebze her gün; şeker/tuz/şekerli içecek yok; yumurta ve yer fıstığını geciktirme.
 * 5,5 aya kadar geri sayım + hazırlık işaretleri; sonra besin kaydı, alerjen tanıtım takibi, tepki uyarısı.
 */
const ALLERGENS = ["yumurta", "yer fıstığı", "inek sütü (yoğurt)", "buğday", "balık", "susam", "soya", "kabuklu yemiş"];
const REACTIONS = [["yok", "Tepki yok"], ["dokuntu", "Döküntü / kızarıklık"], ["kusma", "Kusma"], ["ishal", "İshal"], ["huzursuz", "Huzursuzluk / gaz"], ["solunum", "Hırıltı / dudakta şişme — ACİL"]] as const;
const READY = ["Desteksiz ya da hafif destekle oturabiliyor, başını dik tutuyor", "Yemeğe ilgi gösteriyor, uzanıyor, ağzını açıyor", "Kaşığı diliyle dışarı itme refleksi azaldı", "Nesneleri kavrayıp ağzına götürüyor"];

export default function SolidsBlock({ baby, recent, lit, onDone }: { baby: Baby; recent: BabyEvent[]; lit: string | null; onDone: (k: string, msg: string, undo?: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const ageDays = differenceInDays(Date.now(), parseISO(baby.birthDate));
  const startAt = addMonths(parseISO(baby.birthDate), 6);
  const daysLeft = differenceInDays(startAt, Date.now());
  const active = ageDays >= 165; // 5,5 aydan itibaren kayıt açılır
  const logs = useLiveQuery(() => db.events.where("type").equals("ekgida").reverse().sortBy("start"), []) ?? [];
  const foods = Array.from(new Set(logs.map((l) => l.food).filter(Boolean))) as string[];
  const introduced = new Set(logs.map((l) => l.food?.toLowerCase()));
  const badReactions = recent.filter((e) => e.type === "ekgida" && e.reaction && e.reaction !== "yok");

  const [food, setFood] = useState("");
  const [reaction, setReaction] = useState<(typeof REACTIONS)[number][0]>("yok");
  const save = async () => {
    if (!food.trim()) return;
    const id = await addEvent({ type: "ekgida", start: Date.now(), food: food.trim(), reaction });
    onDone("ekgida", `${food.trim()} kaydedildi${reaction !== "yok" ? " · tepki not edildi" : ""}`, () => db.events.delete(id));
    setFood(""); setReaction("yok");
  };

  if (!active) {
    return (
      <>
        <div className="section-title">Ek gıda</div>
        <button className="tile" onClick={() => setOpen((v) => !v)}>
          <Chip name="bottle" tone="biberon" size={40} />
          <span className="flex-1 min-w-0 text-left">
            <span className="block font-semibold leading-tight" style={{ fontSize: 17 }}>Ek gıdaya {daysLeft} gün</span>
            <span className="block text-xs leading-tight mt-0.5" style={{ opacity: 0.75 }}>WHO: 6. ayda ({format(startAt, "d MMMM", { locale: tr })}) başla, emzirmeye devam</span>
          </span>
          <Icon name={open ? "chevronDown" : "chevronRight"} size={18} />
        </button>
        {open && (
          <div className="card slide-up flex flex-col gap-2 -mt-1 text-sm">
            <div className="font-semibold text-xs muted uppercase tracking-wide">Hazır olduğunun işaretleri (4'ü birlikte)</div>
            <ul className="flex flex-col gap-1">{READY.map((r, i) => <li key={i} className="flex gap-2"><span className="muted">•</span>{r}</li>)}</ul>
            <div className="font-semibold text-xs muted uppercase tracking-wide pt-1">WHO 2023 — 7 öneri, kısaca</div>
            <ul className="flex flex-col gap-1">
              <li>• 6. ayda (180. gün) başla; 4. aydan önce asla, 6. aydan sonraya bırakma</li>
              <li>• Emzirmeye 2 yaşa kadar devam</li>
              <li>• <b>Et, balık ya da yumurta her gün</b> (demir ve çinko için); meyve-sebze her gün</li>
              <li>• Şekerli içecek yok; şeker, tuz, trans yağ eklenmez; %100 meyve suyu bile önerilmez</li>
              <li>• Yumurta ve yer fıstığını geciktirme: erken tanıtım alerjiyi azaltır (pürüzsüz, boğulma riski olmadan)</li>
              <li>• "Devam sütü" gerekmez; 12. aydan sonra tam yağlı inek sütü olabilir</li>
              <li>• Duyarlı besleme: açlık/tokluk işaretlerine bak, zorlama, ekranı kapat</li>
            </ul>
            <p className="text-[10px] muted">Kaynak: WHO Guideline for complementary feeding of infants and young children 6–23 months (2023); AAP allergen erken tanıtım.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="section-title">Ek gıda</div>
      {badReactions.length > 0 && (
        <div className="rounded-xl p-3 text-xs" style={{ background: "color-mix(in srgb, #e8703f 16%, var(--card))" }}>
          Son 7 günde tepki kaydı: {badReactions.map((b) => `${b.food} (${REACTIONS.find((r) => r[0] === b.reaction)?.[1]})`).join(", ")}. Aynı besini tekrar vermeden hekime sor; hırıltı/dudak şişmesi varsa 112.
        </div>
      )}
      <ActionTile k="ekgida-ac" lit={lit} icon="bottle" tone="biberon" title="Ek gıda kaydı" sub={logs.length ? `${introduced.size} besin tanıtıldı · son: ${logs[0].food}` : "ilk lokma — tek besin, 3 gün ara, tepkiyi izle"} right={<Icon name={open ? "chevronDown" : "chevronRight"} size={18} />} onTap={() => setOpen((v) => !v)} />
      {open && (
        <div className="card slide-up flex flex-col gap-3 -mt-1">
          {foods.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
              {foods.slice(0, 12).map((f) => <button key={f} className="text-xs px-2 py-1 rounded-lg whitespace-nowrap" style={{ background: "var(--card-2)" }} onClick={() => setFood(f)}>{f}</button>)}
            </div>
          )}
          <input className="input mt-0" placeholder="besin (ör. muz püresi, yumurta sarısı)" value={food} onChange={(e) => setFood(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <div className="grid grid-cols-2 gap-1.5">
            {REACTIONS.map(([v, l]) => (
              <button key={v} className={`btn text-xs ${reaction === v ? "btn-accent" : ""}`} style={{ minHeight: 36, ...(v === "solunum" ? { color: reaction === v ? undefined : "#e8703f" } : {}) }} onClick={() => setReaction(v)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-accent" style={{ minHeight: 48 }} onClick={save} disabled={!food.trim()}>Kaydet</button>
          <div>
            <div className="text-xs muted mb-1">Alerjen tanıtımı (erken tanıtım önerilir; her biri tek başına, sabah, 3 gün ara)</div>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGENS.map((a) => {
                const done = [...introduced].some((f) => f && a.split(" ")[0] && f.includes(a.split(" ")[0]));
                return <span key={a} className="text-xs px-2 py-1 rounded-lg" style={{ background: done ? "color-mix(in srgb, var(--c-bez) 18%, transparent)" : "var(--card-2)" }}>{done ? "✓ " : ""}{a}</span>;
              })}
            </div>
          </div>
          <p className="text-[10px] muted">Bal 1 yaşından önce verilmez (botulizm). Bütün üzüm, fındık, sert havuç boğulma riski — ezilmiş/pürüzsüz verin. Kaynak: WHO 2023, AAP.</p>
        </div>
      )}
    </>
  );
}
