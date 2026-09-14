import { differenceInMinutes, format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

/** "2 sa 15 dk" biçiminde süre */
export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm} dk`;
  return `${h} sa ${mm} dk`;
}

/** Kronometre: "12:07" ya da "1:02:07" */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${m}:${p(ss)}`;
}

/** "14:05" */
export const fmtTime = (t: number) => format(t, "HH:mm");

/** "Bugün", "Dün", "12 Eylül Cuma" */
export function fmtDay(t: number) {
  if (isToday(t)) return "Bugün";
  if (isYesterday(t)) return "Dün";
  return format(t, "d MMMM EEEE", { locale: tr });
}

export const minutesSince = (t: number) => differenceInMinutes(Date.now(), t);
