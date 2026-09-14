import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInDays, startOfDay, subDays } from "date-fns";
import { db } from "../../db/db";
import type { Baby, BabyEvent } from "../../db/types";
import { Chip, type IconName } from "../../lib/icons";
import { fmtDuration } from "../../lib/time";
import { percentile, zScore } from "../growth/percentile";

/**
 * "Her şey yolunda mı?" — son 24 saat / 7 gün ve tartılar, yaşa göre yayımlanmış eşiklerle karşılaştırılır.
 *
 * Durumlar: iyi · izle (yumuşak sinyal / kayıt eksik olabilir) · dikkat (güçlü kanıtlı eşik) · veri yok.
 * "dikkat" yalnızca AAP / WHO / Sağlık Bakanlığı'nın açık eşiklerinde verilir; kalan her şey "izle".
 * Bu bir tarama yardımcısıdır; teşhis koymaz, hekimin yerine geçmez. Kaynaklar aşağıda (SOURCES).
 */
type Status = "iyi" | "izle" | "dikkat" | "veri-yok";
interface Row { icon: IconName; tone: "uyku" | "emzirme" | "bez" | "biberon" | "accent" | "danger" | "muted"; title: string; value: string; status: Status; note?: string; src: string }

const SOURCES: Record<string, string> = {
  SB: "T.C. Sağlık Bakanlığı, Bebek-Çocuk-Ergen İzlem Protokolleri (2018): 24 saatte ≥8 emme; 1 günden büyük bebek günde ≥6 idrar.",
  AAP_FEED: "AAP HealthyChildren.org — How Often and How Much Should Your Baby Eat: yenidoğan günde 8-12 kez.",
  AAP_DIAPER: "AAP HealthyChildren.org — Baby's First Days: Bowel Movements & Urination: 1. gün 1-2 ıslak bez, 5-7. günden sonra ≥6; ilk günlerde günde 3-4 kaka.",
  AAP_WEIGHT: "AAP / WHO: doğumdan sonra %7-10'a kadar kayıp normal, 10-14. günde doğum kilosuna dönüş; sonra ilk 4-6 ay 140-200 g/hafta (20-30 g/gün).",
  WHO: "WHO Child Growth Standards (2006): persentil ve z-skor.",
  NSF: "National Sleep Foundation (2015): 0-3 ay 14-17 sa, 4-11 ay 12-15 sa (uygun aralık; 11-19 / 10-18 kabul edilebilir).",
  AAP_FEVER: "AAP HealthyChildren.org — Fever: <3 ay ≥38,0 °C (rektal) hemen hekim; 3-6 ay ≥38,3 °C; >6 ay ≥38,9 °C ya da genel durum kötü.",
  SB_DVIT: "Sağlık Bakanlığı: 15. günden 1 yaşına kadar her gün 400 IU D vitamini.",
  TND: "Türk Neonatoloji Derneği, Yenidoğan Sarılıklarında Yaklaşım, İzlem ve Tedavi Rehberi: taburculuk yaşına göre 72/96/120. saat kontrol; term >2 hafta uzamış sarılık; açık kaka + koyu idrar → kolestaz.",
  TAIWAN: "Kaka rengi kartı (Tayvan Ulusal Tarama, Japonya): soluk/kil rengi → biliyer atrezi şüphesi, 60 gün içinde tanı kritik.",
};

const STYLE: Record<Status, { bg: string; label: string }> = {
  iyi: { bg: "color-mix(in srgb, var(--c-bez) 14%, transparent)", label: "iyi" },
  izle: { bg: "color-mix(in srgb, #e2b93b 18%, transparent)", label: "izle" },
  dikkat: { bg: "color-mix(in srgb, #e8703f 18%, transparent)", label: "dikkat" },
  "veri-yok": { bg: "var(--line)", label: "veri yok" },
};

