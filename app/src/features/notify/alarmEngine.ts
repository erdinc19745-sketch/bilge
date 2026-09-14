import { db, demoMode } from "../../db/db";
import { keepAliveStart, keepAliveStop, keepAliveInfo, playAlarmTone, stopAlarmTone, chime } from "../noise/audioEngine";
import { updateLockStatus } from "./lockStatus";

/**
 * Gece alarm modu. iOS web uygulaması arka planda uyur; ama ses çalıyorsa uyumaz.
 * Mod açıkken sessiz tutucu ses çalar (audioEngine), 15 sn'de bir reminders tablosu okunur,
 * zamanı gelen hatırlatma için alarm sesi (<audio> döngüsü — kilitliyken de çalar) + ekran kaplayan uyarı.
 * Durdur / 10 dk ertele. 2 dk sonra susar, yanıt yoksa 3 dk sonra bir kez daha çalar.
 * Mod bir kullanıcı dokunuşuyla açılmalı (iOS ses kuralı); sayfa yeniden yüklenince tekrar açılır.
 * Tanı günlüğü (Ayarlar → Bildirimler → alarm günlüğü): kilitliyken ne olduğunu görmek için.
 */
export interface AlarmState { armed: boolean; ringing: { label: string; kind: string } | null; snoozeUntil: number | null; next: { at: number; label: string } | null }
const state: AlarmState = { armed: false, ringing: null, snoozeUntil: null, next: null };
const listeners = new Set<(s: AlarmState) => void>();
const emit = () => listeners.forEach((l) => l({ ...state }));
export const subscribeAlarm = (l: (s: AlarmState) => void) => { listeners.add(l); l({ ...state }); return () => { listeners.delete(l); }; };
export const getAlarmState = () => ({ ...state });
const PREF = "bilge.alarmMode";
/** Varsayılan AÇIK (önemli uyarı, seçenek değil); kullanıcı Ayarlar'dan kapatırsa "0" */
export const alarmPrefEnabled = () => { if (demoMode) return false; try { return localStorage.getItem(PREF) !== "0"; } catch { return true; } };

/**
 * iOS sesi yalnız kullanıcı dokunuşuyla başlatır; sayfa yenilenince mod düşer. Bunu kullanıcıya iş çıkarmadan
 * çözmek için: mod isteniyor ama kurulu değilse, uygulamadaki İLK dokunuş (hangi düğme olursa olsun) modu kurar.
 */
let autoArmBound = false;
export function autoArmOnFirstTap() {
  if (autoArmBound || state.armed || !alarmPrefEnabled()) return;
  autoArmBound = true;
  const h = () => { autoArmBound = false; document.removeEventListener("click", h, true); if (!state.armed && alarmPrefEnabled()) armAlarm(); };
  document.addEventListener("click", h, true);
}

/* ---- tanı günlüğü: son 40 satır, cihazda ---- */
const LOG = "bilge.alarmLog";
const hhmmss = (t = Date.now()) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
function alog(msg: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(LOG) || "[]");
    arr.push(`${hhmmss()} ${msg}`);
    localStorage.setItem(LOG, JSON.stringify(arr.slice(-40)));
  } catch { /* */ }
}
export function getAlarmLog(): string[] { try { return JSON.parse(localStorage.getItem(LOG) || "[]"); } catch { return []; } }
export function clearAlarmLog() { try { localStorage.removeItem(LOG); } catch { /* */ } }

let timer: number | undefined;
let lastBeat = 0; // kalp atışı: kilitliyken tick devam ediyor mu (dakikada bir satır)
const fired = new Set<string>();
const LABEL: Record<string, string> = { feed: "Beslenme zamanı", sleep: "Uyku uzadı — beslenme için uyandır", dvit: "D vitamini" };
const labelOf = (kind: string) => LABEL[kind] ?? (kind.startsWith("med-") ? "İlaç zamanı" : "Hatırlatma");

