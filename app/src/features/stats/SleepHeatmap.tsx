import { format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import type { BabyEvent } from "../../db/types";

/**
 * Uyku ısı haritası: son 14 gün × 24 saat. Her satır bir gün, her hücre 30 dk: uyku mavi, emzirme/biberon turuncu tik.
 * Örüntü gözle görülür ("gece 2 kalkışı yerleşti", "öğle uykusu kaydı"). Bugün en altta, saat ekseni üstte.
 */
export default function SleepHeatmap({ events, days = 14 }: { events: BabyEvent[]; days?: number }) {
  const now = Date.now();
    const rows = Array.from({ length: days }, (_, i) => startOfDay(subDays(now, days - 1 - i)).getTime());
  const rowH = 14, gap = 2, W = 360, H = days * (rowH + gap);
  const sleeps = events.filter((e) => e.type === "uyku");
  const feeds = events.filter((e) => e.type === "emzirme" || e.type === "biberon");
  if (sleeps.length + feeds.length === 0) return null;

  return (
    <div className="card">
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="text-sm font-semibold">Uyku haritası · {days} gün</h3>
        <span className="text-[10px] muted"><i className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ background: "var(--c-uyku)" }} />uyku <i className="inline-block w-2 h-2 rounded-sm align-middle mx-1" style={{ background: "var(--c-emzirme)" }} />beslenme</span>
      </div>
      <div className="flex justify-between text-[9px] muted px-0.5">{[0, 6, 12, 18, 24].map((h) => <span key={h}>{String(h).padStart(2, "0")}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block">
        {rows.map((d0, r) => {
          const d1 = d0 + 86_400_000, y = r * (rowH + gap);
          const isToday = r === days - 1;
          return (
            <g key={d0} className="fade-in" style={{ animationDelay: `${r * 30}ms` }}>
              <rect x={0} y={y} width={W} height={rowH} rx={3} fill="var(--card-2)" />
              {sleeps.filter((e) => e.start < d1 && (e.end ?? now) > d0).map((e) => {
                const a = Math.max(e.start, d0), b = Math.min(e.end ?? now, d1);
                return <rect key={e.id} x={((a - d0) / 86_400_000) * W} y={y} width={Math.max(1.5, ((b - a) / 86_400_000) * W)} height={rowH} rx={3} fill="var(--c-uyku)" opacity={e.end ? 0.9 : 0.6} />;
              })}
              {feeds.filter((e) => e.start >= d0 && e.start < d1).map((e) => (
                <rect key={e.id} x={((e.start - d0) / 86_400_000) * W - 1} y={y} width={2} height={rowH} fill="var(--c-emzirme)" />
              ))}
              {isToday && <rect x={((now - d0) / 86_400_000) * W} y={y} width={W - ((now - d0) / 86_400_000) * W} height={rowH} fill="var(--card)" opacity={0.7} />}
              <text x={4} y={y + rowH - 3.5} fontSize={8} fill="var(--text)" opacity={0.7} style={{ pointerEvents: "none" }}>{isToday ? "bugün" : format(d0, "d MMM", { locale: tr })}</text>
            </g>
          );
        })}
        {[6, 12, 18].map((h) => <line key={h} x1={(h / 24) * W} x2={(h / 24) * W} y1={0} y2={H} stroke="var(--line)" strokeWidth={1} />)}
      </svg>
      <p className="text-[10px] muted mt-1">Satır = gün (eskiden yeniye), sütun = saat. Boş satır = o gün uyku kaydı girilmemiş.</p>
    </div>
  );
}
