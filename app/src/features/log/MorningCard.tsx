import { useState } from "react";
import type { BabyEvent } from "../../db/types";
import { fmtDuration, fmtTime } from "../../lib/time";
import { ROLE_LABEL, type Role } from "../family/family";

/**
 * Sabah özeti (06:00–12:00 arası, Hızlı bölmesinin üstünde): dün 23:00 – bugün 06:00 arasında ne oldu.
 * Nöbet devir-teslimi için: kaç beslenme, kaç bez, en uzun uyku, toplam uyku, kim kalktı. Günde bir kez kapatılır.
 */
const NIGHT_START = 23, NIGHT_END = 6;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export default function MorningCard({ recent }: { recent: BabyEvent[] }) {
  const now = new Date();
  const h = now.getHours();
  const key = dayKey(now.getTime());
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("bilge.morningSeen") === key; } catch { return false; } });
  if (hidden || h < NIGHT_END || h >= 12) return null;

  const end = new Date(now); end.setHours(NIGHT_END, 0, 0, 0);
  const start = new Date(end.getTime() - 86_400_000); start.setHours(NIGHT_START, 0, 0, 0);
  const s0 = start.getTime(), e0 = end.getTime();
  const inNight = recent.filter((e) => e.start >= s0 && e.start < e0);
  const feeds = inNight.filter((e) => e.type === "emzirme" || e.type === "biberon");
  const diapers = inNight.filter((e) => e.type === "bez");
  // Uyku: geceyle kesişen tüm uyku kayıtları, kesişen kısmı sayılır
  const sleeps = recent.filter((e) => e.type === "uyku" && e.start < e0 && (e.end ?? now.getTime()) > s0)
    .map((e) => ({ e, ms: Math.min(e.end ?? now.getTime(), e0) - Math.max(e.start, s0) }));
  const totalSleep = sleeps.reduce((a, x) => a + x.ms, 0);
  const longest = sleeps.sort((a, b) => b.ms - a.ms)[0];
  if (feeds.length + diapers.length + sleeps.length === 0) return null;
  // Kim kalktı: beslenme/bez kayıtlarındaki rol etiketi
  const who = new Map<string, number>();
  for (const e of [...feeds, ...diapers]) if (e.by) who.set(e.by, (who.get(e.by) ?? 0) + 1);
  const whoText = [...who.entries()].map(([r, n]) => `${ROLE_LABEL[r as Role] ?? r} ${n}`).join(" · ");

  const close = () => { try { localStorage.setItem("bilge.morningSeen", key); } catch { /* */ } setHidden(true); };
  return (
    <div className="card flex flex-col gap-1.5" style={{ background: "color-mix(in srgb, var(--c-uyku) 12%, var(--card))" }}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">🌅 Gece özeti <span className="muted font-normal text-xs">23:00–06:00</span></div>
        <button className="text-xs muted underline" onClick={close}>tamam</button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="hero-num" style={{ fontSize: 22 }}>{feeds.length}</div><div className="text-[11px] muted">beslenme</div></div>
        <div><div className="hero-num" style={{ fontSize: 22 }}>{diapers.length}</div><div className="text-[11px] muted">bez</div></div>
        <div><div className="hero-num" style={{ fontSize: 22 }}>{totalSleep ? fmtDuration(totalSleep).replace(" dk", "dk").replace(" sa ", "sa ") : "—"}</div><div className="text-[11px] muted">uyku</div></div>
      </div>
      <div className="text-xs muted">
        {longest && longest.ms > 0 ? `En uzun uyku ${fmtDuration(longest.ms)} (${fmtTime(Math.max(longest.e.start, s0))}–${fmtTime(Math.min(longest.e.end ?? now.getTime(), e0))})` : "uyku kaydı yok"}
        {whoText ? ` · kalkan: ${whoText}` : ""}
      </div>
    </div>
  );
}
