import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import type { Baby } from "../../db/types";
import { DEFAULT_RULES, refreshSession, type Rules } from "./reminders";
import { disablePush, enablePush, isStandalone, pushSupported, thisDeviceSubscribed } from "./push";
import { getFamilyCode, setFamilyCode } from "../family/family";
import { armAlarm, disarmAlarm, getAlarmState, subscribeAlarm, testAlarm, type AlarmState } from "./alarmEngine";

/** Ayarlar → Bildirimler: cihaz izni + kurallar (beslenme aralığı, uzun uyku, D vitamini) + deneme */
export default function NotifySettings({ baby }: { baby: Baby }) {
  const subs = useLiveQuery(() => db.pushSubs.toArray(), []) ?? [];
  const pending = useLiveQuery(() => db.reminders.toArray(), []) ?? [];
  const [mine, setMine] = useState(false);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState(getFamilyCode());
  const [codeSaved, setCodeSaved] = useState(!!getFamilyCode());
  const [alarm, setAlarm] = useState<AlarmState>(getAlarmState);
  useEffect(() => subscribeAlarm(setAlarm), []);
  const rules: Rules = { ...DEFAULT_RULES, ...(baby.reminders ?? {}) };

  useEffect(() => { thisDeviceSubscribed().then(setMine); }, [subs.length]);

  const toggleDevice = async () => {
    if (mine) { await disablePush(); setMine(false); return; }
    const r = await enablePush();
    if (r === "ok") { setMine(true); setMsg("Bu cihaz bildirim alacak."); }
    else if (r === "not-standalone") setMsg("iPhone'da önce Safari → Paylaş → Ana Ekrana Ekle, sonra uygulamayı oradan açıp tekrar dene.");
    else if (r === "denied") setMsg("İzin verilmedi. Ayarlar → Bildirimler → Bilge'den açabilirsin.");
    else setMsg("Bu tarayıcı desteklemiyor ya da sunucu anahtarı eksik.");
  };

  const setRule = (patch: Partial<Rules>) => db.baby.update("me", { reminders: { ...rules, ...patch } });

  /** 10 saniye sonra kayıtlı tüm cihazlara deneme bildirimi */
  const testPush = async (retried = false) => {
    const all = await db.pushSubs.toArray();
    if (all.length === 0) return setMsg("Önce bu cihazda bildirimi aç.");
    const r = await fetch("/api/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "schedule", at: Date.now() + 10_000, title: `${baby.name} · deneme`, body: "Bildirimler çalışıyor 🎉", tag: "bilge-test", subs: all.map((s) => ({ endpoint: s.endpoint, keys: s.keys })) }),
    });
    if (r.status === 401 && !retried) { await refreshSession(); return testPush(true); }
    setMsg(r.ok ? "10 saniye içinde bildirim gelecek (uygulamayı kapatıp bekle)." : r.status === 401 ? "Aile kodu gerekli (aşağıya gir)." : "Sunucu hatası: " + (await r.text()));
  };

  if (!pushSupported() && !isStandalone()) {
    return (
      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Bildirimler</h2>
        <p className="text-xs muted">Bildirimler için uygulamayı ana ekrana ekleyip oradan aç (Safari → Paylaş → Ana Ekrana Ekle).</p>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="font-semibold">Bildirimler</h2>
      <button className={`btn text-base ${mine ? "" : "btn-accent"}`} style={{ minHeight: 48 }} onClick={toggleDevice}>
        {mine ? "🔕 Bu cihazda kapat" : "🔔 Bu cihazda aç"}
      </button>
      {msg && <p className="text-xs muted">{msg}</p>}
      <p className="text-[10px] muted">Bildirim sesi iPhone'un sistem sesidir: iPhone Ayarlar → Bildirimler → Bilge → <b>Sesler</b> açık olsun; Odak/Rahatsız Etmeyin kapalıyken çalar. Uygulama açıkken ayrıca kısa bir zil duyulur.</p>
      {!codeSaved && (
        <div className="rounded-xl p-3 text-xs flex flex-col gap-2" style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--card))" }}>
          <span>Hatırlatma sunucusu için bu telefonda aile kodu kayıtlı değil (eski girişten kalma). Bir kez gir:</span>
          <div className="flex gap-2">
            <input className="input mt-0 font-mono tracking-widest" placeholder="1907-1923" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="btn btn-accent text-sm px-3" style={{ minHeight: 40 }} onClick={async () => { setFamilyCode(code); await refreshSession(); setCodeSaved(true); setMsg("Kod kaydedildi."); }}>Kaydet</button>
          </div>
        </div>
      )}
      {subs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs muted">Bildirim alan cihazlar: {subs.map((s) => s.device).join(", ")}</p>
          <button className="text-xs underline muted" onClick={() => testPush()}>Deneme bildirimi</button>
        </div>
      )}

      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: "var(--card-2)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">⏰ Gece alarm modu</div>
            <div className="text-[11px] muted">Telefon kilitliyken de hatırlatma anında sürekli zil çalar (sessiz modda bile, medya sesiyle). Uygulama gece açık kalmalı — kaydırıp kapatma; şarja tak.</div>
          </div>
          <button className={`btn text-sm px-4 ${alarm.armed ? "btn-accent" : ""}`} style={{ minHeight: 44 }} onClick={() => (alarm.armed ? disarmAlarm() : armAlarm())}>{alarm.armed ? "Açık" : "Aç"}</button>
        </div>
        {alarm.armed && (
          <div className="flex items-center justify-between text-xs muted">
            <span>{alarm.next ? `Sonraki: ${new Date(alarm.next.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · ${alarm.next.label}` : "Bekleyen hatırlatma yok (kayıt girince oluşur)"}</span>
            <button className="underline" onClick={() => { testAlarm(); setMsg("10 saniye sonra alarm çalacak — telefonu kilitleyip dene."); }}>Deneme alarmı</button>
          </div>
        )}
      </div>

      <Rule label="Beslenme hatırlat" hint="son beslenmeden bu kadar geçince" value={rules.feedGapMin} unit="dk" onChange={(v) => setRule({ feedGapMin: v })} />
      <Rule label="Uzun uyku uyar" hint="kesintisiz uyku bunu aşınca" value={rules.sleepMaxMin} unit="dk" onChange={(v) => setRule({ sleepMaxMin: v })} />
      <label className="flex items-center justify-between text-sm">
        <span>D vitamini verilmediyse hatırlat <span className="muted text-xs">({baby.dvitTime ?? "09:00"} + 1 saat)</span></span>
        <input type="checkbox" checked={rules.dvit} onChange={(e) => setRule({ dvit: e.target.checked })} className="w-5 h-5" />
      </label>

      {pending.length > 0 && (
        <p className="text-xs muted">
          Kurulu: {pending.map((p) => `${{ feed: "beslenme", sleep: "uyku", dvit: "D vit" }[p.kind] ?? (p.kind.startsWith("med-") ? "ilaç" : p.kind)} ${new Date(p.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`).join(" · ")}
        </p>
      )}
    </section>
  );
}

function Rule({ label, hint, value, unit, onChange }: { label: string; hint: string; value: number; unit: string; onChange: (v: number) => void }) {
  const opts = [0, 120, 150, 180, 210, 240, 300];
  return (
    <label className="text-sm">
      <div className="flex justify-between"><span>{label}</span><span className="muted text-xs">{hint}</span></div>
      <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {opts.map((o) => (
          <option key={o} value={o}>{o === 0 ? "kapalı" : `${o} ${unit} (${(o / 60).toFixed(1).replace(".0", "")} sa)`}</option>
        ))}
      </select>
    </label>
  );
}
