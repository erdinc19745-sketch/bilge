import type { BabyEvent } from "../../db/types";

/**
 * Günün 24 saatlik şeridi: uyku mavi blok, emzirme turuncu, biberon sarı, bez ince çizgi.
 * Bir bakışta "gece nasıl geçti?" sorusunun cevabı.
 */
export default function DayBar({ day, events }: { day: number; events: BabyEvent[] }) {
  const dayMs = 86_400_000;
  const end = Math.min(day + dayMs, Date.now());
  const pct = (t: number) => `${(Math.min(Math.max(t, day), day + dayMs) - day) / dayMs * 100}%`;

  return (
    <div>
      <div className="daybar" aria-hidden>
        {events.map((e) => {
          const s = e.start;
          const en = e.end ?? (e.type === "uyku" || e.type === "emzirme" ? end : undefined);
          if (e.type === "bez") return <i key={e.id} className="bez" style={{ left: pct(s) }} />;
          if (e.type === "biberon") return <i key={e.id} className="biberon" style={{ left: pct(s), width: 4 }} />;
          if (e.type === "uyku" || e.type === "emzirme")
            return <i key={e.id} className={e.type} style={{ left: pct(s), width: `calc(${pct(en!)} - ${pct(s)})`, minWidth: 2 }} />;
          return null;
        })}
        {/* şimdi çizgisi (sadece bugün) */}
        {end < day + dayMs && <i style={{ left: pct(end), width: 1, background: "rgba(255,255,255,0.5)" }} />}
      </div>
      <div className="flex justify-between text-[10px] muted mt-0.5 px-0.5">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}
