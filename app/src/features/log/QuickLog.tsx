import { parseISO } from "date-fns";
import { Fragment, lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addEvent, consumeAutoWake, db, endEvent, reopenEvent, startEvent } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtClock, fmtDuration, fmtTime } from "../../lib/time";
import VoiceInput from "./VoiceInput";
import StatusPanel from "./StatusPanel";
import MilestoneCard from "../milestones/MilestoneCard";
const WhiteNoise = lazy(() => import("../noise/WhiteNoise"));
import StoolColorPicker from "../stool/StoolColorPicker";
import { getLayout, getSegment, isVisible, SEGMENT_LABEL, SEGMENT_OF, setSegment, type Block, type Segment } from "./layout";
import { getRole } from "../family/family";
import ActionTile from "./ActionTile";
import PumpBlock from "../milk/PumpBlock";
const MotherPage = lazy(() => import("../mother/MotherPage"));
import MedsBlock from "../meds/MedsBlock";
const FatherPage = lazy(() => import("../father/FatherPage"));
import { MeasureForm } from "../growth/Growth";
import JaundiceCard from "../jaundice/JaundiceCard";
import InfoCards from "../info/InfoCards";
import SolidsBlock from "../solids/SolidsBlock";
import { computeStock } from "../milk/milk";
import { Icon } from "../../lib/icons";
import { confirmIfNeeded } from "../../lib/confirm";
import MorningCard from "./MorningCard";
import AdjustCard, { type Adjust } from "./AdjustCard";
import VaccineCard from "../calendar/VaccineCard";

/**
 * Gece modu kayıt ekranı.
 * Kurallar: en fazla 2 dokunuş; basınca buton yanar; her kayıt 6 sn "Geri al" ile geri alınabilir.
 */
