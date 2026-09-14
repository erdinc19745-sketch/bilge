import { useState } from "react";
import { Chip } from "../../lib/icons";
import { addEvent, db } from "../../db/db";
import { parseTurkish, PARSER_EXAMPLES, type Parsed } from "./parseTurkish";

// Minimal tip: Web Speech API (tarayıcıya göre önekli)
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
}

/**
 * Sesle / yazarak kayıt. iPhone'da klavyedeki 🎤 ile Türkçe dikte → metin → ayrıştır → önizle → Kaydet.
 * Web Speech API iOS'ta Türkçe'de güvenilmez; klavye diktesi her zaman çalışır.
 */
export default function VoiceInput({ onSaved }: { onSaved: (label: string, undo?: () => Promise<void>) => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Parsed | null | "?">(null);
  const [listening, setListening] = useState(false);
  const [micHint, setMicHint] = useState("");
  // Tarayıcı konuşma tanıma (Chrome/Android; iOS Safari'de Apple sunucusu, Türkçe desteği cihaza göre)
  const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  const listen = () => {
    if (!SR) return setMicHint("Bu tarayıcıda ses tanıma yok; klavyedeki mikrofonu kullan.");
    try {
      const r = new SR();
      r.lang = "tr-TR"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (ev) => { const t = ev.results?.[0]?.[0]?.transcript ?? ""; setListening(false); if (t) analyze(t); };
      r.onerror = (ev) => { setListening(false); setMicHint(ev.error === "not-allowed" ? "Mikrofon izni verilmedi." : "Ses tanınamadı; klavyedeki mikrofonu dene."); };
      r.onend = () => setListening(false);
      setMicHint(""); setListening(true); r.start();
    } catch { setListening(false); setMicHint("Ses tanıma başlatılamadı; klavyedeki mikrofonu kullan."); }
  };

  const analyze = (v: string) => {
    setText(v);
    setPreview(v.trim().length < 3 ? null : (parseTurkish(v) ?? "?"));
  };

  const save = async () => {
    if (!preview || preview === "?") return;
    if (preview.kind === "add") {
      const id = await addEvent(preview.event);
      onSaved(preview.label, () => db.events.delete(id));
    } else if (preview.kind === "sleepStart") {
      const id = await addEvent({ type: "uyku", start: preview.at });
      onSaved(preview.label, () => db.events.delete(id));
    } else {
      const running = (await db.events.where("type").equals("uyku").reverse().sortBy("start")).find((e) => e.end == null);
      if (!running) return onSaved("Devam eden uyku yok");
      await db.events.update(running.id, { end: Math.max(preview.at, running.start), updatedAt: Date.now() });
      onSaved(preview.label);
    }
    setText("");
    setPreview(null);
  };

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <button onClick={listen} aria-label="Sesle söyle" className={listening ? "animate-pulse" : ""}>
          <Chip name="mic" tone={listening ? "danger" : "muted"} size={36} />
        </button>
        <input
          value={text}
          onChange={(e) => analyze(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="söyle ya da yaz: “sağdan on beş dakika emdi”"
          className="flex-1 input"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="done"
        />
        {text && (
          <button className="muted px-2" onClick={() => analyze("")} aria-label="Temizle">✕</button>
        )}
      </div>
      {micHint && <p className="text-xs muted">{micHint}</p>}
      {listening && <p className="text-xs" style={{ color: "#e8703f" }}>Dinliyorum… konuş</p>}
      {preview === "?" && <p className="text-xs muted">Anlayamadım. Örnek: “soldan 20 dakika”, “60 ml”, “kaka”, “yarım saat uyudu”, “38 derece”.</p>}
      {!text && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
          {PARSER_EXAMPLES.map((ex) => (
            <button key={ex} className="text-[11px] px-2 py-1 rounded-lg whitespace-nowrap muted" style={{ background: "var(--card-2)" }} onClick={() => analyze(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}
      {preview && preview !== "?" && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm">Anladım: <b>{preview.label}</b></span>
          <button className="btn btn-accent text-sm px-4" style={{ minHeight: 40 }} onClick={save}>Kaydet</button>
        </div>
      )}
    </div>
  );
}
