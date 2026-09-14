import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { ask } from "../../lib/confirm";

/**
 * Deneme verilerini sıfırlama. Senkron açık olduğundan silme tüm aile telefonlarına yayılır;
 * o yüzden iki adımlı onay ve "önce yedek al" hatırlatması.
 */
export default function DataReset() {
  const counts = useLiveQuery(async () => ({
    events: await db.events.count(),
    measurements: await db.measurements.count(),
    photos: await db.photos.count(),
    schedule: await db.scheduleDone.count(),
    milestones: await db.milestones.count(),
  }), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /** Zamanlanmış bildirimleri de iptal et (QStash) */
  const cancelReminders = async () => {
    const rs = await db.reminders.toArray();
    for (const r of rs) {
      await fetch("/api/remind", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", msgId: r.msgId }) }).catch(() => undefined);
    }
    await db.reminders.clear();
  };

  const clearEvents = async () => {
    if (!(await ask({ title: "Tüm kayıtlar silinsin mi?", text: `${counts?.events ?? 0} kayıt (emzirme, bez, uyku, ateş, ilaç, not) silinir. Bebek bilgisi, ölçümler, fotoğraflar ve takvim işaretleri kalır. Aile telefonlarından da silinir.`, ok: "Kayıtları sil", danger: true }))) return;
    if (!(await ask({ title: "Emin misin?", text: "Bu işlem geri alınamaz. Gerekirse önce 'Yedeği paylaş / indir' ile yedek al.", ok: "Evet, sil", danger: true }))) return;
    setBusy(true);
    try { await cancelReminders(); await db.events.clear(); setMsg("Kayıtlar silindi."); } finally { setBusy(false); }
  };

  const clearAll = async () => {
    if (!(await ask({ title: "Her şey sıfırlansın mı?", text: "Kayıtlar, ölçümler, fotoğraflar, takvim ve gelişim işaretleri ve bebek bilgisi silinir; uygulama ilk açılış haline döner. Aile telefonlarından da silinir.", ok: "Sıfırla", danger: true }))) return;
    if (!(await ask({ title: "Son kez: emin misin?", text: "Geri alınamaz.", ok: "Evet, sıfırla", danger: true }))) return;
    setBusy(true);
    try {
      await cancelReminders();
      await db.transaction("rw", [db.events, db.measurements, db.photos, db.scheduleDone, db.milestones, db.baby, db.motherLog, db.epds, db.meds, db.expenses], async () => {
        await db.events.clear(); await db.measurements.clear(); await db.photos.clear();
        await db.scheduleDone.clear(); await db.milestones.clear(); await db.baby.clear();
        await db.motherLog.clear(); await db.epds.clear(); await db.meds.clear(); await db.expenses.clear();
      });
      try { localStorage.removeItem("bilge.tipsSeen"); localStorage.removeItem("bilge.doctorQuestions"); } catch { /* */ }
      setMsg("Sıfırlandı.");
    } finally { setBusy(false); }
  };

  return (
    <section className="card flex flex-col gap-2">
      <h2 className="font-semibold">Deneme verilerini sıfırla</h2>
      <p className="text-xs muted">
        Şu an: {counts?.events ?? 0} kayıt · {counts?.measurements ?? 0} ölçüm · {counts?.photos ?? 0} fotoğraf · {counts?.schedule ?? 0} takvim işareti · {counts?.milestones ?? 0} gelişim işareti.
        Gerçek kullanıma başlamadan önce deneme kayıtlarını buradan temizle.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn text-sm" style={{ minHeight: 48 }} disabled={busy} onClick={clearEvents}>🧹 Kayıtları sil</button>
        <button className="btn text-sm" style={{ minHeight: 48, color: "#e8703f" }} disabled={busy} onClick={clearAll}>⚠ Her şeyi sıfırla</button>
      </div>
      {msg && <p className="text-xs muted">{msg}</p>}
    </section>
  );
}
