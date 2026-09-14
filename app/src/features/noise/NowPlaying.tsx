import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { getState, KINDS, stop, subscribe, type NoiseState } from "./audioEngine";
import { disarmAlarm, getAlarmState, subscribeAlarm, type AlarmState } from "../notify/alarmEngine";

/** Uyku sesi çalarken her ekranda görünen ince şerit (alt menünün üstünde) */
export default function NowPlaying() {
  const [s, setS] = useState<NoiseState>(getState);
  const [a, setA] = useState<AlarmState>(getAlarmState);
  useEffect(() => subscribe(setS), []);
  useEffect(() => subscribeAlarm(setA), []);
  if (!s.playing && !a.armed) return null;
  const label = KINDS.find((k) => k.id === s.kind)!.label;
  if (!s.playing && a.armed) {
    return (
      <div className="bar-glass flex items-center gap-3 px-4 py-2 text-sm border-t border-(--line)">
        <span>⏰</span>
        <span className="flex-1 truncate">Alarm modu açık{a.next ? ` · sonraki ${new Date(a.next.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} ${a.next.label}` : " · bekleyen hatırlatma yok"}{a.snoozeUntil ? ` · ertelendi ${new Date(a.snoozeUntil).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        <button className="btn text-xs px-3" style={{ minHeight: 32 }} onClick={disarmAlarm}>Kapat</button>
      </div>
    );
  }
  return (
    <div className="bar-glass flex items-center gap-3 px-4 py-2 text-sm border-t border-(--line)">
      <i className="dot-live" style={{ width: 8, height: 8, color: "var(--c-uyku)" }} />
      <span className="flex-1 truncate">Uyku sesi · {label}{s.endsAt ? ` · ${Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60_000))} dk` : ""}</span>
      <button className="btn text-xs px-3 flex items-center gap-1" style={{ minHeight: 32 }} onClick={stop}><Icon name="stop" size={14} /> Durdur</button>
    </div>
  );
}