async function tick() {
  const now = Date.now();
  if (state.armed && now - lastBeat > 60_000) { lastBeat = now; alog(`nabız · ${document.visibilityState} · ses ${keepAliveInfo()}`); }
  const rs = (await db.reminders.toArray()).sort((a, b) => a.at - b.at);
  const nx = rs.find((r) => r.at > now);
  state.next = nx ? { at: nx.at, label: labelOf(nx.kind) } : null;
  if (state.ringing) { emit(); return; }
  if (state.armed) updateLockStatus().catch(() => undefined); // kilit ekranı kartı: canlı durum
  if (state.snoozeUntil && now < state.snoozeUntil) { emit(); return; }
  if (state.snoozeUntil && now >= state.snoozeUntil) { state.snoozeUntil = null; ring("Ertelenen hatırlatma", "snooze"); return; }
  for (const r of rs) {
    const key = `${r.kind}:${r.at}`;
    if (r.at <= now && r.at > now - 10 * 60_000 && !fired.has(key)) { fired.add(key); ring(labelOf(r.kind), r.kind); return; }
  }
  emit();
}

let ringSeq = 0;
async function ring(label: string, kind: string, again = 0) {
  const seq = ++ringSeq;
  state.ringing = { label, kind };
  emit();
  navigator.vibrate?.([300, 200, 300, 200, 300]);
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: `⏰ ${label}`, artist: "Bilge alarm — durdurmak için dokun" });
    navigator.mediaSession.setActionHandler("pause", () => stopRinging());
    navigator.mediaSession.setActionHandler("play", () => stopRinging());
  }
  if (state.armed) {
    const how = await playAlarmTone();
    alog(`ÇAL "${label}" → ${how} · ${document.visibilityState} · ses ${keepAliveInfo()}`);
  } else { chime(); alog(`zil "${label}" (mod kapalı)`); }
  // 2 dk sonra sus (bebek uyanmasın), uyarı ekranda kalır; yanıt yoksa 3 dk sonra bir kez daha (en fazla 2)
  window.setTimeout(() => {
    if (ringSeq !== seq || !state.ringing) return;
    stopAlarmTone(); alog("sustu (2 dk)");
    if (again < 2) window.setTimeout(() => { if (ringSeq === seq && state.ringing) { alog("yanıt yok → tekrar"); ring(label, kind, again + 1); } }, 3 * 60_000);
  }, 120_000);
}

export function stopRinging() { if (state.ringing) alog("durduruldu"); stopAlarmTone(); state.ringing = null; ringSeq++; emit(); if (state.armed) updateLockStatus().catch(() => undefined); }
export function snooze(min = 10) { alog(`ertelendi ${min} dk`); stopAlarmTone(); state.ringing = null; ringSeq++; state.snoozeUntil = Date.now() + min * 60_000; emit(); }

/** Kullanıcı dokunuşuyla çağrılmalı */
export async function armAlarm() {
  const ok = await keepAliveStart();
  state.armed = true;
  alog(`mod açıldı · tutucu ses ${ok ? "çalıyor" : "AÇILAMADI"} · ${keepAliveInfo()}`);
  try { localStorage.setItem(PREF, "1"); } catch { /* */ }
  window.clearInterval(timer);
  timer = window.setInterval(tick, 15_000);
  lastBeat = 0;
  tick();
  emit();
}
export function disarmAlarm() {
  state.armed = false; stopRinging();
  alog("mod kapatıldı");
  try { localStorage.setItem(PREF, "0"); } catch { /* */ }
  keepAliveStop();
  startPassiveWatch();
  emit();
}
/** Mod kapalıyken de uygulama açıkken zil + şerit (eski davranış) */
export function startPassiveWatch() {
  if (state.armed) return;
  window.clearInterval(timer);
  timer = window.setInterval(() => { if (document.visibilityState === "visible") tick(); }, 30_000);
}
/** Deneme: 30 sn sonra çal (telefonu kilitlemeye zaman kalsın) */
export const TEST_DELAY_S = 30;
export function testAlarm() {
  alog(`deneme kuruldu (${TEST_DELAY_S} sn)`);
  window.setTimeout(() => ring("Deneme alarmı", "test"), TEST_DELAY_S * 1000);
}

document.addEventListener("visibilitychange", () => { if (state.armed) alog(`görünürlük: ${document.visibilityState}`); });
