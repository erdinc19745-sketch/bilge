import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInCalendarDays, format } from "date-fns";
import { tr } from "date-fns/locale";
import { db, markScheduleDone } from "../../db/db";
import { Chip, type IconName } from "../../lib/icons";
import { buildSchedule, KIND_LABEL, type ScheduleItem } from "./schedule";

const KIND_ICON: Record<ScheduleItem["kind"], IconName> = { asi: "syringe", izlem: "stethoscope", tarama: "microscope", ilac: "pill" };
const KIND_TONE: Record<ScheduleItem["kind"], "accent" | "uyku" | "biberon" | "emzirme"> = { asi: "emzirme", izlem: "uyku", tarama: "biberon", ilac: "accent" };

/** Aşı yapıldı işaretlenince 12 parçacık saçılır */
function Burst() {
  const parts = ["✨", "🎉", "💛", "⭐"];
  return (
    <>
      {Array.from({ length: 12 }, (_, n) => {
        const a = (n / 12) * Math.PI * 2;
        const r = 60 + (n % 3) * 20;
        return (
          <span
            key={n}
            className="burst text-lg"
            style={{ ["--dx" as string]: `${Math.cos(a) * r}px`, ["--dy" as string]: `${Math.sin(a) * r}px` }}
          >
            {parts[n % parts.length]}
          </span>
        );
      })}
    </>
  );
}

/** Türkiye sağlık takvimi: doğum tarihinden üretilir, yapılanlar işaretlenir */
export default function Calendar() {
  const baby = useLiveQuery(() => db.baby.get("me"));
  const done = useLiveQuery(() => db.scheduleDone.toArray(), []) ?? [];
  const [burst, setBurst] = useState<string | null>(null);
  if (!baby) return null;

  const doneKeys = new Set(done.map((d) => d.key));
  const items = buildSchedule(baby.birthDate);
  const today = new Date();

  const isLate = (i: ScheduleItem) => differenceInCalendarDays(i.date, today) < -(i.windowDays ?? 0);
  const upcoming = items.filter((i) => !doneKeys.has(i.key) && !isLate(i));
  const overdue = items.filter((i) => !doneKeys.has(i.key) && isLate(i));
  const finished = items.filter((i) => doneKeys.has(i.key));

  const toggle = async (i: ScheduleItem) => {
    if (doneKeys.has(i.key)) await db.scheduleDone.delete(i.key);
    else {
      await markScheduleDone(i.key);
      setBurst(i.key); // minik kutlama
      window.setTimeout(() => setBurst((k) => (k === i.key ? null : k)), 900);
    }
  };

  // iPhone Takvimi aboneliği: webcal:// → Takvim uygulaması "Abone ol" sorar, sonra kendi alarmlarını kurar
  const subscribe = () => {
    const p = new URLSearchParams({ d: baby.birthDate, n: baby.name });
    if (baby.dvitTime) p.set("dv", baby.dvitTime);
    window.location.href = `webcal://${window.location.host}/api/takvim?${p}`;
  };

  return (
    <div className="flex flex-col gap-4 pt-1">
      {overdue.length > 0 && (
        <Section title="Geçmiş — kontrol et" items={overdue} doneKeys={doneKeys} toggle={toggle} tone="warn" burst={burst} />
      )}
      <Section title="Yaklaşan" items={upcoming.slice(0, 12)} doneKeys={doneKeys} toggle={toggle} burst={burst} />
      {finished.length > 0 && <Section title="Yapıldı" items={finished} doneKeys={doneKeys} toggle={toggle} dim />}
      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Telefon alarmı</h2>
        <p className="text-xs muted">
          iPhone Takvimi'ne abone ol: aşı ve izlem günleri 3 gün önce ve o sabah 09:00'da, D vitamini her gün{" "}
          {baby.dvitTime ?? "09:00"}'da telefonun kendi alarmıyla hatırlatılır — uygulama kapalı olsa da.
        </p>
        <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={subscribe}>
          📅 iPhone takvimine abone ol
        </button>
      </section>
      <p className="text-xs muted">
        Kaynak: Sağlık Bakanlığı 2026 aşı takvimi ve bebek izlem protokolü. Tarihler hedeftir; aile hekiminizin planı esastır.
      </p>
    </div>
  );
}

function Section({
  title,
  items,
  doneKeys,
  toggle,
  tone,
  dim,
  burst,
}: {
  title: string;
  items: ScheduleItem[];
  doneKeys: Set<string>;
  toggle: (i: ScheduleItem) => void;
  tone?: "warn";
  dim?: boolean;
  burst?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section style={dim ? { opacity: 0.6 } : undefined}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: tone === "warn" ? "#f6b26b" : "var(--muted)" }}>
        {title}
      </h2>
      <div className="card divide-y divide-(--line) p-0">
        {items.map((i) => {
          const days = differenceInCalendarDays(i.date, new Date());
          const when = days === 0 ? "bugün" : days > 0 ? `${days} gün sonra` : `${-days} gün önce`;
          return (
            <button key={i.key} className="relative w-full flex items-center gap-3 px-3 py-3 text-left" onClick={() => toggle(i)}>
              {burst === i.key && <Burst />}
              {doneKeys.has(i.key) ? <Chip name="check" tone="bez" size={36} /> : <Chip name={KIND_ICON[i.kind]} tone={KIND_TONE[i.kind]} size={36} />}
              <span className="flex-1">
                <div className="text-sm font-medium">{i.title}</div>
                <div className="text-xs muted">
                  {KIND_LABEL[i.kind]} · {format(i.date, "d MMM yyyy", { locale: tr })} · {when}
                  {i.detail ? ` · ${i.detail}` : ""}
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
