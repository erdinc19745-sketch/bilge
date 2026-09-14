import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addEvent, consumeAutoWake, db, endEvent, reopenEvent, startEvent } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { confirmIfNeeded } from "../../lib/confirm";
import { Icon } from "../../lib/icons";
import { fmtDuration } from "../../lib/time";
import { DEFAULT_RULES } from "../notify/reminders";
import VoiceSheet from "./VoiceSheet";

/**
 * Gece ekranı — "programa girip düğme aramaya üşenirim" için.
 * Telefon şarjda, yan masada; uygulama zaten açık (alarm modu). Kilidi açınca bu ekran: siyah zemin (OLED),
 * kısık renkler, dev saat + durum, dev düğmeler. Her kayıt tek dokunuş; 6 sn büyük Geri al.
 * Otomatik giriş: 21:00–09:00 arası alarm modu açıkken 2 dk dokunulmazsa (App). Çıkış: alttaki yazı ya da başlık 🌙.
 */
export const isNightHour = (d = new Date()) => { const h = d.getHours(); return h >= 21 || h < 9; };

const DIM = "#8a93a0", DIMMER = "#4b5563", BG = "#000";

export default function NightScreen({ onExit }: { onExit: () => void }) {
  const recent = useLiveQuery(() => db.events.orderBy("start").reverse().limit(60).toArray(), []) ?? [];
  const baby = useLiveQuery(() => db.baby.get("me"));
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), 10_000); return () => window.clearInterval(t); }, []);
  const now = Date.now();

  const runningFeed = recent.find((e) => e.type === "emzirme" && e.end == null);
  const runningSleep = recent.find((e) => e.type === "uyku" && e.end == null);
  const lastSleep = recent.find((e) => e.type === "uyku" && e.end != null);
  const lastFeed = recent.find((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");
  const feedAt = lastFeed ? (lastFeed.end ?? lastFeed.start) : undefined;
  const gapMin = baby?.reminders?.feedGapMin ?? DEFAULT_RULES.feedGapMin;
  const nextFeed = feedAt && gapMin > 0 ? feedAt + gapMin * 60_000 : undefined;
  const nextSide = lastFeed?.type === "emzirme" ? (lastFeed.side === "sol" ? "sag" : "sol") : undefined;

  /* ---- geri bildirim: büyük toast + geri al ---- */
  const [toast, setToast] = useState<{ msg: string; undo?: () => Promise<void> } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const done = (msg: string, undo?: () => Promise<void>) => {
    const w = consumeAutoWake();
    if (w) { msg = `${msg} · uyandı (${fmtDuration(w.sleptMs)})`; const u = undo; undo = async () => { await u?.(); await reopenEvent(w.id); }; }
    setToast({ msg, undo });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 6000);
  };
  const undoNow = async () => { if (toast?.undo) await toast.undo(); setToast({ msg: "Geri alındı" }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(null), 1500); };

  const feed = async (side: "sol" | "sag") => { const id = await startEvent("emzirme", { side }); done(`${side === "sol" ? "Sol" : "Sağ"} emzirme başladı`, () => db.events.delete(id)); };
  const feedEnd = async (e: BabyEvent) => {
    if (!(await confirmIfNeeded("emzirme-bitir", { title: "Emzirme bitsin mi?", text: `${fmtDuration(now - e.start)} sürdü.`, ok: "Bitir" }))) return;
    await endEvent(e.id); done(`Emzirme · ${fmtDuration(Date.now() - e.start)}`, () => reopenEvent(e.id));
  };
  const diaper = async (d: "islak" | "kaka") => {
    if (!(await confirmIfNeeded("bez", { title: `Bez kaydedilsin mi? (${d === "islak" ? "çiş" : "kaka"})`, ok: "Kaydet" }))) return;
    const id = await addEvent({ type: "bez", start: Date.now(), diaper: d }); done(d === "islak" ? "Çiş bezi" : "Kaka", () => db.events.delete(id));
  };
  const sleep = async () => {
    if (runningSleep) {
      if (!(await confirmIfNeeded("uyku-bitir", { title: "Uyandı mı?", text: `${fmtDuration(now - runningSleep.start)} uyudu.`, ok: "Uyandı" }))) return;
      await endEvent(runningSleep.id); done(`Uyandı · ${fmtDuration(Date.now() - runningSleep.start)} uyudu`, () => reopenEvent(runningSleep.id));
    } else {
      if (!(await confirmIfNeeded("uyku-baslat", { title: "Uyku başlasın mı?", ok: "Uyudu" }))) return;
      if (runningFeed) await endEvent(runningFeed.id);
      const id = await startEvent("uyku"); done(runningFeed ? "Uyku başladı · emzirme bitti" : "Uyku başladı", async () => { await db.events.delete(id); if (runningFeed) await reopenEvent(runningFeed.id); });
    }
  };

  const clock = new Date(now).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const status = runningFeed
    ? `Emziriyor (${runningFeed.side === "sol" ? "sol" : "sağ"}) · ${fmtDuration(now - runningFeed.start)}`
    : runningSleep ? `Uyuyor · ${fmtDuration(now - runningSleep.start)}`
      : lastSleep?.end ? `Uyanık · ${fmtDuration(now - lastSleep.end)}` : "—";
  const next = nextFeed ? (nextFeed > now ? `sonraki beslenme ~${new Date(nextFeed).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "beslenme zamanı geldi") : feedAt ? `son beslenme ${fmtDuration(now - feedAt)} önce` : "";

  return (
    <div className="fixed inset-0 z-[45] flex flex-col select-none" style={{ background: BG, color: DIM, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-1 px-6">
        <div className="tabular-nums font-bold leading-none" style={{ fontSize: 88, color: "#b9c0c9", letterSpacing: "-0.02em" }}>{clock}</div>
        <div className="text-lg mt-2" style={{ color: "#c7cdd4" }}>{status}</div>
        <div className="text-sm" style={{ color: DIM }}>{next}</div>
        {toast && (
          <div className="mt-6 w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl text-lg font-semibold" style={{ background: "#1f2937", color: "#e5e7eb" }}>
            <span className="flex items-center gap-2"><Icon name="check" size={22} /> {toast.msg}</span>
            {toast.undo && <button className="px-4 py-2 rounded-xl font-bold shrink-0" style={{ background: "#e0894f", color: "#1a1208", minHeight: 48 }} onClick={undoNow}>GERİ AL</button>}
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex flex-col gap-3">
        {runningFeed ? (
          <Big onTap={() => feedEnd(runningFeed)} tone="#e0894f" label={`Bitir · ${runningFeed.side === "sol" ? "Sol" : "Sağ"}`} sub={fmtDuration(now - runningFeed.start)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Big onTap={() => feed("sol")} tone="#e0894f" label="Sol" sub={nextSide === "sol" ? "sıra bunda" : "emzir"} hint={nextSide === "sol"} />
            <Big onTap={() => feed("sag")} tone="#e0894f" label="Sağ" sub={nextSide === "sag" ? "sıra bunda" : "emzir"} hint={nextSide === "sag"} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Big onTap={() => diaper("islak")} tone="#4fb08a" label="Çiş" />
          <Big onTap={() => diaper("kaka")} tone="#4fb08a" label="Kaka" />
        </div>
        <Big onTap={sleep} tone="#5a94e0" label={runningSleep ? "Uyandı" : "Uyudu"} sub={runningSleep ? `${fmtDuration(now - runningSleep.start)} uyudu` : "uykuyu başlat"} />
        <div className="flex items-center justify-between pt-1">
          <button className="text-xs px-3 py-2" style={{ color: DIMMER }} onClick={onExit}>gündüz ekranı</button>
          <span className="text-[11px]" style={{ color: DIMMER }}>{baby?.name} · gece ekranı</span>
        </div>
      </div>

      <VoiceSheet onSaved={(label, undo) => done(label, undo)} />
    </div>
  );
}

/** Dev gece düğmesi: koyu zemin, kısık renkli yazı; basınca kısa parlama */
function Big({ label, sub, tone, onTap, hint }: { label: ReactNode; sub?: ReactNode; tone: string; onTap: () => void; hint?: boolean }) {
  const [lit, setLit] = useState(false);
  return (
    <button
      className="rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-transform"
      style={{ minHeight: 84, background: lit ? tone : "#111827", color: lit ? "#0b0f14" : tone, boxShadow: hint ? `inset 0 0 0 2px ${tone}` : "none", transition: "background 0.3s" }}
      onClick={() => { setLit(true); window.setTimeout(() => setLit(false), 350); onTap(); }}
    >
      <span className="text-2xl font-bold">{label}</span>
      {sub && <span className="text-xs" style={{ color: lit ? "#0b0f14" : "#6b7280" }}>{sub}</span>}
    </button>
  );
}