export default function Assessment({ baby }: { baby: Baby }) {
  const now = Date.now();
  const from7 = startOfDay(subDays(now, 7)).getTime();
  const events = useLiveQuery(() => db.events.where("start").aboveOrEqual(from7).toArray(), [from7]) ?? [];
  const measurements = useLiveQuery(() => db.measurements.orderBy("at").toArray(), []) ?? [];
  const [showSrc, setShowSrc] = useState(false);
  const ageDays = differenceInDays(now, new Date(baby.birthDate));
  const ageMonths = ageDays / 30.4375;
  const last24 = (e: BabyEvent) => e.start >= now - 86_400_000;
  const has = (t: BabyEvent["type"] | BabyEvent["type"][]) => events.some((e) => (Array.isArray(t) ? t.includes(e.type) : e.type === t));
  const rows: Row[] = [];

  /* 1) Beslenme sıklığı (24 sa) */
  const feeds24 = events.filter((e) => (e.type === "emzirme" || e.type === "biberon") && last24(e)).length;
  if (ageMonths < 6) {
    const target = ageMonths < 3 ? 8 : 6;
    rows.push({
      icon: "baby", tone: "emzirme", title: "Beslenme (24 sa)", value: `${feeds24} kez`, src: "SB, AAP_FEED",
      status: !has(["emzirme", "biberon"]) ? "veri-yok" : feeds24 >= target ? "iyi" : feeds24 >= target - 2 ? "izle" : "dikkat",
      note: ageMonths < 3 ? "beklenen 8-12; 6-7 ise izle, ≤5 ise hekime söyle (uykucu bebek 3 saatte bir uyandırılır)" : "beklenen ≥6",
    });
  }

  /* 2) Islak bez (24 sa): 1-5. gün gün sayısı kadar, 6. günden ≥6 */
  const wet24 = events.filter((e) => e.type === "bez" && e.diaper !== "kaka" && last24(e)).length;
  const wetTarget = ageDays < 6 ? Math.max(1, Math.min(5, ageDays + 1)) : 6;
  rows.push({
    icon: "droplet", tone: "bez", title: "Çiş bezi (24 sa)", value: `${wet24}`, src: "AAP_DIAPER, SB",
    status: !has("bez") ? "veri-yok" : wet24 >= wetTarget ? "iyi" : wet24 >= wetTarget - 1 ? "izle" : "dikkat",
    note: `beklenen ≥ ${wetTarget}${ageDays < 6 ? " (ilk hafta: yaşadığı gün sayısı kadar)" : "; açık sarı/renksiz idrar"} — yeterli süt aldığının en güvenilir göstergesi`,
  });

  /* 3) Kaka: ilk 4 hafta günde ≥1 beklenir; 6 haftadan sonra anne sütüyle seyrek olabilir; soluk renk her yaşta dikkat */
  const poo24 = events.filter((e) => e.type === "bez" && e.diaper !== "islak" && last24(e)).length;
  const poo48 = events.filter((e) => e.type === "bez" && e.diaper !== "islak" && e.start >= now - 2 * 86_400_000).length;
  const pale = events.some((e) => e.type === "bez" && e.stoolColor && e.stoolColor <= 3);
  rows.push({
    icon: "poo", tone: "bez", title: "Kaka", value: `${poo24} / 24 sa`, src: "AAP_DIAPER, TAIWAN",
    status: pale ? "dikkat" : !has("bez") ? "veri-yok" : ageDays < 28 ? (poo24 >= 1 ? "iyi" : poo48 >= 1 ? "izle" : "dikkat") : "iyi",
    note: pale ? "soluk / kil rengi kayıt var — aynı gün hekime (safra yolu taraması)" : ageDays < 28 ? "ilk haftalarda günde 3-4 olağan; 48 saat yoksa hekime söyle" : "6 haftadan sonra anne sütüyle günlerce olmayabilir; yumuşaksa normaldir",
  });

  /* 4) Uyku (dünkü toplam) — kayıt eksikliği çok olası: yalnızca izle */
  const day0 = startOfDay(now).getTime(), dayPrev = day0 - 86_400_000;
  const sleepPrev = events.filter((e) => e.type === "uyku").reduce((s, e) => s + Math.max(0, Math.min(e.end ?? now, day0) - Math.max(e.start, dayPrev)), 0) / 3600_000;
  const rng: [number, number] = ageMonths < 4 ? [14, 17] : ageMonths < 12 ? [12, 15] : [11, 14];
  rows.push({
    icon: "moon", tone: "uyku", title: "Uyku (dün, toplam)", value: sleepPrev ? fmtDuration(sleepPrev * 3600_000) : "—", src: "NSF",
    status: !has("uyku") || sleepPrev === 0 ? "veri-yok" : sleepPrev >= rng[0] - 2 && sleepPrev <= rng[1] + 2 ? "iyi" : "izle",
    note: `uygun aralık ${rng[0]}-${rng[1]} sa; kaydedilmeyen uykular toplamı düşürür — yorumlamadan önce kayıtları kontrol et`,
  });

  /* 5) Kilo: doğum kilosu kaybı, doğum kilosuna dönüş, g/gün (≥5 gün aralıkla) */
  const w = measurements.filter((m) => m.weightG);
  const birthW = w.find((m) => differenceInDays(m.at, new Date(baby.birthDate)) <= 1);
  if (w.length >= 2) {
    const last = w[w.length - 1];
    const lastAge = differenceInDays(last.at, new Date(baby.birthDate));
    const z = zScore(baby.sex, "weight", lastAge / 30.4375, last.weightG! / 1000);
    let status: Status = "iyi", note = "", value = "";
    if (birthW && lastAge <= 14) {
      const loss = (birthW.weightG! - last.weightG!) / birthW.weightG!;
      value = `${loss > 0 ? "−" : "+"}%${Math.abs(loss * 100).toFixed(1)} (doğum ${birthW.weightG} g → ${last.weightG} g, ${lastAge}. gün)`;
      if (loss > 0.10) { status = "dikkat"; note = "doğum kilosunun %10'undan fazla kayıp — hekime bugün söyle (beslenme değerlendirmesi)"; }
      else if (loss > 0.07) { status = "izle"; note = "%7-10 kayıp sınırda; 10-14. günde doğum kilosuna dönmeli"; }
      else if (lastAge >= 14 && loss > 0) { status = "dikkat"; note = "14. günde hâlâ doğum kilosunun altında — hekime söyle"; }
      else note = "ilk günlerde %7'ye kadar kayıp normal; doğum kilosuna dönüş 10-14. günde";
    } else {
      // Son iki ölçüm arası artış hızı; kısa aralık gürültülü
      let i = w.length - 2;
      while (i > 0 && differenceInDays(last.at, w[i].at) < 5) i--;
      const prev = w[i];
      const days = Math.max(1, differenceInDays(last.at, prev.at));
      const perDay = (last.weightG! - prev.weightG!) / days;
      const target = ageMonths < 4 ? 20 : ageMonths < 6 ? 15 : ageMonths < 12 ? 8 : 5;
      value = `${perDay >= 0 ? "+" : ""}${Math.round(perDay)} g/gün (${days} günde) · P${z == null ? "?" : percentile(z)}`;
      if (days < 5) { status = "izle"; note = "iki tartı arası 5 günden kısa; artış hızı için en az 1 hafta ara beklenir"; }
      else if (perDay >= target) note = `beklenen ≥ ${target} g/gün (${ageMonths < 4 ? "140-200 g/hafta" : "yaşa göre"})`;
      else if (perDay >= target * 0.7) { status = "izle"; note = `beklenenin (${target} g/gün) biraz altında; bir sonraki tartıda tekrar bak`; }
      else { status = "dikkat"; note = `beklenenin (${target} g/gün) belirgin altında — hekime söyle; aynı tartı, çıplak, aynı saat önemli`; }
      if (z != null && z < -2) { status = "dikkat"; note += " · WHO'ya göre P3'ün altında"; }
    }
    rows.push({ icon: "ruler", tone: "accent", title: "Kilo", value, status, note, src: "AAP_WEIGHT, WHO" });
  } else {
    rows.push({ icon: "ruler", tone: "accent", title: "Kilo", value: w.length === 1 ? "tek ölçüm" : "—", status: "veri-yok", src: "AAP_WEIGHT, WHO",
      note: "Doğum kilosunu (sağlık karnesi) doğum tarihiyle, sonra her aile hekimi tartısını gir → kayıp/dönüş ve g/gün hesaplanır" });
  }

  /* 5b) Sarılık (ilk 4 hafta, gözlem kaydı varsa) */
  const jl = events.filter((e) => e.type === "sarilik").sort((a, b) => b.start - a.start)[0];
  if (jl && ageDays <= 28) {
    const z = jl.zone ?? 0;
    rows.push({ icon: "sun", tone: "biberon", title: "Sarılık", value: z ? `bölge ${z}` : "yok", src: "TND",
      status: z >= 3 || (z > 0 && ageDays >= 14) ? "dikkat" : z > 0 ? "izle" : "iyi",
      note: z >= 3 ? "kol-bacak/avuç içine inmiş: bugün hekim, bilirubin ölçümü" : z > 0 && ageDays >= 14 ? "14 günü geçen sarılık: hekime söyle (uzamış sarılık)" : z > 0 ? "yüz/gövdede; gün ışığında günlük izle, kol-bacağa inerse hekim" : "gözlemde sarılık yok" });
  }

  /* 6) D vitamini (15. günden itibaren) */
  if (ageDays >= 15) {
    const dvitToday = events.some((e) => e.type === "ilac" && e.medName === "D vitamini" && e.start >= day0);
    const dvit7 = new Set(events.filter((e) => e.type === "ilac" && e.medName === "D vitamini").map((e) => startOfDay(e.start).getTime())).size;
    rows.push({ icon: "pill", tone: "accent", title: "D vitamini", value: `${dvitToday ? "bugün verildi" : "bugün henüz yok"} · ${dvit7}/7 gün`, src: "SB_DVIT",
      status: dvitToday ? "iyi" : new Date().getHours() < 14 ? "iyi" : dvit7 >= 5 ? "izle" : "dikkat", note: "günde 400 IU (3 damla), 1 yaşına kadar her gün; kaçan gün telafi edilmez, ertesi gün normal doz" });
  }

  /* 7) Ateş (24 sa) — yaşa göre AAP eşikleri; düşük ısı da yenidoğanda önemli */
  const temps = events.filter((e) => e.type === "ates" && last24(e));
  if (temps.length) {
    const hi = temps.reduce((a, b) => (b.tempC! > a.tempC! ? b : a));
    const lo = temps.reduce((a, b) => (b.tempC! < a.tempC! ? b : a));
    const th = ageMonths < 3 ? 38.0 : ageMonths < 6 ? 38.3 : 38.9;
    const status: Status = hi.tempC! >= th || lo.tempC! < 36.0 ? "dikkat" : hi.tempC! >= 37.5 ? "izle" : "iyi";
    rows.push({ icon: "thermometer", tone: "danger", title: "Ateş (24 sa)", value: `${hi.tempC?.toFixed(1)} °C en yüksek`, status, src: "AAP_FEVER",
      note: status === "dikkat" ? (lo.tempC! < 36 ? "36 °C altı: yenidoğanda hipotermi de acildir" : `${ageMonths < 3 ? "3 aydan küçükte ≥ 38,0 °C: hemen hekim/acil" : `bu yaşta ≥ ${th} °C: hekime başvur`}`) : `eşik ${th} °C (rektal); koltuk altı ölçümü ~0,5 °C düşük okur` });
  }

  const dikkat = rows.filter((r) => r.status === "dikkat").length;
  const izle = rows.filter((r) => r.status === "izle").length;

  return (
    <section className="card flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="section-title" style={{ margin: 0 }}>Her şey yolunda mı?</div>
        <span className="text-xs muted">{dikkat ? `${dikkat} dikkat` : ""}{dikkat && izle ? " · " : ""}{izle ? `${izle} izle` : ""}{!dikkat && !izle ? "dikkat gerektiren yok" : ""}</span>
      </div>
      <div className="flex flex-col divide-y divide-(--line)">
        {rows.map((r) => {
          const st = STYLE[r.status];
          return (
            <div key={r.title} className="flex items-center gap-3 py-2">
              <Chip name={r.icon} tone={r.status === "dikkat" ? "danger" : r.tone} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">{r.title} <span className="tabular-nums muted font-normal">{r.value}</span></div>
                {r.note && <div className="text-[11px] muted leading-tight">{r.note}</div>}
              </div>
              <span className="text-[10px] px-2 py-1 rounded-lg font-semibold shrink-0" style={{ background: st.bg }}>{st.label}</span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] muted leading-snug">
        Tarama yardımcısıdır, teşhis koymaz. <b>dikkat</b> = yayımlanmış eşik aşıldı, hekime bugün söyle · <b>izle</b> = yumuşak sinyal ya da eksik kayıt · yalnız son 24 sa / 7 gün ve tartılara bakar, geçmiş veri gerekmez.
        <button className="underline ml-1" onClick={() => setShowSrc((v) => !v)}>{showSrc ? "kaynakları gizle" : "kaynaklar"}</button>
      </div>
      {showSrc && (
        <ul className="text-[10px] muted flex flex-col gap-1 pl-3 list-disc">
          {Object.values(SOURCES).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </section>
  );
}
