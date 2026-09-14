import { db } from "../../db/db";
import { fmtDuration, fmtTime } from "../../lib/time";
import { DEFAULT_RULES } from "./reminders";
import { getState as noiseState, KINDS } from "../noise/audioEngine";

/**
 * Kilit ekranı durum kartı. Alarm modu açıkken telefon zaten bir "medya oturumu" tutuyor;
 * Media Session başlığını canlı durumla doldurunca kilit ekranındaki kart, kilidi açmadan
 * "uyuyor 1 sa 20 dk · sonraki beslenme ~02:30" gösterir. 15 sn'de bir (alarm motoru) yenilenir.
 */
export async function updateLockStatus() {
  if (!("mediaSession" in navigator)) return;
  const now = Date.now();
  const recent = await db.events.orderBy("start").reverse().limit(60).toArray();
  const baby = await db.baby.get("me");
  const runningSleep = recent.find((e) => e.type === "uyku" && e.end == null);
  const runningFeed = recent.find((e) => e.type === "emzirme" && e.end == null);
  const lastSleep = recent.find((e) => e.type === "uyku" && e.end != null);
  const lastFeed = recent.find((e) => (e.type === "emzirme" && e.end != null) || e.type === "biberon");
  const gapMin = baby?.reminders?.feedGapMin ?? DEFAULT_RULES.feedGapMin;
  const feedAt = lastFeed ? (lastFeed.end ?? lastFeed.start) : undefined;
  const nextFeed = feedAt && gapMin > 0 ? feedAt + gapMin * 60_000 : undefined;

  const status = runningFeed
    ? `Emziriyor (${runningFeed.side === "sol" ? "sol" : "sağ"}) ${fmtDuration(now - runningFeed.start)}`
    : runningSleep
      ? `Uyuyor ${fmtDuration(now - runningSleep.start)}`
      : lastSleep?.end
        ? `Uyanık ${fmtDuration(now - lastSleep.end)}${feedAt ? ` · son beslenme ${fmtDuration(now - feedAt)} önce` : ""}`
        : feedAt ? `Son beslenme ${fmtDuration(now - feedAt)} önce` : "Bilge";
  const next = nextFeed ? (nextFeed > now ? `Sonraki beslenme ~${fmtTime(nextFeed)}` : "Beslenme zamanı geldi") : "";

  const n = noiseState();
  const title = n.playing ? `${KINDS.find((k) => k.id === n.kind)?.label ?? "Uyku sesi"} · ${status}` : status;
  const artist = [next, baby?.name ?? "Bilge"].filter(Boolean).join(" · ");
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: "Bilge", artwork: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }] });
  } catch { /* eski tarayıcı */ }
}
