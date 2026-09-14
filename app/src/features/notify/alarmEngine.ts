import { db } from "../../db/db";
import { keepAliveStart, keepAliveStop, playAlarmTone, stopAlarmTone, chime } from "../noise/audioEngine";

/**
 * Gece alarm modu. iOS web uygulaması arka planda uyur; ama ses çalıyorsa uyumaz.
 * Mod açıkken sessiz tutucu ses çalar (audioEngine), 15 sn'de bir reminders tablosu okunur,
 * zamanı gelen hatırlatma için sürekli alarm sesi + ekran kaplayan uyarı. Durdur / 10 dk ertele.
 * Mod bir kullanıcı dokunuşuyla açılmalı (iOS ses kuralı); sayfa yeniden yüklenince tekrar açılır.
 */
export interface AlarmState { armed: boolean; ringing: { label: string; kind: string } | null; snoozeUntil: number | null; next: { at: number; label: string } | null }
const state: AlarmState = { armed: false, ringing: null, snoozeUntil: null, next: null };
const listeners = new Set<(s: AlarmState) => void>();
const emit = () => listeners.forEach((l) => l({ ...state }));
export const subscribeAlarm = (l: (s: AlarmState) => void) => { listeners.add(l); l({ ...state }); return () => { listeners.delete(l); }; };
export const getAlarmState = () => ({ ...state });
const PREF = "bilge.alarmMode";
export const alarmPrefEnabled = () => { try { return localStorage.getItem(PREF) === "1"; } catch { return false; } };

let timer: number | undefined;
const fired = new Set<string>();
const LABEL: Record<string, string> = { feed: "Beslenme zamanı", sleep: "Uyku uzadı — beslenme için uyandır", dvit: "D vitamini" };
const labelOf = (kind: string) => LABEL[kind] ?? (kind.startsWith("med-") ? "İlaç zamanı" : "Hatırlatma");

async function tick() {
  const now = Date.now();
  const rs = (await db.reminders.toArray()).sort((a, b) => a.at - b.at);
  state.next = rs.find((r) => r.at > now) ? { at: rs.find((r) => r.at > now)!.at, label: labelOf(rs.find((r) => r.at > now)!.kind) } : null;
  if (state.ringing) { emit(); return; }
  if (state.snoozeUntil && now < state.snoozeUntil) { emit(); return; }
  if (state.snoozeUntil && now >= state.snoozeUntil) { state.snoozeUntil = null; ring("Ertelenen hatırlatma", "snooze"); return; }
  for (const r of rs) {
    const key = `${r.kind}:${r.at}`;
    if (r.at <= now && r.at > now - 10 * 60_000 && !fired.has(key)) { fired.add(key); ring(labelOf(r.kind), r.kind); return; }
  }
  emit();
}

function ring(label: string, kind: string) {
  state.ringing = { label, kind };
  if (state.armed) playAlarmTone(); else chime();
  navigator.vibrate?.([300, 200, 300, 200, 300]);
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: `⏰ ${label}`, artist: "Bilge alarm" });
    navigator.mediaSession.setActionHandler("pause", () => stopRinging());
    navigator.mediaSession.setActionHandler("play", () => stopRinging());
  }
  emit();
  // 90 sn sonra kendiliğinden sus (bebek uyanmasın), uyarı ekranda kalır
  window.setTimeout(() => { if (state.ringing?.label === label) stopAlarmTone(); }, 90_000);
}

export function stopRinging() { stopAlarmTone(); state.ringing = null; emit(); }
export function snooze(min = 10) { stopAlarmTone(); state.ringing = null; state.snoozeUntil = Date.now() + min * 60_000; emit(); }

/** Kullanıcı dokunuşuyla çağrılmalı */
export async function armAlarm() {
  await keepAliveStart();
  state.armed = true;
  try { localStorage.setItem(PREF, "1"); } catch { /* */ }
  window.clearInterval(timer);
  timer = window.setInterval(tick, 15_000);
  tick();
  emit();
}
export function disarmAlarm() {
  state.armed = false; stopRinging();
  try { localStorage.setItem(PREF, "0"); } catch { /* */ }
  keepAliveStop();
  emit();
}
/** Mod kapalıyken de uygulama açıkken zil + şerit (eski davranış) */
export function startPassiveWatch() {
  window.clearInterval(timer);
  timer = window.setInterval(() => { if (document.visibilityState === "visible") tick(); }, 30_000);
}
/** Deneme: 10 sn sonra çal */
export function testAlarm() {
  window.setTimeout(() => ring("Deneme alarmı", "test"), 10_000);
}
