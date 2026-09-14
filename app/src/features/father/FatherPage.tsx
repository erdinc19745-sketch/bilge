import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, startOfDay, startOfMonth, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { db, familyRealmId, uid } from "../../db/db";
import type { Baby, Expense } from "../../db/types";
import { ask } from "../../lib/confirm";
import { Chip, Icon } from "../../lib/icons";
import { getRole, ROLE_LABEL, type Role } from "../family/family";

const CATS: { id: Expense["category"]; label: string }[] = [
  { id: "bez", label: "Bez" }, { id: "mama", label: "Mama / süt" }, { id: "ilac", label: "İlaç" },
  { id: "doktor", label: "Doktor" }, { id: "giysi", label: "Giysi" }, { id: "diger", label: "Diğer" },
];
const money = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";

/**
 * Baba paneli: gece nöbeti (kayıtlardan ölçülür: 23-06 arası kim kalkmış), bu gecenin nöbetçisi,
 * annenin dün gece uykusu; gider defteri (bez, mama, ilaç, doktor…) aylık toplam.
 */
export default function FatherPage({ baby, onClose }: { baby: Baby; onClose: () => void }) {
  const from = startOfDay(subDays(Date.now(), 7)).getTime();
  const events = useLiveQuery(() => db.events.where("start").aboveOrEqual(from).toArray(), [from]) ?? [];
  const motherLogs = useLiveQuery(() => db.motherLog.where("at").aboveOrEqual(from).toArray(), [from]) ?? [];
  const monthFrom = startOfMonth(Date.now()).getTime();
  const expenses = useLiveQuery(() => db.expenses.where("at").aboveOrEqual(monthFrom).reverse().sortBy("at"), [monthFrom]) ?? [];

  // Gece kalkışları: 23:00-06:00 arasındaki beslenme/bez/uyanma kayıtları, etikete göre
  const night = events.filter((e) => { const h = new Date(e.start).getHours(); return (h >= 23 || h < 6) && (e.type === "emzirme" || e.type === "biberon" || e.type === "bez"); });
  const byRole = (r: string) => night.filter((e) => e.by === r).length;
  const anne = byRole("anne"), baba = byRole("baba"), other = night.length - anne - baba;
  const lastNightSleep = motherLogs.filter((l) => l.kind === "uyku").sort((a, b) => b.at - a.at)[0]?.value;

  // Bu gecenin nöbetçisi (bebek kaydında; senkron)
  const todayKey = format(Date.now(), "yyyy-MM-dd");
  const shift = baby.nightShift?.date === todayKey ? baby.nightShift.who : undefined;
  const setShift = (who: Role) => db.baby.update("me", { nightShift: { date: todayKey, who } });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = CATS.map((c) => ({ ...c, sum: expenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0) })).filter((c) => c.sum > 0);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 pb-8 safe-top flex flex-col gap-4">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-xl font-bold flex items-center gap-2"><Chip name="clock" tone="uyku" size={32} /> Gece nöbeti & giderler</h1>
          <button className="muted px-2" onClick={onClose}><Icon name="x" size={22} /></button>
        </div>

        {/* Nöbet */}
        <section className="card flex flex-col gap-3">
          <div className="section-title" style={{ margin: 0 }}>Son 7 gece (23:00–06:00) kim kalktı</div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Anne" v={anne} />
            <Stat label="Baba" v={baba} />
            <Stat label="Diğer / etiketsiz" v={other} />
          </div>
          <Bar a={anne} b={baba} />
          <p className="text-xs muted">
            {anne + baba === 0 ? "Gece kayıtları anne/baba etiketiyle biriktikçe burada görünür (Ayarlar → Aile senkronu → Bu telefonda ben)." :
              anne > baba * 2 ? "Gece yükü annede. Bir biberon ya da bez nöbetini almak annenin 2-3 saat kesintisiz uykusunu sağlar — doğum sonrası ruh sağlığı için en etkili tek şey." :
              "Yük dengeli görünüyor. Devam."}
          </p>
          {lastNightSleep !== undefined && <p className="text-sm">Annenin dün gece uykusu: <b>{lastNightSleep} sa</b>{lastNightSleep < 5 ? " — bu gece nöbet sende olsun" : ""}</p>}
          <div>
            <div className="text-xs muted mb-1">Bu gece nöbetçi</div>
            <div className="grid grid-cols-3 gap-2">
              {(["anne", "baba", "bakici"] as Role[]).map((r) => (
                <button key={r} className={`btn text-sm ${shift === r ? "btn-accent" : ""}`} style={{ minHeight: 44 }} onClick={() => setShift(r)}>{ROLE_LABEL[r]}</button>
              ))}
            </div>
            <p className="text-[10px] muted mt-1">İkiniz de görürsünüz; "kim kalkacak" tartışması sabahtan bitmiş olur.</p>
          </div>
        </section>

        {/* Giderler */}
        <section className="card flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div className="section-title" style={{ margin: 0 }}>{format(Date.now(), "MMMM", { locale: tr })} giderleri</div>
            <div className="hero-num" style={{ fontSize: 22 }}>{money(total)}</div>
          </div>
          {byCat.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {byCat.map((c) => <span key={c.id} className="px-2 py-1 rounded-lg" style={{ background: "var(--card-2)" }}>{c.label} {money(c.sum)}</span>)}
            </div>
          )}
          <ExpenseForm />
          {expenses.length > 0 && (
            <div className="card p-0 divide-y divide-(--line)" style={{ background: "var(--card-2)" }}>
              {expenses.slice(0, 15).map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="muted text-xs w-12">{format(e.at, "d MMM", { locale: tr })}</span>
                  <span className="flex-1">{CATS.find((c) => c.id === e.category)?.label}{e.note ? <span className="muted"> · {e.note}</span> : null}{e.by ? <span className="muted text-[10px]"> · {e.by}</span> : null}</span>
                  <span className="tabular-nums font-semibold">{money(e.amount)}</span>
                  <button className="muted text-xs px-1" onClick={async () => (await ask({ title: "Gider silinsin mi?", ok: "Sil", danger: true })) && db.expenses.delete(e.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="card py-2 text-center" style={{ background: "var(--card-2)" }}>
      <div className="hero-num" style={{ fontSize: 24 }}>{v}</div>
      <div className="text-[10px] muted">{label}</div>
    </div>
  );
}
function Bar({ a, b }: { a: number; b: number }) {
  const t = a + b || 1;
  return (
    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "var(--line)" }}>
      <div style={{ width: `${(a / t) * 100}%`, background: "var(--c-emzirme)" }} />
      <div style={{ width: `${(b / t) * 100}%`, background: "var(--c-uyku)" }} />
    </div>
  );
}

function ExpenseForm() {
  const [cat, setCat] = useState<Expense["category"]>("bez");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const save = async () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!n) return;
    await db.expenses.add({ id: uid(), at: Date.now(), category: cat, amount: n, note: note || undefined, by: getRole() || undefined, realmId: await familyRealmId() });
    setAmount(""); setNote("");
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {CATS.map((c) => <button key={c.id} className={`btn text-xs ${cat === c.id ? "btn-accent" : ""}`} style={{ minHeight: 36 }} onClick={() => setCat(c.id)}>{c.label}</button>)}
      </div>
      <div className="flex gap-2">
        <input inputMode="decimal" placeholder="₺" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className="input mt-0 w-24 text-center font-semibold" />
        <input placeholder="not (Prima 4 numara, 2 paket)" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className="input mt-0 flex-1" />
        <button className="btn btn-accent text-sm px-4" style={{ minHeight: 44 }} onClick={save} disabled={!amount}>Ekle</button>
      </div>
    </div>
  );
}
