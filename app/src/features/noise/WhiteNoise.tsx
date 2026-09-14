import { useEffect, useState } from "react";
import { Chip } from "../../lib/icons";
import { getState, KINDS, play, setKind, setTimer, setVolume, stop, subscribe, type NoiseState } from "./audioEngine";

/** Uyku sesi kartı — motor audioEngine'de; kart kapansa da ses sürer */
export default function WhiteNoise() {
  const [s, setS] = useState<NoiseState>(getState);
  const [open, setOpen] = useState(false);
  useEffect(() => subscribe(setS), []);
  const label = KINDS.find((k) => k.id === s.kind)!.label;

  return (
    <div className="card flex flex-col gap-2">
      <button className="flex items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="text-sm font-semibold flex items-center gap-2"><Chip name="waves" tone="uyku" size={28} /> Uyku sesi {s.playing ? "· çalıyor" : ""}</div>
          <div className="text-xs muted">
            {s.playing ? `${label}${s.endsAt ? ` · ${Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60_000))} dk kaldı` : " · sürekli"} · ekran değişse de çalar` : "yağmur, dalga, beyaz gürültü, kalp atışı — çevrimdışı"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.playing ? (
            <button className="btn btn-accent text-sm px-4" style={{ minHeight: 40 }} onClick={(e) => { e.stopPropagation(); stop(); }}>■ Durdur</button>
          ) : (
            <button className="btn text-sm px-4" style={{ minHeight: 40 }} onClick={(e) => { e.stopPropagation(); play(); }}>▶ Çal</button>
          )}
          <span className="muted">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button key={k.id} className={`btn text-sm ${s.kind === k.id ? "btn-accent" : ""}`} style={{ minHeight: 48 }} onClick={() => setKind(k.id)}>
                {k.label}<div className="text-[10px] font-normal opacity-80">{k.hint}</div>
              </button>
            ))}
          </div>
          <label className="text-xs muted">
            Ses: {Math.round(s.volume * 100)}%
            <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full" />
          </label>
          <div className="text-xs muted">Süre</div>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 60, 0].map((m) => (
              <button key={m} className={`btn text-sm ${s.timerMin === m ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => setTimer(m)}>
                {m ? `${m} dk` : "Sürekli"}
              </button>
            ))}
          </div>
          <p className="text-[10px] muted">Bebekten en az 2 m uzakta, %50 ses düzeyi (≈50 dB) önerilir; kulağın dibine koymayın. Ses telefonda üretilir, internet kullanmaz.</p>
        </div>
      )}
    </div>
  );
}
