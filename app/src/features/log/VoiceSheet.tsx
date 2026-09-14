import { useEffect, useRef, useState } from "react";
import { addEvent, db, endEvent, reopenEvent, startEvent } from "../../db/db";
import { Icon } from "../../lib/icons";
import { parseTurkishMulti, PARSER_EXAMPLES, type Parsed } from "./parseTurkish";

// Minimal tip: Web Speech API (tarayıcıya göre önekli)
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
}
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
const AUTO_MS = 2000; // metin bu kadar süre değişmezse kendiliğinden kaydet

/** Ayrıştırılmış komutu uygula; etiket + geri alma döner */
export async function applyParsed(p: Parsed): Promise<{ label: string; undo?: () => Promise<void> }> {
  const running = async (type: "uyku" | "emzirme") => (await db.events.where("type").equals(type).reverse().sortBy("start")).find((e) => e.end == null);
  if (p.kind === "add") { const id = await addEvent(p.event); return { label: p.label, undo: () => db.events.delete(id) }; }
  if (p.kind === "sleepStart") { const id = await addEvent({ type: "uyku", start: p.at }); return { label: p.label, undo: () => db.events.delete(id) }; }
  if (p.kind === "sleepEnd") {
    const r = await running("uyku");
    if (!r) return { label: "Devam eden uyku yok" };
    await db.events.update(r.id, { end: Math.max(p.at, r.start), updatedAt: Date.now() });
    return { label: p.label, undo: () => reopenEvent(r.id) };
  }
  if (p.kind === "feedEnd") {
    const r = await running("emzirme");
    if (!r) return { label: "Devam eden emzirme yok" };
    await db.events.update(r.id, { end: Math.max(p.at, r.start), updatedAt: Date.now() });
    return { label: p.label, undo: () => reopenEvent(r.id) };
  }
  // switchSide
  const r = await running("emzirme");
  if (!r) return { label: "Devam eden emzirme yok" };
  await endEvent(r.id);
  const other = r.side === "sol" ? "sag" : "sol";
  const id = await startEvent("emzirme", { side: other });
  return { label: `${r.side === "sol" ? "Sol" : "Sağ"} bitti · ${other === "sol" ? "Sol" : "Sağ"} başladı`, undo: async () => { await db.events.delete(id); await reopenEvent(r.id); } };
}

/**
 * Sesli kayıt: Kayıt ekranında yüzen 🎤 düğmesi → alttan açılan sayfa. Az dokunuş:
 *  iPhone: 🎤 (1) → klavyedeki mikrofon (1) → konuş → metin 2 sn değişmeyince KENDİLİĞİNDEN kaydeder.
 *  Android Chrome: 🎤 (1) → doğrudan dinler → kaydeder.
 * "sağdan 15 dakika emdi ve kaka yaptı" gibi birden çok komut tek cümlede olabilir.
 * Kutu hep DOM'da durur: iOS klavyeyi yalnız dokunuş sırasında odaklanan kutu için açar.
 */
