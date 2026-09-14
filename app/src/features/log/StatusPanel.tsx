import { startOfDay } from "date-fns";
import type { Baby, BabyEvent } from "../../db/types";
import { fmtClock, fmtDuration, fmtTime } from "../../lib/time";
import { DEFAULT_RULES } from "../notify/reminders";
import { predictWindow, SLEEPY_CUES } from "../sleep/sleepWindow";
import { differenceInDays } from "date-fns";
import Ring from "../../lib/Ring";


/**
 * Durum paneli: "Şu an ne oluyor, sırada ne var?" — tek bakışta.
 * Sol: uyuyor/uyanık + süre. Sağ: sonraki beslenmeye kalan (kurala göre). Alt: bugünün sayıları.
 */
export default function StatusPanel({ baby, recent }: { baby: Baby | null | undefined; recent: BabyEvent[] }) {
  const now = Date.now();
  const runningSleep = recent.find((e) => e.type === "uyku" && e.end == null);
  const runningFeed = recent.find((e) => e.type === "emzirme" && e.end == null);
  const lastSleep = recent.find((e) => e.type === "uyku" && e.end != null);
  const lastFeed = recent.find((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");

  const gapMin = baby?.reminders?.feedGapMin ?? DEFAULT_RULES.feedGapMin;
  const feedAt = lastFeed ? (lastFeed.end ?? lastFeed.start) : undefined;
  const nextFeedIn = feedAt && gapMin > 0 ? feedAt + gapMin * 60_000 - now : undefined;

  // Uyku penceresi: uyanıksa, son uyanmadan itibaren yaş+kişisel örüntüye göre tahmin
  const ageMonths = baby ? differenceInDays(now, new Date(baby.birthDate)) / 30.4375 : 0;
  const pred = baby ? predictWindow(ageMonths, recent) : null;
  const wakeAt = lastSleep?.end;
  const winFrom = wakeAt && pred ? wakeAt + pred.fromMin * 60_000 : undefined;
  const winTo = wakeAt && pred ? wakeAt + pred.toMin * 60_000 : undefined;
  // "geçti" uyarısı en fazla 2 saat gösterilir (uyku kaydı unutulmuşsa sonsuza dek bağırmasın)
  const winState = !runningSleep && winFrom && winTo ? (now < winFrom ? "önce" : now <= winTo ? "içinde" : now - winTo < 2 * 3600_000 ? "geçti" : null) : null;

  const day0 = startOfDay(now).getTime();
  const today = recent.filter((e) => e.start >= day0 || (e.end ?? e.start) >= day0);
  const feeds = today.filter((e) => (e.type === "emzirme" || e.type === "biberon") && e.start >= day0).length;
  const wet = today.filter((e) => e.type === "bez" && e.start >= day0 && e.diaper !== "kaka").length;
  const sleepMs = today.filter((e) => e.type === "uyku").reduce((s, e) => s + Math.max(0, Math.min(e.end ?? now, now) - Math.max(e.start, day0)), 0);

  return (
    <div className="card status flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Uyku durumu */}
        <div>
          <div className="label flex items-center gap-1.5">
            {runningSleep && <i className="dot-live" style={{ width: 7, height: 7, color: "var(--c-uyku)" }} />}
            {runningSleep ? "Uyuyor" : "Uyanık"}
          </div>
          <div className="hero-num mt-0.5">
            {runningSleep ? fmtClock(now - runningSleep.start) : lastSleep?.end ? fmtDuration(now - lastSleep.end) : "—"}
          </div>
          <div className="text-xs muted">
            {runningSleep ? `${fmtTime(runningSleep.start)}'den beri` : lastSleep?.end ? `${fmtTime(lastSleep.end)}'de uyandı` : "henüz uyku kaydı yok"}
          </div>
        </div>

        {/* Beslenme */}
        <div>
          <div className="label flex items-center gap-1.5">
            {runningFeed && <i className="dot-live" style={{ width: 7, height: 7, color: "var(--c-emzirme)" }} />}
            {runningFeed ? "Emziriyor" : "Sonraki beslenme"}
          </div>
          {runningFeed ? (
            <div className="hero-num mt-0.5">{fmtClock(now - runningFeed.start)}</div>
          ) : nextFeedIn === undefined ? (
            <div className="hero-num mt-0.5">—</div>
          ) : nextFeedIn > 0 ? (
            <div className="hero-num mt-0.5">~{fmtDuration(nextFeedIn)}</div>
          ) : (
            <div className="hero-num mt-0.5 tone-late">zamanı</div>
          )}
          <div className="text-xs muted">
            {runningFeed
              ? `${runningFeed.side === "sol" ? "sol" : "sağ"} · ${fmtTime(runningFeed.start)}`
              : feedAt
                ? `son: ${fmtTime(feedAt)}${lastFeed?.side ? ` · ${lastFeed.side === "sol" ? "sol" : "sağ"}` : lastFeed?.amountMl ? ` · ${lastFeed.amountMl} ml` : ""}`
                : "henüz beslenme kaydı yok"}
          </div>
        </div>
      </div>

      {/* Uyku penceresi (uyanıkken) */}
      {winState && winFrom && winTo && (
        <div className="flex items-center justify-between text-sm rounded-xl px-3 py-2" style={{ background: winState === "içinde" ? "color-mix(in srgb, var(--c-uyku) 18%, var(--card))" : winState === "geçti" ? "color-mix(in srgb, #e8703f 16%, var(--card))" : "var(--card-2)" }}>
          <span>
            {winState === "önce" && <>🌙 Uyku penceresi <b>{fmtTime(winFrom)}–{fmtTime(winTo)}</b> <span className="muted text-xs">(~{fmtDuration(winFrom - now)} sonra)</span></>}
            {winState === "içinde" && <>🌙 <b>Uyku penceresi açık</b> — {fmtTime(winTo)}'a kadar; işaretlere bak: {SLEEPY_CUES.slice(0, 3).join(", ")}</>}
            {winState === "geçti" && <>😵 Pencere <b>{fmtDuration(now - winTo)}</b> önce kapandı — aşırı yorgunluk olabilir, uyutmayı dene</>}
          </span>
          <span className="text-[10px] muted text-right">{pred?.personal ? `kişisel (${pred.samples})` : "yaşa göre"}</span>
        </div>
      )}

      {/* Bugün */}
      {/* Günlük hedefler: yaşa göre (AAP/SB) — halka dolunca hedef tamam */}
      <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
        <Ring value={feeds} target={ageMonths < 3 ? 8 : ageMonths < 6 ? 6 : 5} color="var(--c-emzirme)" label="beslenme" />
        <Ring value={wet} target={ageMonths < 0.2 ? Math.max(1, Math.round(ageMonths * 30) + 1) : 6} color="var(--c-bez)" label="çiş bezi" />
        <Ring value={Math.round(sleepMs / 3600_000)} target={ageMonths < 4 ? 14 : ageMonths < 12 ? 12 : 11} color="var(--c-uyku)" label="uyku (sa)" text={fmtDuration(sleepMs).replace(" dk", "").replace(" sa", "s")} />
      </div>
    </div>
  );
}
