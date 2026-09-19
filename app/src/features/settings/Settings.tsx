import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { db, demoMode, ensureFamilyRealm } from "../../db/db";
import Family from "./Family";
import NotifySettings from "../notify/NotifySettings";
import LayoutSettings from "./LayoutSettings";
import DataReset from "./DataReset";
import { getThemePref, setThemePref, type ThemePref } from "../../lib/theme";
import { CONFIRM_LABEL, getConfirmPrefs, setConfirmPref, type ConfirmKey } from "../../lib/confirm";
import { Icon } from "../../lib/icons";

/**
 * Ayarlar. Sıra: bebek (özet satırı, "Düzenle" ile form) → bildirimler → aile → kayıt ekranı → görünüm → veri → sıfırla.
 * Bebek formu yalnız ilk kurulumda ya da Düzenle'ye basınca açılır; her açılışta form görmek gereksiz.
 */
export default function Settings() {
  const baby = useLiveQuery(() => db.baby.get("me"));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [sex, setSex] = useState<"kiz" | "erkek">("kiz");
  const [dvitTime, setDvitTime] = useState("09:00");
  const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const [confirms, setConfirms] = useState(getConfirmPrefs());

  useEffect(() => {
    if (baby) {
      setName(baby.name);
      setBirthDate(baby.birthDate);
      setBirthTime(baby.birthTime ?? "");
      setSex(baby.sex);
      setDvitTime(baby.dvitTime ?? "09:00");
    }
  }, [baby]);

  const save = async () => {
    if (!name || !birthDate) return setMsg("İsim ve doğum tarihi gerekli.");
    if (baby) {
      // Var olan kaydı güncelle (put tüm kaydı ezer: hatırlatma kuralları, nöbet, taburculuk saati kaybolurdu)
      await db.baby.update("me", { name, birthDate, birthTime: birthTime || undefined, sex, dvitTime });
    } else {
      // Bulut açıksa: ilk kayıtta aile alanı oluşur, bebek kaydı o alana yazılır
      const realmId = await ensureFamilyRealm();
      await db.baby.put({ id: "me", name, birthDate, birthTime: birthTime || undefined, sex, dvitTime, realmId });
    }
    setMsg("Kaydedildi.");
    setEditing(false);
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
    try { localStorage.setItem("bilge.lastBackup", String(Date.now())); } catch { /* */ }
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Bilge yedek" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
    }
  };

  /** Excel'de açılan CSV (UTF-8 BOM + noktalı virgül: Türkçe Excel bunu doğrudan sütunlara ayırır) */
  const exportCsv = async () => {
    const ev = await db.events.orderBy("start").toArray();
    const TYPE: Record<string, string> = { emzirme: "Emzirme", biberon: "Biberon", bez: "Bez", uyku: "Uyku", ates: "Ateş", ilac: "İlaç", not: "Not", sagma: "Süt sağma", sarilik: "Sarılık", ekgida: "Ek gıda", belirti: "Belirti", aktivite: "Aktivite" };
    const dt = (t?: number) => (t ? format(t, "yyyy-MM-dd HH:mm") : "");
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Tür", "Başlangıç", "Bitiş", "Süre (dk)", "Taraf", "ml", "Biberon türü", "Bez", "Kaka rengi", "Ateş °C", "İlaç", "Besin", "Tepki", "Belirti", "Aktivite", "Not", "Kim"];
    const rows = ev.map((e) => [
      TYPE[e.type] ?? e.type, dt(e.start), dt(e.end), e.end ? Math.round((e.end - e.start) / 60_000) : "", e.side === "sol" ? "Sol" : e.side === "sag" ? "Sağ" : "",
      e.amountMl ?? "", e.bottleKind === "sut" ? "Anne sütü" : e.bottleKind === "mama" ? "Mama" : "", e.diaper === "islak" ? "Çiş" : e.diaper === "kaka" ? "Kaka" : e.diaper === "ikisi" ? "Çiş+Kaka" : "",
      e.stoolColor ?? "", e.tempC ?? "", e.medName ?? "", e.food ?? "", e.reaction ?? "", (e.symptoms ?? []).join(", "), e.activity ?? "", e.note ?? "", e.by ?? "",
    ].map(q).join(";"));
    const csv = "\ufeff" + [head.map(q).join(";"), ...rows].join("\r\n");
    const fileName = `bilge-kayitlar-${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File([csv], fileName, { type: "text/csv;charset=utf-8" });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Bilge kayıtlar (CSV)" });
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = fileName; a.click(); }
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

  const showForm = !baby || editing;
  const lastBackup = (() => { try { return Number(localStorage.getItem("bilge.lastBackup") || 0); } catch { return 0; } })();

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
        {baby && !editing ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{baby.name} <span className="muted font-normal text-sm">· {baby.sex === "kiz" ? "kız" : "erkek"}</span></div>
              <div className="text-xs muted">Doğum {format(parseISO(baby.birthDate), "d MMMM yyyy", { locale: tr })} · D vitamini {baby.dvitTime ?? "09:00"}</div>
            </div>
            <button className="btn text-sm px-3 shrink-0 flex items-center gap-1" style={{ minHeight: 40 }} onClick={() => { setEditing(true); setMsg(""); }}><Icon name="sliders" size={16} /> Düzenle</button>
          </div>
        ) : (
          <h2 className="font-semibold">{baby ? "Bebek bilgisi" : "Bebeğini tanıt"}</h2>
        )}
        {showForm && (
          <>
            <label className="text-sm muted">
              İsim
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm muted">
              Doğum tarihi
              <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </label>
            <label className="text-sm muted">
              Doğum saati (isteğe bağlı)
              <input type="time" className="input" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </label>
            <label className="text-sm muted">
              D vitamini saati (hatırlatma)
              <input type="time" className="input" value={dvitTime} onChange={(e) => setDvitTime(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["kiz", "erkek"] as const).map((s) => (
                <button key={s} className="btn text-base" style={{ minHeight: 48, outline: sex === s ? "2px solid var(--accent)" : "none" }} onClick={() => setSex(s)}>
                  {s === "kiz" ? "Kız" : "Erkek"}
                </button>
              ))}
            </div>
            <div className={`grid gap-2 ${baby ? "grid-cols-2" : "grid-cols-1"}`}>
              {baby && <button className="btn text-base" style={{ minHeight: 52 }} onClick={() => { setEditing(false); setMsg(""); }}>Vazgeç</button>}
              <button className="btn btn-accent" style={{ minHeight: 52 }} onClick={save}>Kaydet</button>
            </div>
          </>
        )}
        {msg && <p className="text-sm muted">{msg}</p>}
      </section>

      {baby && !demoMode && <NotifySettings baby={baby} />}

      {baby && !demoMode && <Family />}

      {baby && <LayoutSettings />}

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
          <h2 className="font-semibold">Yedek</h2>
          <p className="text-xs muted">
            Kayıtlar telefonda ve aile bulutunda durur. Ayda bir yedeği dosya olarak al (Dosyalar/iCloud'a kaydet; fotoğraflar hariç); gerekirse aynı dosyayla geri yükle.
            {lastBackup ? ` Son yedek: ${new Date(lastBackup).toLocaleDateString("tr-TR")}.` : " Henüz yedek alınmadı."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn text-base" style={{ minHeight: 48 }} onClick={exportJson}>Yedeği paylaş</button>
            <label className="btn text-base flex items-center justify-center" style={{ minHeight: 48 }}>
              Geri yükle
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
          <button className="btn text-sm" style={{ minHeight: 44 }} onClick={exportCsv}>Excel için CSV indir / paylaş (tüm kayıtlar)</button>
        </section>
      )}

      {baby && <DataReset />}

      <p className="text-[10px] muted text-center pb-2">
        Bilge · sürüm {__BUILD__} · Tıbbi tavsiye değildir; eşikler Sağlık Bakanlığı / WHO / AAP / NICE kaynaklıdır (Özet → Değerlendirme → kaynaklar).
      </p>
    </div>
  );
}
