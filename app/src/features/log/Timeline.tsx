import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { startOfDay } from "date-fns";
import { db } from "../../db/db";
import type { BabyEvent } from "../../db/types";
import { fmtDay, fmtDuration, fmtTime } from "../../lib/time";
import EditEvent from "./EditEvent";
import { swatch } from "../stool/stoolCard";
import { Chip, Icon, type IconName } from "../../lib/icons";
import DayBar from "./DayBar";
import AddPast from "./AddPast";
import { ROLE_LABEL, type Role } from "../family/family";

/** Günlük zaman şeridi: en yeni üstte, güne göre gruplu; satıra dokun → düzenle/sil */
export default function Timeline() {
  const events = useLiveQuery(() => db.events.orderBy("start").reverse().limit(500).toArray(), []) ?? [];
  const [editing, setEditing] = useState<BabyEvent | null>(null);
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");
  const [filter, setFilter] = useState<"hepsi" | "beslenme" | "uyku" | "bez" | "diger">("hepsi");
  const match = (e: BabyEvent) =>
    filter === "hepsi" ? true
    : filter === "beslenme" ? e.type === "emzirme" || e.type === "biberon"
    : filter === "uyku" ? e.type === "uyku"
    : filter === "bez" ? e.type === "bez"
    : e.type === "ates" || e.type === "ilac" || e.type === "not";

  // Güne göre grupla
  const groups = new Map<number, BabyEvent[]>();
  for (const e of events) {
    const k = startOfDay(e.start).getTime();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  if (events.length === 0 && !adding) return <p className="muted text-center pt-10">Henüz kayıt yok — Kayıt sekmesinden başla. <button className="underline" onClick={() => setAdding(true)}>Geçmişe kayıt ekle</button></p>;

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: "hepsi", label: "Hepsi" }, { id: "beslenme", label: "Beslenme" }, { id: "uyku", label: "Uyku" }, { id: "bez", label: "Bez" }, { id: "diger", label: "Diğer" },
  ];

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} className={`btn text-sm px-3 whitespace-nowrap ${filter === f.id ? "btn-accent" : ""}`} style={{ minHeight: 36 }} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
        <button className="btn text-sm px-3 whitespace-nowrap flex items-center gap-1" style={{ minHeight: 36, marginLeft: "auto" }} onClick={() => setAdding(true)} aria-label="Geçmişe kayıt ekle">
          <Icon name="plus" size={16} /> Geçmiş
        </button>
      </div>
      {addedMsg && <p className="text-xs muted -mt-2">{addedMsg}</p>}
      {[...groups.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className="text-sm font-semibold muted mb-1 flex justify-between">
            <span>{fmtDay(day)}</span>
            <span className="font-normal">{daySummary(list)}</span>
          </h2>
          <div className="mb-2">
            <DayBar day={day} events={list} />
          </div>
          <div className="card divide-y divide-(--line) p-0">
            {list.filter(match).map((e) => (
              <Row key={e.id} e={e} onTap={() => setEditing(e)} />
            ))}
          </div>
        </section>
      ))}
      {editing && <EditEvent e={editing} onClose={() => setEditing(null)} />}
      {adding && <AddPast onClose={() => setAdding(false)} onAdded={(m) => { setAddedMsg(m); window.setTimeout(() => setAddedMsg(""), 5000); }} />}
    </div>
  );
}

function daySummary(list: BabyEvent[]) {
  const feeds = list.filter((e) => e.type === "emzirme" || e.type === "biberon").length;
  const diapers = list.filter((e) => e.type === "bez").length;
  const sleepMs = list.filter((e) => e.type === "uyku" && e.end).reduce((s, e) => s + (e.end! - e.start), 0);
  return `${feeds} beslenme · ${diapers} bez · ${fmtDuration(sleepMs)} uyku`;
}

type Tone = "uyku" | "emzirme" | "bez" | "biberon" | "accent" | "muted" | "danger";
function describe(e: BabyEvent): { icon: IconName; tone: Tone; text: string } {
  const dur = e.end ? fmtDuration(e.end - e.start) : "devam ediyor";
  switch (e.type) {
    case "emzirme":
      return { icon: "baby", tone: "emzirme", text: `Emzirme · ${e.side === "sol" ? "Sol" : "Sağ"} · ${dur}` };
    case "biberon":
      return { icon: "bottle", tone: "biberon", text: `Biberon · ${e.amountMl} ml${e.bottleKind === "mama" ? " mama" : e.bottleKind === "sut" ? " anne sütü" : ""}` };
    case "ekgida":
      return { icon: "bottle", tone: e.reaction && e.reaction !== "yok" ? "danger" : "biberon", text: `Ek gıda · ${e.food ?? ""}${e.reaction && e.reaction !== "yok" ? ` · tepki: ${e.reaction}` : ""}` };
    case "sarilik":
      return { icon: "sun", tone: e.zone && e.zone >= 3 ? "danger" : "biberon", text: `Sarılık · ${e.note ?? (e.zone ? `bölge ${e.zone}` : "yok")}` };
    case "sagma":
      return { icon: "droplet", tone: "biberon", text: `Süt sağma · ${e.amountMl} ml${e.side ? ` · ${e.side === "sol" ? "sol" : "sağ"}` : ""}${e.store === "taze" ? "" : ` → ${e.store ?? ""}`}` };
    case "bez": {
      const sw = swatch(e.stoolColor);
      return { icon: e.diaper === "islak" ? "droplet" : "poo", tone: "bez", text: `Bez · ${e.diaper === "ikisi" ? "çiş + kaka" : e.diaper === "islak" ? "çiş" : "kaka"}${sw ? ` · renk ${sw.n}${sw.abnormal ? " ⚠ soluk" : ""}` : ""}` };
    }
    case "uyku":
      return { icon: "moon", tone: "uyku", text: `Uyku · ${dur}${e.end ? ` (${fmtTime(e.start)}–${fmtTime(e.end)})` : ""}` };
    case "ates":
      return { icon: "thermometer", tone: "danger", text: `Ateş · ${e.tempC?.toFixed(1)} °C` };
    case "ilac":
      return { icon: "pill", tone: "accent", text: `${e.medName ?? "İlaç"}${e.medId && e.note ? ` · ${e.note}` : ""}` };
    default:
      return { icon: "list", tone: "muted", text: e.note ?? "Not" };
  }
}

function Row({ e, onTap }: { e: BabyEvent; onTap: () => void }) {
  const d = describe(e);
  return (
    <button className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-white/5" onClick={onTap}>
      <span className="tabular-nums muted text-xs w-10">{fmtTime(e.start)}</span>
      <Chip name={d.icon} tone={d.tone} size={32} />
      <span className="flex-1 text-sm">{d.text}{e.note && e.type !== "not" ? <span className="muted"> · {e.note}</span> : null}</span>
      {e.by && <span className="text-[10px] px-1.5 py-0.5 rounded-md muted" style={{ background: "var(--line)" }}>{ROLE_LABEL[e.by as Role] ?? e.by}</span>}
      <Icon name="chevronRight" size={16} className="muted" />
    </button>
  );
}