export default function VoiceSheet({ onSaved }: { onSaved: (label: string, undo?: () => Promise<void>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [results, setResults] = useState<Parsed[]>([]);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0); // 0-1 kendiliğinden kaydet sayacı
  const [tip, setTip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const tick = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const clearTimers = () => { window.clearTimeout(timer.current); window.clearInterval(tick.current); setProgress(0); };
  const close = () => { clearTimers(); setOpen(false); setText(""); setResults([]); setHint(""); setListening(false); inputRef.current?.blur(); };

  // results state'i zamanlayıcıdan çağrılan save içinde güncel olsun diye ref
  const resultsRef = useRef(results); resultsRef.current = results;
  const save = async () => {
    const rs = resultsRef.current;
    if (busy.current || rs.length === 0) return;
    busy.current = true;
    clearTimers();
    try {
      const done: { label: string; undo?: () => Promise<void> }[] = [];
      for (const p of rs) done.push(await applyParsed(p));
      const undos = done.map((d) => d.undo).filter(Boolean) as (() => Promise<void>)[];
      onSaved(done.map((d) => d.label).join(" · "), undos.length ? async () => { for (const u of undos) await u(); } : undefined);
      close();
    } finally { busy.current = false; }
  };

  const analyze = (v: string) => {
    setText(v);
    clearTimers();
    const r = v.trim().length >= 3 ? parseTurkishMulti(v) : [];
    setResults(r);
    // Not (anlaşılmayan cümle) kendiliğinden kaydedilmez; yapılandırılmış komut 2 sn sonra kaydedilir
    const structured = r.length > 0 && !r.some((p) => p.kind === "add" && p.event.type === "not");
    if (!structured) return;
    const t0 = Date.now();
    tick.current = window.setInterval(() => setProgress(Math.min(1, (Date.now() - t0) / AUTO_MS)), 100);
    timer.current = window.setTimeout(() => { void save(); }, AUTO_MS);
  };
  useEffect(() => { if (!open) clearTimers(); }, [open]);

  const listenAndroid = () => {
    try {
      const r = new SR!();
      r.lang = "tr-TR"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (ev) => { const t = ev.results?.[0]?.[0]?.transcript ?? ""; setListening(false); if (t) analyze(t); };
      r.onerror = (ev) => { setListening(false); setHint(ev.error === "not-allowed" ? "Mikrofon izni verilmedi — yazabilirsin." : "Ses tanınamadı; tekrar dene ya da yaz."); };
      r.onend = () => setListening(false);
      setHint(""); setListening(true); r.start();
    } catch { setListening(false); setHint("Ses tanıma başlatılamadı; yaz."); }
  };
  /** Yüzen düğme: iPhone'da kutuyu DOKUNUŞ İÇİNDE odakla (klavye açılsın), Android'de doğrudan dinle */
  const openSheet = () => {
    setOpen(true);
    if (!IOS && SR) { listenAndroid(); return; }
    inputRef.current?.focus();
    setHint("Klavyedeki 🎤 tuşuna bas, konuş. Anlayınca 2 sn içinde kendiliğinden kaydeder.");
  };

  const structured = results.length > 0 && !results.some((p) => p.kind === "add" && p.event.type === "not");

  return (
    <>
      {!open && (
        <button
          className="fixed z-30 rounded-full flex items-center justify-center shadow-lg"
          style={{ right: 16, bottom: "calc(env(safe-area-inset-bottom) + 76px)", width: 58, height: 58, background: "var(--accent)", color: "var(--on-accent)" }}
          aria-label="Sesle kayıt" onClick={openSheet}
        >
          <Icon name="mic" size={26} />
        </button>
      )}
      {open && <div className="fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.5)" }} onClick={close} />}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 card safe-bottom rounded-b-none flex flex-col gap-2 pb-4"
        style={{ transform: open ? "translateY(0)" : "translateY(110%)", transition: "transform 0.25s ease", pointerEvents: open ? "auto" : "none" }}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2"><Icon name="mic" size={18} /> Söyle{listening && <span className="text-xs font-normal" style={{ color: "#e8703f" }}>dinliyorum…</span>}</div>
          <button className="muted px-2" onClick={close} aria-label="Kapat">✕</button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => analyze(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="“sağdan on beş dakika emdi ve kaka yaptı”"
            className="flex-1 input mt-0 min-w-0"
            style={{ minHeight: 48 }}
            autoCapitalize="none" autoCorrect="off" enterKeyHint="done"
          />
          {text && <button className="muted px-2" onClick={() => analyze("")} aria-label="Temizle">✕</button>}
        </div>
        {hint && <p className="text-xs muted">{hint}</p>}
        {results.length > 0 && (
          <div className="flex flex-col gap-1">
            {results.map((p, i) => <div key={i} className="text-sm flex items-center gap-2"><Icon name="check" size={16} className="muted" /> <b>{p.label}</b></div>)}
            {structured && progress > 0 && <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--line)" }}><div className="h-full" style={{ width: `${progress * 100}%`, background: "var(--accent)", transition: "width 0.1s linear" }} /></div>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs muted">{structured ? "kendiliğinden kaydedilecek — istemezsen ✕" : "Anlayamadım; not olarak kaydedebilirim."}</span>
              <button className="btn btn-accent text-sm px-4" style={{ minHeight: 40 }} onClick={save}>{structured ? "Şimdi kaydet" : "Not olarak kaydet"}</button>
            </div>
          </div>
        )}
        {!text && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {PARSER_EXAMPLES.map((ex) => (
              <button key={ex} className="text-[11px] px-2 py-1 rounded-lg whitespace-nowrap muted" style={{ background: "var(--card-2)" }} onClick={() => analyze(ex)}>{ex}</button>
            ))}
          </div>
        )}
        {!text && IOS && (
          <div className="text-[11px] muted">
            <button className="underline" onClick={() => setTip((v) => !v)}>Eller serbest: "Hey Siri, Bilge" {tip ? "▲" : "▼"}</button>
            {tip && (
              <ol className="list-decimal pl-4 mt-1 flex flex-col gap-0.5">
                <li>Kısayollar uygulaması → + → eylem ekle: <b>Metni Dikte Et</b> (dil: Türkçe).</li>
                <li>İkinci eylem: <b>URL'yi Aç</b> → adres: <b>{location.origin}/?say=</b> ve hemen ardından "Diktelenen Metin" değişkenini ekle.</li>
                <li>Kısayola <b>Bilge</b> adını ver. Artık "Hey Siri, Bilge" → "sağdan on beş dakika emdi" → kaydolur.</li>
                <li>Not: Safari'de açılır; ilk seferde orada da aile kodunu gir (aynı deftere yazar).</li>
              </ol>
            )}
          </div>
        )}
      </div>
    </>
  );
}
