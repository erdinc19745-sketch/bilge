import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, demoMode, ensureFamilyRealm } from "../../db/db";
import Family from "./Family";
import NotifySettings from "../notify/NotifySettings";
import LayoutSettings from "./LayoutSettings";
import DataReset from "./DataReset";
import { getThemePref, setThemePref, type ThemePref } from "../../lib/theme";
import { CONFIRM_LABEL, getConfirmPrefs, setConfirmPref, type ConfirmKey } from "../../lib/confirm";

/** Bebek bilgisi + veri yedeği (JSON dışa/içe aktarma). Veri bizim, telefonda durur. */
export default function Settings() {
  const baby = useLiveQuery(() => db.baby.get("me"));
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"kiz" | "erkek">("kiz");
  const [dvitTime, setDvitTime] = useState("09:00");
  const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const [confirms, setConfirms] = useState(getConfirmPrefs());

  useEffect(() => {
    if (baby) {
      setName(baby.name);
      setBirthDate(baby.birthDate);
      setSex(baby.sex);
      setDvitTime(baby.dvitTime ?? "09:00");
    }
  }, [baby]);

  const save = async () => {
    if (!name || !birthDate) return setMsg("İsim ve doğum tarihi gerekli.");
    // Bulut açıksa: ilk kayıtta aile alanı oluşur, bebek kaydı o alana yazılır
    const realmId = baby?.realmId ?? (await ensureFamilyRealm());
    await db.baby.put({ id: "me", name, birthDate, sex, dvitTime, realmId });
    setMsg("Kaydedildi.");
  };

  const exportJson = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      baby: await db.baby.toArray(),
      events: await db.events.toArray(),
      measurements: await db.measurements.toArray(),
      scheduleDone: await db.scheduleDone.toArray(),
      milestones: await db.milestones.toArray(),
      motherLog: await db.motherLog.toArray(),
      meds: await db.meds.toArray(),
      expenses: await db.expenses.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const fileName = `bilge-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], fileName, { type: "application/json" });
    // iPhone: paylaşım menüsü açılır (Dosyalar, WhatsApp, Mail...). Masaüstü: indirme.
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Bilge yedek" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
    }
  };

  const importJson = async (f: File) => {
    const data = JSON.parse(await f.text());
    await db.transaction("rw", [db.baby, db.events, db.measurements, db.scheduleDone, db.milestones, db.motherLog, db.meds, db.expenses], async () => {
      if (data.baby) await db.baby.bulkPut(data.baby);
      if (data.events) await db.events.bulkPut(data.events);
      if (data.measurements) await db.measurements.bulkPut(data.measurements);
      if (data.scheduleDone) await db.scheduleDone.bulkPut(data.scheduleDone);
      if (data.milestones) await db.milestones.bulkPut(data.milestones);
      if (data.motherLog) await db.motherLog.bulkPut(data.motherLog);
      if (data.meds) await db.meds.bulkPut(data.meds);
      if (data.expenses) await db.expenses.bulkPut(data.expenses);
    });
    setMsg(`${data.events?.length ?? 0} kayıt içe aktarıldı.`);
  };

  const inputCls = "input";

  return (
    <div className="flex flex-col gap-4 pt-1">
      {demoMode && (
        <section className="card flex flex-col gap-2" style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--card))" }}>
          <h2 className="font-semibold">Demo modu</h2>
          <p className="text-xs">Bu kopya örnek veriyle çalışır, buluta bağlanmaz, hiçbir aileye ait değildir. İstediğin gibi kurcala. Gerçek kullanım için aile kodu gerekir.</p>
          <button className="btn text-sm" style={{ minHeight: 40 }} onClick={() => { try { localStorage.setItem("bilge.demo", "0"); } catch { /* */ } location.href = "/"; }}>Demo'dan çık</button>
        </section>
      )}
      {!baby && (
        <p className="text-sm muted">
          Aile defteri boş görünüyor. Başka bir telefonda kayıt varsa birkaç saniye bekle (senkron iniyor); yoksa bebeğini tanıt.
        </p>
      )}

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Bebek</h2>
        <label className="text-sm muted">
          İsim
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm muted">
          Doğum tarihi
          <input type="date" className={inputCls} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <label className="text-sm muted">
          D vitamini saati (takvim hatırlatması)
          <input type="time" className={inputCls} value={dvitTime} onChange={(e) => setDvitTime(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["kiz", "erkek"] as const).map((s) => (
            <button
              key={s}
              className="btn text-base"
              style={{ minHeight: 48, outline: sex === s ? "2px solid var(--accent)" : "none" }}
              onClick={() => setSex(s)}
            >
              {s === "kiz" ? "Kız" : "Erkek"}
            </button>
          ))}
        </div>
        <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={save}>
          Kaydet
        </button>
        {msg && <p className="text-sm muted">{msg}</p>}
      </section>

      {baby && (
        <section className="card flex flex-col gap-2">
          <h2 className="font-semibold">Görünüm</h2>
          <div className="grid grid-cols-3 gap-2">
            {([["auto", "Otomatik"], ["dark", "Koyu"], ["light", "Açık"]] as [ThemePref, string][]).map(([v, l]) => (
              <button key={v} className={`btn text-sm ${theme === v ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => { setThemePref(v); setTheme(v); }}>
                {l}
              </button>
            ))}
          </div>
          <p className="text-xs muted">Otomatik: 08:00-20:00 açık, gece koyu (gece mavi ışık yok, gözü almaz).</p>
        </section>
      )}

      {baby && (
        <section className="card flex flex-col gap-2">
          <h2 className="font-semibold">Onay iste</h2>
          <p className="text-xs muted">Seçili işlemler kaydedilmeden önce "Evet" ister — yanlış dokunmayı önler. Diğerleri tek dokunuşla girer (6 sn Geri al her zaman var).</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CONFIRM_LABEL) as ConfirmKey[]).map((k) => (
              <button
                key={k}
                className={`btn text-sm ${confirms[k] ? "btn-accent" : ""}`}
                style={{ minHeight: 44 }}
                onClick={() => { setConfirmPref(k, !confirms[k]); setConfirms(getConfirmPrefs()); }}
              >
                {confirms[k] ? "✓ " : ""}{CONFIRM_LABEL[k]}
              </button>
            ))}
          </div>
        </section>
      )}

      {baby && <LayoutSettings />}

      {baby && (
        <section className="card flex flex-col gap-2">
          <h2 className="font-semibold">Kilit ekranından tek dokunuş (iOS Kısayolları)</h2>
          <p className="text-xs muted">
            Kısayollar uygulaması → + → "URL'yi aç" → adres: <b style={{ color: "var(--text)" }}>{window.location.origin}/?act=emzir-sol</b> → kısayolu ana ekrana ya da kilit ekranı widget'ına ekle.
            Dokununca uygulama açılır ve kaydı hemen alır. Değerler: emzir-sol · emzir-sag · emzir-bitir · uyku · uyandi · bez-islak · bez-kaka · dvit
          </p>
          <button className="btn text-sm" style={{ minHeight: 40 }} onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?act=emzir-sol`)}>Örnek adresi kopyala</button>
        </section>
      )}

      {baby && !demoMode && <NotifySettings baby={baby} />}

      {baby && !demoMode && <Family />}

      {baby && (
        <section className="card flex flex-col gap-2">
          <h2 className="font-semibold">Veri</h2>
          <p className="text-xs muted">
            Kayıtlar bu telefonda durur. Yedeği dosya olarak al; başka telefona aynı dosyayla geri yükle.
          </p>
          <button className="btn text-base" style={{ minHeight: 48 }} onClick={exportJson}>
            Yedeği paylaş / indir
          </button>
          <label className="btn text-base flex items-center justify-center" style={{ minHeight: 48 }}>
            Yedekten geri yükle
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
            />
          </label>
        </section>
      )}

      {baby && <DataReset />}
    </div>
  );
}
