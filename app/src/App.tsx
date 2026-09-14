import { parseISO } from "date-fns";
import { lazy, Suspense, useEffect, useState } from "react";
import { useLiveQuery, useObservable } from "dexie-react-hooks";
import { cloudEnabled, db, currentUser$, demoMode, syncState$ } from "./db/db";
import Onboarding, { isOnboarded } from "./features/onboarding/Onboarding";
import FamilyLogin from "./features/family/FamilyLogin";
import QuickLog from "./features/log/QuickLog";
import Timeline from "./features/log/Timeline";
const Weekly = lazy(() => import("./features/stats/Weekly"));
const Calendar = lazy(() => import("./features/calendar/Calendar"));
const Settings = lazy(() => import("./features/settings/Settings"));
const Profile = lazy(() => import("./features/profile/Profile"));
import { Img } from "./features/profile/Photos";
import { syncReminders } from "./features/notify/reminders";
import { ConfirmHost } from "./lib/confirm";
import { Icon, type IconName } from "./lib/icons";
import { runQuickAct } from "./features/log/quickAct";
import NowPlaying from "./features/noise/NowPlaying";
import { useAlarm } from "./features/notify/chime";
import { armAlarm, snooze, stopRinging } from "./features/notify/alarmEngine";

type Tab = "kayit" | "serit" | "ozet" | "takvim" | "ayarlar";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "kayit", label: "Kayıt", icon: "plus" },
  { id: "serit", label: "Şerit", icon: "list" },
  { id: "ozet", label: "Özet", icon: "chart" },
  { id: "takvim", label: "Takvim", icon: "calendar" },
  { id: "ayarlar", label: "Ayarlar", icon: "sliders" },
];