export default function QuickLog() {
  /* ---- veriler ---- */
  const recent = useLiveQuery(() => db.events.orderBy("start").reverse().limit(200).toArray(), []) ?? [];
  const baby = useLiveQuery(() => db.baby.get("me"));
  const last = (pred: (e: BabyEvent) => boolean) => recent.find(pred);

  const runningFeed = last((e) => e.type === "emzirme" && e.end == null);
  const runningSleep = last((e) => e.type === "uyku" && e.end == null);
  const lastFeed = last((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");
  const lastDiaper = last((e) => e.type === "bez");
  const lastDvit = last((e) => e.type === "ilac" && e.medName === "D vitamini");

  // Kronometre çalışıyorsa saniyede bir, yoksa 30 sn'de bir yeniden çiz
  const live = !!runningFeed || !!runningSleep;
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), live ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [live]);

  /* ---- geri bildirim: toast + geri al + yanan buton ---- */
  const [toast, setToast] = useState<{ msg: string; undo?: () => Promise<void> } | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  /** Kayıt alındı: butonu yak, mesajı göster, geri alma yolunu sakla. Kayıt uykuyu kendiliğinden bitirdiyse ekle. */
  const done = (key: string, msg: string, undo?: () => Promise<void>) => {
    const w = consumeAutoWake();
    if (w) {
      msg = `${msg} · uyandı (${fmtDuration(w.sleptMs)} uyudu)`;
      const u = undo;
      undo = async () => { await u?.(); await reopenEvent(w.id); };
    }
    setLit(key);
    window.setTimeout(() => setLit((k) => (k === key ? null : k)), 700);
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
    navigator.vibrate?.(30);
  };
  const undoNow = async () => {
    setAdjust(null);
    if (toast?.undo) await toast.undo();
    setToast({ msg: "Geri alındı" });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1500);
  };

  const [layout, setLayoutState] = useState(getLayout);
  const [segment, setSeg] = useState<Segment>(getSegment);
  const pick = (s: Segment) => { setSegment(s); setSeg(s); };
  useEffect(() => {
    const on = () => setLayoutState(getLayout());
    window.addEventListener("bilge-layout", on);
    return () => window.removeEventListener("bilge-layout", on);
  }, []);
  const [bottleOpen, setBottleOpen] = useState(false);
  const [stoolFor, setStoolFor] = useState<string | null>(null); // kaka kaydı sonrası renk/kıvam sorusu
  const [stoolTexture, setStoolTexture] = useState<string | null>(null);
  const stoolTimer = useRef<number | undefined>(undefined);
  const [customMl, setCustomMl] = useState("");
  const [bottleKind, setBottleKind] = useState<"sut" | "mama">("sut");
  const [motherOpen, setMotherOpen] = useState(false);
  const [fatherOpen, setFatherOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const lastMeasure = useLiveQuery(() => db.measurements.orderBy("at").last(), []);
  const stockMl = computeStock(recent).totalMl;
  const [feverOpen, setFeverOpen] = useState(false);
  // Kayıttan sonra süre/başlangıç düzeltme şeridi (emzirme, uyku)
  const [adjust, setAdjust] = useState<(Adjust & { type: "emzirme" | "uyku" }) | null>(null);
  const adjustTimer = useRef<number | undefined>(undefined);
  const offerAdjust = (a: Adjust & { type: "emzirme" | "uyku" }) => {
    setAdjust(a);
    window.clearTimeout(adjustTimer.current);
    adjustTimer.current = window.setTimeout(() => setAdjust(null), 30_000);
  };

  const ago = (t?: number) => (t ? `${fmtDuration(Date.now() - t)} önce` : "—");
  /** Yenidoğan 2-3 saatte bir beslenir: 3 saat → sarı, 4 saat → turuncu */
  const feedTone = (t?: number) => {
    if (!t) return "tone-ok";
    const h = (Date.now() - t) / 3600_000;
    return h >= 4 ? "tone-late" : h >= 3 ? "tone-warn" : "tone-ok";
  };
  // Son emzirme soldan ise sıra sağda (ve tersi)
  const nextSide = lastFeed?.type === "emzirme" ? (lastFeed.side === "sol" ? "sag" : "sol") : undefined;
  const del = (id: string) => () => db.events.delete(id);

  /* ---- eylemler ---- */
  const feedStart = async (side: "sol" | "sag") => {
    const id = await startEvent("emzirme", { side });
    done(`emzir-${side}`, `${side === "sol" ? "Sol" : "Sağ"} emzirme başladı`, del(id));
    offerAdjust({ id, mode: "baslangic", start: Date.now(), end: 0, what: "Emzirme", type: "emzirme" });
  };
  /** Emzirirken diğer memeye geç: bu tarafı bitir, öbürünü başlat (tek dokunuş) */
  const switchSide = async (e: BabyEvent) => {
    const other = e.side === "sol" ? "sag" : "sol";
    await endEvent(e.id);
    const id = await startEvent("emzirme", { side: other });
    done(`emzir-${other}`, `${e.side === "sol" ? "Sol" : "Sağ"} bitti (${fmtDuration(Date.now() - e.start)}) · ${other === "sol" ? "Sol" : "Sağ"} başladı`, async () => { await db.events.delete(id); await reopenEvent(e.id); });
  };
  const feedEnd = async (e: BabyEvent) => {
    if (!(await confirmIfNeeded("emzirme-bitir", { title: "Emzirme bitsin mi?", text: `${fmtDuration(Date.now() - e.start)} sürdü.`, ok: "Bitir" }))) return;
    await endEvent(e.id);
    done("emzir-bitir", `Emzirme kaydedildi · ${fmtDuration(Date.now() - e.start)}`, () => reopenEvent(e.id));
    offerAdjust({ id: e.id, mode: "sure", start: e.start, end: Date.now(), what: "Emzirme", type: "emzirme" });
  };
  const bottle = async (ml: number) => {
    if (!(await confirmIfNeeded("biberon", { title: `${ml} ml ${bottleKind === "sut" ? "anne sütü" : "mama"} kaydedilsin mi?`, ok: "Kaydet" }))) return;
    const id = await addEvent({ type: "biberon", start: Date.now(), amountMl: ml, bottleKind });
    setBottleOpen(false);
    done(`ml-${ml}`, `${ml} ml ${bottleKind === "sut" ? "anne sütü" : "mama"}`, del(id));
  };
  const diaper = async (d: "islak" | "kaka" | "ikisi") => {
    if (!(await confirmIfNeeded("bez", { title: `Bez kaydedilsin mi? (${d === "islak" ? "çiş" : d === "kaka" ? "kaka" : "çiş + kaka"})`, ok: "Kaydet" }))) return;
    const id = await addEvent({ type: "bez", start: Date.now(), diaper: d });
    done(`bez-${d}`, d === "islak" ? "Çiş bezi" : d === "kaka" ? "Kaka" : "Çiş + kaka", async () => { await db.events.delete(id); setStoolFor(null); });
    if (d !== "islak") {
      setStoolTexture(null);
      setStoolFor(id);
      window.clearTimeout(stoolTimer.current);
      stoolTimer.current = window.setTimeout(() => setStoolFor(null), 25_000);
    }
  };
  const sleepStart = async () => {
    const feed = runningFeed; // memede uyudu: emzirme de biter
    if (!(await confirmIfNeeded("uyku-baslat", { title: "Uyku başlasın mı?", text: feed ? `Devam eden ${feed.side === "sol" ? "sol" : "sağ"} emzirme de bitirilir (${fmtDuration(Date.now() - feed.start)}).` : undefined, ok: "Uyudu" }))) return;
    if (feed) await endEvent(feed.id);
    const id = await startEvent("uyku");
    done("uyku", feed ? `Uyku başladı · emzirme bitti (${fmtDuration(Date.now() - feed.start)})` : "Uyku başladı", async () => { await db.events.delete(id); if (feed) await reopenEvent(feed.id); });
    offerAdjust({ id, mode: "baslangic", start: Date.now(), end: 0, what: "Uyku", type: "uyku" });
  };
  const sleepEnd = async (e: BabyEvent) => {
    if (!(await confirmIfNeeded("uyku-bitir", { title: "Uyandı mı?", text: `${fmtDuration(Date.now() - e.start)} uyudu.`, ok: "Uyandı" }))) return;
    await endEvent(e.id);
    done("uyandi", `Uyandı · ${fmtDuration(Date.now() - e.start)} uyudu`, () => reopenEvent(e.id));
    offerAdjust({ id: e.id, mode: "sure", start: e.start, end: Date.now(), what: "Uyku", type: "uyku" });
  };
  const dvit = async () => {
    const recentDose = lastDvit && Date.now() - lastDvit.start < 20 * 3600_000;
    if (!(await confirmIfNeeded("dvit", { title: "D vitamini verildi mi?", text: recentDose ? `Dikkat: ${ago(lastDvit!.start)} zaten verilmiş görünüyor.` : "Günde 1 doz.", ok: "Verildi", danger: !!recentDose }))) return;
    const id = await addEvent({ type: "ilac", start: Date.now(), medName: "D vitamini" });
    done("dvit", "D vitamini verildi", del(id));
  };
  const fever = async (t: number) => {
    const id = await addEvent({ type: "ates", start: Date.now(), tempC: t });
    setFeverOpen(false);
    done("ates", `${t.toFixed(1)} °C kaydedildi`, del(id));
  };

  /* ---- Bloklar: Ayarlar → Kayıt ekranı düzeni'ne göre sıralanır / gizlenir ---- */
  const blocks: Record<Block, ReactNode> = {
    gelisim: baby ? <MilestoneCard baby={baby} /> : null,
    emzirme: (
      <>
        <div className="section-title">Emzirme</div>
        {runningFeed ? (
          <>
            <ActionTile k="emzir-bitir" lit={lit} accent icon="baby" title={`Emziriyor · ${runningFeed.side === "sol" ? "Sol" : "Sağ"}`} sub={`${fmtTime(runningFeed.start)}'den beri · dokun → bitir`} right={fmtClock(Date.now() - runningFeed.start)} tone="emzirme" onTap={() => feedEnd(runningFeed)} />
            <ActionTile compact k={`emzir-${runningFeed.side === "sol" ? "sag" : "sol"}`} lit={lit} icon="undo" tone="emzirme" title={`${runningFeed.side === "sol" ? "Sağa" : "Sola"} geç`} sub="bu taraf biter, öbürü başlar" onTap={() => switchSide(runningFeed)} />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ActionTile k="emzir-sol" lit={lit} icon="baby" tone="emzirme" title="Sol" sub={nextSide === "sol" ? "sıra bunda" : "emzirmeyi başlat"} hint={nextSide === "sol"} onTap={() => feedStart("sol")} />
            <ActionTile k="emzir-sag" lit={lit} icon="baby" tone="emzirme" title="Sağ" sub={nextSide === "sag" ? "sıra bunda" : "emzirmeyi başlat"} hint={nextSide === "sag"} onTap={() => feedStart("sag")} />
          </div>
        )}
        {adjust?.type === "emzirme" && <AdjustCard key={adjust.id + adjust.mode} a={adjust} onClose={() => setAdjust(null)} />}
      </>
    ),
    biberon: (
      <>
        <ActionTile k="biberon" lit={lit} icon="bottle" tone="biberon" title="Biberon" sub={bottleOpen ? "miktarı seç" : "30 · 60 · 90 · 120 ml ya da yaz"} right={<Icon name={bottleOpen ? "chevronDown" : "chevronRight"} size={18} />} onTap={() => setBottleOpen((v) => !v)} />
        {bottleOpen && (
          <div className="grid grid-cols-2 gap-2 -mt-1">
            <button className={`btn text-sm ${bottleKind === "sut" ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setBottleKind("sut")}>
              Anne sütü{stockMl > 0 ? <span className="text-[10px] font-normal opacity-80"> · stok {stockMl} ml</span> : null}
            </button>
            <button className={`btn text-sm ${bottleKind === "mama" ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setBottleKind("mama")}>Mama</button>
          </div>
        )}
        {bottleOpen && (
          <>
          <div className="grid grid-cols-4 gap-2 -mt-1">
            {[30, 60, 90, 120].map((ml) => (
              <LitButton lit={lit} key={ml} k={`ml-${ml}`} className="text-base" style={{ minHeight: 52 }} onTap={() => bottle(ml)}>
                {ml}
              </LitButton>
            ))}
          </div>
          <div className="flex gap-2 -mt-1">
            <input
              inputMode="numeric"
              placeholder="başka miktar (ml)"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && customMl && (bottle(Number(customMl)), setCustomMl(""))}
              className="input mt-0 flex-1 text-base"
              style={{ minHeight: 48 }}
            />
            <LitButton lit={lit} k={`ml-${customMl}`} accent className="text-base px-5" style={{ minHeight: 48, opacity: customMl ? 1 : 0.5 }} onTap={() => { if (customMl) { bottle(Number(customMl)); setCustomMl(""); } }}>
              Kaydet
            </LitButton>
          </div>
          </>
        )}
      </>
    ),
    bez: (
      <>
        <div className="section-title">Bez</div>
        <div className="grid grid-cols-3 gap-3">
          <ActionTile compact k="bez-islak" lit={lit} icon="droplet" tone="bez" title="Çiş" onTap={() => diaper("islak")} />
          <ActionTile compact k="bez-kaka" lit={lit} icon="poo" tone="bez" title="Kaka" onTap={() => diaper("kaka")} />
          <ActionTile compact k="bez-ikisi" lit={lit} icon="diaper" tone="bez" title="Çiş+Kaka" onTap={() => diaper("ikisi")} />
        </div>
        {stoolFor && (
          <div className="card slide-up flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold">Kaka nasıldı? <span className="muted font-normal text-xs">isteğe bağlı · kayıt zaten alındı</span></span>
              <button className="btn text-xs px-3" style={{ minHeight: 32 }} onClick={() => setStoolFor(null)}>Tamam</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([["normal", "Normal"], ["sulu", "Sulu"], ["sert", "Sert / topak"], ["kanli", "Kanlı ⚠"]] as const).map(([v, l]) => (
                <button key={v} className={`btn text-xs ${stoolTexture === v ? "btn-accent" : ""}`} style={{ minHeight: 36 }} onClick={async () => { setStoolTexture(v); await db.events.update(stoolFor, { note: l.replace(" ⚠", ""), updatedAt: Date.now() }); }}>{l}</button>
              ))}
            </div>
            {stoolTexture === "kanli" && <p className="text-xs" style={{ color: "#e8703f" }}>Bezde kan: aynı gün hekime; bezi/fotoğrafı götürün (sık nedeni anal çatlak ya da inek sütü proteini hassasiyeti, hekim değerlendirir).</p>}
            <div className="text-xs muted">Renk (kart):</div>
            <StoolColorPicker compact onChange={async (n) => { await db.events.update(stoolFor, { stoolColor: n, updatedAt: Date.now() }); }} />
          </div>
        )}
      </>
    ),
    uyku: (
      <>
        <div className="section-title">Uyku</div>
        {runningSleep ? (
          <ActionTile k="uyandi" lit={lit} accent icon="sun" tone="uyku" title="Uyandı" sub={`${fmtTime(runningSleep.start)}'den beri · dokun → uyandı (ya da bez/emzirme gir)`} right={fmtClock(Date.now() - runningSleep.start)} onTap={() => sleepEnd(runningSleep)} />
        ) : (
          <ActionTile k="uyku" lit={lit} icon="moon" tone="uyku" title="Uyudu" sub="uykuyu başlat" onTap={sleepStart} />
        )}
        {adjust?.type === "uyku" && <AdjustCard key={adjust.id + adjust.mode} a={adjust} onClose={() => setAdjust(null)} />}
      </>
    ),
    "ates-dvit": (
      <>
        <div className="section-title">Sağlık</div>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile k="ates-ac" lit={lit} icon="thermometer" tone="danger" title="Ateş" sub={feverOpen ? "derece gir" : "ölçüm kaydet"} onTap={() => setFeverOpen((v) => !v)} />
          <ActionTile k="dvit" lit={lit} icon="pill" tone="accent" title="D vitamini" sub={lastDvit ? ago(lastDvit.start) : "bugün verilmedi"} className={lastDvit && Date.now() - lastDvit.start < 20 * 3600_000 ? "opacity-60" : ""} onTap={dvit} />
        </div>
        {feverOpen && <FeverInput onDone={fever} />}
      </>
    ),
    sagma: <PumpBlock recent={recent} lit={lit} onDone={done} />,
    ilaclar: <MedsBlock recent={recent} lit={lit} onDone={done} />,
    olcum: (
      <>
        <div className="section-title">Ölçüm</div>
        <ActionTile
          k="olcum" lit={lit} icon="ruler" tone="accent" title="Kilo · boy · baş çevresi"
          sub={lastMeasure ? `son: ${lastMeasure.weightG ? `${(lastMeasure.weightG / 1000).toFixed(2)} kg` : ""}${lastMeasure.lengthCm ? ` · ${lastMeasure.lengthCm} cm` : ""} (${new Date(lastMeasure.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })})` : "doğum kilosunu ve aile hekimi tartılarını gir"}
          right={<Icon name={measureOpen ? "chevronDown" : "chevronRight"} size={18} />}
          onTap={() => setMeasureOpen((v) => !v)}
        />
        {measureOpen && <MeasureForm onDone={() => { setMeasureOpen(false); done("olcum", "Ölçüm kaydedildi"); }} />}
      </>
    ),
    // Sarılık kartı 28. günden sonra kendiliğinden kalkar
    sarilik: baby && (Date.now() - parseISO(baby.birthDate).getTime()) / 86_400_000 <= 28 ? <JaundiceCard baby={baby} recent={recent} onDone={done} /> : null,
    ekgida: baby ? <SolidsBlock baby={baby} recent={recent} lit={lit} onDone={done} /> : null,
    bilgi: <InfoCards />,
    ses: <VoiceInput onSaved={(label, undo) => done("ses", label, undo)} />,
    uykusesi: <Suspense fallback={null}><WhiteNoise /></Suspense>,
    anne: (
      <>
        <div className="section-title">Anne</div>
        <ActionTile k="anne" lit={lit} icon="heart" tone="accent" title="Anne · nasılsın?" sub="ruh hali, su, uyku, ilaç · doğum sonrası tarama" right={<Icon name="chevronRight" size={18} />} onTap={() => setMotherOpen(true)} />
        {motherOpen && <Suspense fallback={null}><MotherPage onClose={() => setMotherOpen(false)} /></Suspense>}
      </>
    ),
    baba: baby ? (
      <>
        <div className="section-title">Aile</div>
        <ActionTile k="baba" lit={lit} icon="clock" tone="uyku" title="Gece nöbeti & giderler" sub="kim kaç kez kalktı, bu gece nöbetçi, aylık harcama" right={<Icon name="chevronRight" size={18} />} onTap={() => setFatherOpen(true)} />
        {fatherOpen && <Suspense fallback={null}><FatherPage baby={baby} onClose={() => setFatherOpen(false)} /></Suspense>}
      </>
    ) : null,
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* ---- Bölme seçici ---- */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl" style={{ background: "var(--card)" }}>
        {(Object.keys(SEGMENT_LABEL) as Segment[]).map((s) => (
          <button key={s} className="rounded-xl py-2 text-sm font-semibold transition-colors" style={segment === s ? { background: "var(--accent)", color: "var(--on-accent)" } : { color: "var(--muted)" }} onClick={() => pick(s)}>
            {SEGMENT_LABEL[s]}
          </button>
        ))}
      </div>

      {segment === "hizli" && (
        <>
          <StatusPanel baby={baby} recent={recent} />
          <MorningCard recent={recent} />
          {baby && <VaccineCard baby={baby} onFever={() => { setFeverOpen(true); }} />}
          <BackupNudge />
          <div className="text-xs muted -mb-1 flex justify-between px-1">
            <span>Son bez: {ago(lastDiaper?.start)}{lastDiaper?.diaper ? ` (${lastDiaper.diaper === "islak" ? "çiş" : lastDiaper.diaper === "ikisi" ? "çiş+kaka" : "kaka"})` : ""}</span>
            <span className={feedTone(lastFeed?.end ?? lastFeed?.start)}>{lastFeed ? `son beslenme ${ago(lastFeed.end ?? lastFeed.start)}` : ""}</span>
          </div>
        </>
      )}

      {layout.order.filter((b) => isVisible(layout, b, getRole()) && SEGMENT_OF[b] === segment).map((b) => <Fragment key={b}>{blocks[b]}</Fragment>)}

      {/* ---- Toast + Geri al ---- */}
      {toast && (
        <div
          className="slide-up fixed left-4 right-4 bottom-24 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm shadow-lg"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          <span className="flex items-center gap-2"><Icon name="check" size={18} /> {toast.msg}</span>
          {toast.undo && (
            <button className="font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "var(--on-accent)", color: "var(--accent)" }} onClick={undoNow}>
              <Icon name="undo" size={16} /> Geri al
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Ayda bir yedek hatırlatması: 30 günden eski ya da hiç yedek yoksa (ilk 30 gün sessiz) */
function BackupNudge() {
  const [hidden, setHidden] = useState(false);
  let last = 0, first = 0;
  try { last = Number(localStorage.getItem("bilge.lastBackup") || 0); first = Number(localStorage.getItem("bilge.firstUse") || 0); if (!first) { localStorage.setItem("bilge.firstUse", String(Date.now())); first = Date.now(); } } catch { return null; }
  const ref = last || first;
  if (hidden || Date.now() - ref < 30 * 86_400_000) return null;
  return (
    <div className="card flex items-center gap-3 text-sm" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}>
      <span className="flex-1">Ayda bir yedek: Ayarlar → Veri → <b>Yedeği paylaş / indir</b> (Dosyalar'a kaydet).</span>
      <button className="text-xs muted underline" onClick={() => setHidden(true)}>sonra</button>
    </div>
  );
}

/** Basılınca yanan buton: lit === k ise kısa turuncu parlama animasyonu oynar */
function LitButton({ k, lit, onTap, accent, className = "", style, children }: {
  k: string; lit: string | null; onTap: () => void; accent?: boolean; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <button className={`btn ${accent ? "btn-accent" : ""} ${lit === k ? "lit" : ""} ${className}`} style={style} onClick={onTap}>
      {children}
    </button>
  );
}


function FeverInput({ onDone }: { onDone: (t: number) => void }) {
  const [val, setVal] = useState("37.0");
  const t = parseFloat(val);
  // 3 aydan küçük bebekte ≥ 38 °C acil sayılır — uyarı, teşhis değil
  const high = t >= 38;
  return (
    <div className="card flex flex-wrap items-center gap-3">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="34"
        max="43"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 bg-transparent text-3xl font-bold tabular-nums outline-none"
      />
      <span className="muted">°C</span>
      <button className="btn btn-accent px-5" style={{ minHeight: 48 }} onClick={() => !isNaN(t) && onDone(t)}>
        Kaydet
      </button>
      {high && <div className="basis-full text-sm font-semibold" style={{ color: "#e8703f" }}>≥ 38 °C: 3 aydan küçük bebekte doktora/acile başvurulmalı.</div>}
    </div>
  );
}
