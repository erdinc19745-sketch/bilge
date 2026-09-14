import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { db, familyRealmId, uid } from "../../db/db";
import { Chip, Icon } from "../../lib/icons";
import { EPDS, EPDS_INTRO, EPDS_SELF_HARM, EPDS_TEXT, scoreEpds } from "./epds";

const MOOD = ["😞", "😕", "😐", "🙂", "😊"];
const MOOD_LABEL = ["çok kötü", "kötü", "idare eder", "iyi", "çok iyi"];

/**
 * Anne paneli: günlük ruh hali / su / gece uykusu / ilaç (aile defterinde, senkron) +
 * EPDS taraması (yalnız bu telefonda; buluta gitmez).
 */
export default function MotherPage({ onClose }: { onClose: () => void }) {
  const from = startOfDay(subDays(Date.now(), 13)).getTime();
  const logs = useLiveQuery(() => db.motherLog.where("at").aboveOrEqual(from).toArray(), [from]) ?? [];
  const tests = useLiveQuery(() => db.epds.orderBy("at").reverse().toArray(), []) ?? [];
  const [testing, setTesting] = useState(false);

  const day0 = startOfDay(Date.now()).getTime();
  const today = logs.filter((l) => l.at >= day0);
  const water = today.filter((l) => l.kind === "su").reduce((s, l) => s + (l.value ?? 0), 0);
  const mood = today.filter((l) => l.kind === "ruh").sort((a, b) => b.at - a.at)[0]?.value;
  const sleep = today.filter((l) => l.kind === "uyku").sort((a, b) => b.at - a.at)[0]?.value;
  const meds = today.filter((l) => l.kind === "ilac").map((l) => l.note);

  const log = async (kind: "ruh" | "su" | "uyku" | "ilac", value?: number, note?: string) => {
    await db.motherLog.add({ id: uid(), at: Date.now(), kind, value, note, realmId: await familyRealmId() });
  };
  const last = tests[0];
  const nextDue = last ? 14 - differenceInCalendarDays(new Date(), last.at) : 0;

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 pb-8 safe-top">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-xl font-bold flex items-center gap-2"><Chip name="heart" tone="accent" size={32} /> Anne</h1>
          <button className="muted px-2" onClick={onClose}><Icon name="x" size={22} /></button>
        </div>

        {testing ? (
          <EpdsTest onDone={async (answers) => {
            const r = scoreEpds(answers);
            await db.epds.add({ id: uid(), at: Date.now(), answers, total: r.total, selfHarm: r.selfHarm });
            setTesting(false);
          }} onCancel={() => setTesting(false)} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Bugün */}
            <section className="card flex flex-col gap-3">
              <div className="section-title" style={{ margin: 0 }}>Bugün nasılsın?</div>
              <div className="grid grid-cols-5 gap-2">
                {MOOD.map((m, i) => (
                  <button key={i} className={`btn text-2xl ${mood === i + 1 ? "btn-accent" : ""}`} style={{ minHeight: 56 }} onClick={() => log("ruh", i + 1)} aria-label={MOOD_LABEL[i]}>{m}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="card py-3 flex flex-col items-center gap-1" style={{ background: "var(--card-2)" }}>
                  <div className="label">Su</div>
                  <div className="hero-num" style={{ fontSize: 24 }}>{water}<span className="text-sm muted"> bardak</span></div>
                  <button className="btn text-sm px-3" style={{ minHeight: 36 }} onClick={() => log("su", 1)}>+1</button>
                </div>
                <div className="card py-3 flex flex-col items-center gap-1" style={{ background: "var(--card-2)" }}>
                  <div className="label">Gece uykum</div>
                  <div className="hero-num" style={{ fontSize: 24 }}>{sleep ?? "—"}<span className="text-sm muted"> sa</span></div>
                  <div className="flex gap-1">
                    {[3, 5, 7].map((h) => <button key={h} className="btn text-xs px-2" style={{ minHeight: 32 }} onClick={() => log("uyku", h)}>{h}</button>)}
                  </div>
                </div>
                <div className="card py-3 flex flex-col items-center gap-1" style={{ background: "var(--card-2)" }}>
                  <div className="label">İlacım</div>
                  <div className="text-xs text-center muted">{meds.length ? meds.join(", ") : "—"}</div>
                  <div className="flex gap-1">
                    <button className="btn text-xs px-2" style={{ minHeight: 32 }} onClick={() => log("ilac", 1, "demir")}>demir</button>
                    <button className="btn text-xs px-2" style={{ minHeight: 32 }} onClick={() => log("ilac", 1, "vitamin")}>vit.</button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] muted">Bunlar aile defterine yazılır — eşin de "dün 3 saat uyumuş" diye görür ve nöbeti alır. Emziren anne için günde 10-12 bardak su önerilir.</p>
            </section>

            {/* Son 14 gün */}
            {logs.length > 0 && (
              <section className="card flex flex-col gap-2">
                <div className="section-title" style={{ margin: 0 }}>Son 14 gün</div>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                  {Array.from({ length: 14 }, (_, i) => {
                    const d = startOfDay(subDays(Date.now(), 13 - i)).getTime();
                    const dl = logs.filter((l) => l.at >= d && l.at < d + 86_400_000);
                    const m = dl.filter((l) => l.kind === "ruh").sort((a, b) => b.at - a.at)[0]?.value;
                    const s = dl.filter((l) => l.kind === "uyku")[0]?.value;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5 text-[10px]">
                        <span className="text-base leading-none">{m ? MOOD[m - 1] : "·"}</span>
                        <span className="muted">{s ?? ""}</span>
                        <span className="muted">{format(d, "d", { locale: tr })}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] muted">üst: ruh hali · orta: gece uykusu (sa) · alt: gün</div>
              </section>
            )}

            {/* EPDS */}
            <section className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Doğum sonrası ruh hali taraması</div>
                  <div className="text-xs muted">EPDS · 10 soru · 3 dakika · {last ? `son: ${format(last.at, "d MMM", { locale: tr })}, puan ${last.total}` : "henüz yapılmadı"}</div>
                </div>
                <button className="btn btn-accent text-sm px-4" style={{ minHeight: 44 }} onClick={() => setTesting(true)}>{last ? (nextDue <= 0 ? "Tekrar yap" : "Yap") : "Başla"}</button>
              </div>
              {last && (
                <div className="rounded-xl p-3 text-sm" style={{ background: last.total >= 13 || last.selfHarm ? "color-mix(in srgb, #b3423a 16%, var(--card))" : last.total >= 10 ? "color-mix(in srgb, #e2b93b 16%, var(--card))" : "color-mix(in srgb, var(--c-bez) 14%, var(--card))" }}>
                  <b>{EPDS_TEXT[scoreEpds(last.answers).level].title}</b> — {EPDS_TEXT[scoreEpds(last.answers).level].text}
                  {last.selfHarm && <p className="mt-2 font-semibold">{EPDS_SELF_HARM}</p>}
                  {nextDue > 0 && <div className="text-xs muted mt-1">Sonraki tarama: {nextDue} gün sonra</div>}
                </div>
              )}
              {tests.length > 1 && (
                <div className="text-xs muted">Geçmiş: {tests.slice(0, 6).map((t) => `${format(t.at, "d MMM", { locale: tr })} → ${t.total}`).join(" · ")}</div>
              )}
              <p className="text-[10px] muted">Sonuçlar yalnız bu telefonda saklanır, buluta gitmez. Doğum sonrası depresyon her 7-8 anneden birinde görülür, tedavi edilebilir; ilk 6 hafta en sık dönemdir. Ölçek: Cox, Holden & Sagovsky 1987; Türkçe: Engindeniz ve ark. 1996.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** 10 soru, tek tek; ilerleme çubuğu; geri dönülebilir */
function EpdsTest({ onDone, onCancel }: { onDone: (answers: number[]) => void; onCancel: () => void }) {
  const [i, setI] = useState(-1); // -1 = giriş
  const [answers, setAnswers] = useState<number[]>([]);
  if (i === -1) {
    return (
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold">Son 7 gün</h2>
        <p className="text-sm">{EPDS_INTRO}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn text-base" style={{ minHeight: 48 }} onClick={onCancel}>Vazgeç</button>
          <button className="btn btn-accent" style={{ minHeight: 48 }} onClick={() => setI(0)}>Başla</button>
        </div>
      </div>
    );
  }
  const item = EPDS[i];
  // Ölçeğin aslındaki gibi: ters maddelerde seçenekler 3→0 sırasıyla listelenir
  const order = item.reverse ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const pick = (score: number) => {
    const next = [...answers]; next[i] = score; setAnswers(next);
    if (i === EPDS.length - 1) onDone(next); else setI(i + 1);
  };
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs muted">
        <button onClick={() => (i === 0 ? onCancel() : setI(i - 1))}>‹ geri</button>
        <span>{i + 1} / {EPDS.length}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
        <div className="h-full rounded-full" style={{ width: `${((i + 1) / EPDS.length) * 100}%`, background: "var(--accent)" }} />
      </div>
      <p className="text-base font-semibold pt-1">{item.q}</p>
      <div className="flex flex-col gap-2">
        {order.map((score) => (
          <button key={score} className={`btn text-sm text-left px-4 ${answers[i] === score ? "btn-accent" : ""}`} style={{ minHeight: 48 }} onClick={() => pick(score)}>
            {item.options[score]}
          </button>
        ))}
      </div>
    </div>
  );
}