export default function App() {
  // ?tab=serit gibi: tasarım kontrolü için başlangıç sekmesi
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(location.search).get("tab") as Tab) || "kayit");
  const [profile, setProfile] = useState(() => location.search.includes("profile"));
  const [onboarded, setOnboarded] = useState(isOnboarded);
  // Yeni sürüm bekliyor (service worker): kullanıcı isteyince yenile
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => { const on = () => setUpdateReady(true); window.addEventListener("bilge-update", on); return () => window.removeEventListener("bilge-update", on); }, []);
  const sync = useObservable(syncState$);
  // undefined = yükleniyor, null = kayıt yok (get() ikisinde de undefined döndürür, o yüzden null'a çeviriyoruz)
  const baby = useLiveQuery(() => db.baby.get("me").then((b) => b ?? null));
  const avatar = useLiveQuery(() => db.photos.where("month").equals(-1).first(), []);
  const user = useObservable(currentUser$);
  // Bulut açıkken önce aile kodu; giriş yoksa başka hiçbir ekran yok
  const needLogin = cloudEnabled && user !== undefined && !user.isLoggedIn;

  // Hatırlatmalar: son kayıtlar ya da kurallar değişince (3 sn bekleyip) sunucuda yeniden zamanla
  const recent = useLiveQuery(() => db.events.orderBy("start").reverse().limit(50).toArray(), []);
  const subCount = useLiveQuery(() => db.pushSubs.count(), []);
  const meds = useLiveQuery(() => db.meds.toArray(), []);
  // Uygulama öne gelince de eşitle: zamanı geçmiş hatırlatmanın kalan tekrar bildirimleri iptal olur
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") setFocusTick((x) => x + 1); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    if (!baby || !recent || subCount === undefined) return;
    const t = window.setTimeout(() => syncReminders(baby, recent, meds ?? []), focusTick ? 500 : 3000);
    return () => window.clearTimeout(t);
  }, [baby, recent, subCount, meds, focusTick]);

  // Hatırlatma zamanı: alarm modu açıksa sürekli zil + tam ekran; değilse kısa zil + şerit
  const alarm = useAlarm();
  const chimeMsg = alarm.ringing && !alarm.loud ? alarm.ringing.label : null;

  // ?act=… kısayolu (iOS Kısayolları / kilit ekranı widget'ı)
  const [actMsg, setActMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!baby) return;
    runQuickAct().then((m) => { if (m) { setActMsg(m); window.setTimeout(() => setActMsg(null), 4000); } });
  }, [baby?.id]);

  // İlk açılış: bebek bilgisi yoksa önce ayarlar
  const showSettings = baby === null;

  return (
    <div className="flex flex-col h-full">
      <ConfirmHost />
      {alarm.ringing && alarm.loud && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
          <Icon name="bell" size={64} />
          <div className="text-3xl font-bold">{alarm.ringing.label}</div>
          <div className="text-sm opacity-80">{new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
          <button className="btn text-xl w-full" style={{ minHeight: 72, background: "var(--on-accent)", color: "var(--accent)" }} onClick={stopRinging}>Durdur</button>
          <button className="btn text-base w-full" style={{ minHeight: 56, background: "rgba(0,0,0,0.15)", color: "var(--on-accent)" }} onClick={() => snooze(10)}>10 dk ertele</button>
        </div>
      )}
      {baby && !onboarded && !needLogin && <Onboarding onDone={() => setOnboarded(true)} />}
      {!alarm.armed && alarm.prefWanted && baby && (
        <button className="fixed left-4 right-4 top-4 z-40 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg text-left" style={{ background: "var(--card)", marginTop: "env(safe-area-inset-top)", boxShadow: "0 0 0 1px var(--line)" }} onClick={() => armAlarm()}>
          ⏰ Alarm modu bekliyor — <span style={{ color: "var(--accent)" }}>ekrana bir kez dokun</span> <span className="muted font-normal text-xs">(iPhone sesi dokunuşla açar)</span>
        </button>
      )}
      {chimeMsg && (
        <div className="slide-up fixed left-4 right-4 top-4 z-40 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg" style={{ background: "var(--accent)", color: "var(--on-accent)", marginTop: "env(safe-area-inset-top)" }}>
          🔔 {chimeMsg}
        </div>
      )}
      {actMsg && (
        <div className="slide-up fixed left-4 right-4 top-4 z-40 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg" style={{ background: "var(--accent)", color: "var(--on-accent)", marginTop: "env(safe-area-inset-top)" }}>
          {actMsg}
        </div>
      )}
      <header className="bar-glass safe-top px-4 pt-3 pb-2 flex items-center justify-between sticky top-0 z-10">
        <button className="flex items-center gap-3 text-left" aria-label="Bebek profili: büyüme, gelişim, albüm" onClick={() => baby && setProfile(true)}>
          <span className="avatar-ring w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--card-2)", color: "var(--accent)" }}>
            {avatar ? <Img blob={avatar.blob} className="w-full h-full object-cover" /> : <Icon name={baby ? "baby" : "moon"} size={22} />}
          </span>
          <span>
            <span className="text-xl font-bold block leading-tight" style={{ letterSpacing: "-0.01em" }}>{baby?.name || "Bilge"}</span>
            {baby && <AgeBadge birthDate={baby.birthDate} />}
          </span>
        </button>
        <span className="text-xs muted text-right leading-tight">
          {cloudEnabled && (
            <span className="inline-flex items-center gap-1 justify-end" title={`senkron: ${sync?.phase ?? "—"}`} aria-label={`senkron ${sync?.phase ?? ""}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: sync?.phase === "in-sync" ? "var(--c-bez)" : sync?.phase === "pushing" || sync?.phase === "pulling" ? "var(--accent)" : sync?.phase === "error" ? "#e8703f" : "var(--muted)" }} />
              <span className="text-[10px]">{sync?.phase === "in-sync" ? "güncel" : sync?.phase === "pushing" || sync?.phase === "pulling" ? "eşleniyor" : sync?.phase === "offline" ? "çevrimdışı" : sync?.phase === "error" ? "hata" : ""}</span>
            </span>
          )}
          {demoMode && <span className="block text-[10px] font-bold px-1.5 rounded" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>DEMO · örnek veri</span>}
          {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
          <span className="block">{new Date().toLocaleDateString("tr-TR", { weekday: "long" })}</span>
        </span>
      </header>

      {updateReady && !alarm.ringing && (
        <button className="mx-4 mt-2 px-3 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between" style={{ background: "color-mix(in srgb, var(--accent) 14%, var(--card))" }} onClick={() => window.__bilgeUpdate?.()}>
          <span>Yeni sürüm hazır</span><span style={{ color: "var(--accent)" }}>yenile →</span>
        </button>
      )}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <Suspense fallback={<div className="muted text-sm text-center pt-10">yükleniyor…</div>}>
        {needLogin ? (
          <FamilyLogin />
        ) : baby === undefined ? null : showSettings ? (
          <Settings />
        ) : profile && baby ? (
          <div className="fade-in"><Profile baby={baby} onClose={() => setProfile(false)} /></div>
        ) : (
          <div key={tab} className="fade-in">
            {tab === "kayit" && <QuickLog />}
            {tab === "serit" && <Timeline />}
            {tab === "ozet" && <Weekly />}
            {tab === "takvim" && <Calendar />}
            {tab === "ayarlar" && <Settings />}
          </div>
        )}
        </Suspense>
      </main>

      <NowPlaying />
      {!showSettings && !needLogin && (
        <nav className="bar-glass safe-bottom grid grid-cols-5 border-t border-(--line)">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setProfile(false); }} className={`nav-btn ${tab === t.id && !profile ? "active" : ""}`}>
              <Icon name={t.icon} size={22} stroke={tab === t.id && !profile ? 2.4 : 2} />
              {t.label}
              <span className="ind" />
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/** "5 hafta 2 gün" — yenidoğanda haftalar, sonra aylar */
function AgeBadge({ birthDate }: { birthDate: string }) {
  const days = Math.floor((Date.now() - parseISO(birthDate).getTime()) / 86400000);
  let text: string;
  if (days < 0) text = "henüz doğmadı";
  else if (days < 8 * 7) text = `${Math.floor(days / 7)} hafta ${days % 7} gün`;
  else if (days < 730) text = `${Math.floor(days / 30.44)} aylık`;
  else text = `${Math.floor(days / 365.25)} yaşında`;
  return <span className="muted text-xs block">{text}</span>;
}
