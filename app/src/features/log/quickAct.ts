import { addEvent, db, endEvent, startEvent } from "../../db/db";

/**
 * URL ile hızlı kayıt: bilge-omega.vercel.app/?act=emzir-sol
 * iOS Kısayolları → "URL aç" → kilit ekranı / ana ekran widget'ından tek dokunuşla kayıt.
 * Değerler: emzir-sol · emzir-sag · emzir-bitir · uyku · uyandi · bez-islak · bez-kaka · dvit
 */
export async function runQuickAct(): Promise<string | null> {
  const act = new URLSearchParams(location.search).get("act");
  if (!act) return null;
  history.replaceState(null, "", location.pathname); // yenilemede tekrar çalışmasın
  if (!(await db.baby.get("me"))) return "Önce bebek bilgisi gerekli";
  const recent = await db.events.orderBy("start").reverse().limit(50).toArray();
  const runFeed = recent.find((e) => e.type === "emzirme" && e.end == null);
  const runSleep = recent.find((e) => e.type === "uyku" && e.end == null);
  switch (act) {
    case "emzir-sol": case "emzir-sag":
      if (runFeed) { await endEvent(runFeed.id); return "Önceki emzirme bitirildi"; }
      await startEvent("emzirme", { side: act === "emzir-sol" ? "sol" : "sag" }); return `Kısayol: ${act === "emzir-sol" ? "sol" : "sağ"} emzirme başladı`;
    case "emzir-bitir":
      if (!runFeed) return "Devam eden emzirme yok";
      await endEvent(runFeed.id); return "Kısayol: emzirme bitti";
    case "uyku":
      if (runSleep) return "Zaten uyuyor";
      await startEvent("uyku"); return "Kısayol: uyku başladı";
    case "uyandi":
      if (!runSleep) return "Devam eden uyku yok";
      await endEvent(runSleep.id); return "Kısayol: uyandı";
    case "bez-islak": await addEvent({ type: "bez", start: Date.now(), diaper: "islak" }); return "Kısayol: ıslak bez";
    case "bez-kaka": await addEvent({ type: "bez", start: Date.now(), diaper: "kaka" }); return "Kısayol: kaka";
    case "dvit": await addEvent({ type: "ilac", start: Date.now(), medName: "D vitamini" }); return "Kısayol: D vitamini";
    default: return null;
  }
}
