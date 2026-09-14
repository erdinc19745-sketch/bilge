import { addDays, addMonths, parseISO } from "date-fns";
import { buildSchedule, KIND_LABEL } from "../src/features/calendar/schedule.js";
import { readAll } from "./_lib/dexie.js";

/**
 * iPhone Takvimi aboneliği (webcal://.../api/takvim?d=YYYY-MM-DD&n=İsim&dv=HH:MM)
 * Sunucuda veri tutulmaz: takvim her istekte doğum tarihinden üretilir.
 * Türkiye UTC+3 sabit (yaz saati yok) → yerel 09:00 = 06:00Z.
 */
type Req = { query: Record<string, string | string[] | undefined> };
type Res = { setHeader(k: string, v: string): void; status(c: number): Res; send(b: string): void };

const KIND_ICON: Record<string, string> = { asi: "💉", izlem: "🩺", tarama: "🔬", ilac: "💊" };
const TR_OFFSET_H = 3;

const pad = (n: number) => n.toString().padStart(2, "0");
/** Yerel (TR) tarih+saat → ICS UTC damgası */
function stampUtc(d: Date, hh: number, mm: number) {
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hh - TR_OFFSET_H, mm));
  return `${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}00Z`;
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
/** ICS satırları 75 bayttan uzun olamaz; devam satırı boşlukla başlar */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 73) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

export default async function handler(req: Req, res: Res) {
  const q = (k: string) => (Array.isArray(req.query[k]) ? req.query[k]![0] : req.query[k]) as string | undefined;
  const d = q("d");
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return res.status(400).send("d=YYYY-MM-DD gerekli");
  const name = (q("n") || "Bebek").slice(0, 40);
  const dv = q("dv"); // "09:00" gibi; yoksa D vitamini eklenmez
  const birth = parseISO(d);
  const now = new Date();
  const dtstamp = stampUtc(now, now.getHours(), now.getMinutes());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bilge//Bebek Takvimi//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)} — sağlık takvimi`,
    "X-WR-TIMEZONE:Europe/Istanbul",
  ];

  for (const it of buildSchedule(d)) {
    const detail = [KIND_LABEL[it.kind], it.detail, it.windowDays ? `±${it.windowDays} gün tolerans` : ""].filter(Boolean).join(" · ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:bilge-${it.key}-${d}@bilge`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stampUtc(it.date, 9, 0)}`,
      `DTEND:${stampUtc(it.date, 9, 30)}`,
      `SUMMARY:${esc(`${KIND_ICON[it.kind]} ${it.title} — ${name}`)}`,
      `DESCRIPTION:${esc(detail)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P3D", `DESCRIPTION:${esc(`3 gün sonra: ${it.title}`)}`, "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT0M", `DESCRIPTION:${esc(it.title)}`, "END:VALARM",
      "END:VEVENT",
    );
  }

  if (dv && /^\d{2}:\d{2}$/.test(dv)) {
    const [hh, mm] = dv.split(":").map(Number);
    const first = addDays(birth, 15); // D vitamini 15. günde başlar
    const until = addMonths(birth, 12);
    lines.push(
      "BEGIN:VEVENT",
      `UID:bilge-dvit-${d}@bilge`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stampUtc(first, hh, mm)}`,
      `DTEND:${stampUtc(first, hh, mm + 10)}`,
      `RRULE:FREQ=DAILY;UNTIL=${stampUtc(until, 23, 59)}`,
      `SUMMARY:${esc(`💊 D vitamini — ${name}`)}`,
      "DESCRIPTION:Günde 400 IU (3 damla)",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT0M", "DESCRIPTION:D vitamini zamanı", "END:VALARM",
      "END:VEVENT",
    );
  }

  // Dinamik hatırlatmalar (beslenme, uzun uyku, D vit, ilaç dozu): buluttaki reminders tablosundan.
  // iPhone aboneliği yenilediğinde (15 dk-1 sa) takvime düşer; uygulama kapalıyken de Takvim alarmı çalar.
  try {
    const rems = await readAll<{ kind: string; at: number }>("reminders");
    const meds = await readAll<{ id: string; name: string; dose?: string }>("meds");
    const LABEL: Record<string, string> = { feed: "Beslenme zamanı", sleep: "Uyku uzadı — beslenme için uyandır", dvit: "D vitamini verilmedi" };
    const nowMs = Date.now();
    const utc = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
    for (const r of rems) {
      if (!r.at || r.at < nowMs - 3600_000 || r.at > nowMs + 3 * 86_400_000) continue;
      const med = r.kind.startsWith("med-") ? meds.find((m) => m.id === r.kind.slice(4)) : undefined;
      const title = med ? `${med.name}${med.dose ? ` · ${med.dose}` : ""} zamanı` : LABEL[r.kind] ?? "Hatırlatma";
      lines.push(
        "BEGIN:VEVENT", `UID:bilge-rem-${r.kind}-${r.at}@bilge`, `DTSTAMP:${dtstamp}`, `DTSTART:${utc(r.at)}`, `DTEND:${utc(r.at + 10 * 60_000)}`,
        `SUMMARY:${esc(`⏰ ${title} — ${name}`)}`, "DESCRIPTION:Bilge hatırlatması (uygulamadaki kayıtlara göre otomatik)",
        "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT0M", `DESCRIPTION:${esc(title)}`, "END:VALARM", "END:VEVENT",
      );
    }
  } catch { /* bulut okunamazsa sabit takvim yine gider */ }

  lines.push("END:VCALENDAR");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="bilge-takvim.ics"');
  res.setHeader("Cache-Control", "no-cache, max-age=0"); // dinamik: her yenilemede taze
  res.status(200).send(lines.map(fold).join("\r\n") + "\r\n");
}
