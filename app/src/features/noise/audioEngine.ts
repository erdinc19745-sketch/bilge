/**
 * Uyku sesi motoru — uygulama çapında tek örnek; ekran/bölme değişse de çalar.
 * Dikişsiz döngü: Web Audio AudioBufferSourceNode(loop). Arka planda kalması için (iOS) aynı dokunuşla
 * başlatılan sessiz bir <audio loop> ses oturumunu açık tutar; Media Session kilit ekranı kontrolü verir.
 */
export type Kind = "beyaz" | "pembe" | "kahve" | "kalp";
export const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "pembe", label: "Yağmur", hint: "pembe gürültü — en çok tercih edilen" },
  { id: "kahve", label: "Dalga", hint: "kahverengi gürültü — derin, yumuşak" },
  { id: "beyaz", label: "Beyaz", hint: "düz beyaz gürültü" },
  { id: "kalp", label: "Kalp atışı", hint: "anne karnı ritmi, 70/dk" },
];

export interface NoiseState { playing: boolean; kind: Kind; volume: number; endsAt: number | null; timerMin: number }
const state: NoiseState = { playing: false, kind: "pembe", volume: 0.6, endsAt: null, timerMin: 30 };
const listeners = new Set<(s: NoiseState) => void>();
const emit = () => listeners.forEach((l) => l({ ...state }));
export const subscribe = (l: (s: NoiseState) => void) => { listeners.add(l); l({ ...state }); return () => { listeners.delete(l); }; };
export const getState = () => ({ ...state });

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let src: AudioBufferSourceNode | null = null;
let keepAlive: HTMLAudioElement | null = null;
let timer: number | undefined;
const buffers = new Map<Kind, AudioBuffer>();

/** 30 sn'lik döngü tamponu (dikiş yerinde çapraz karışım) */
function makeBuffer(c: AudioContext, kind: Kind): AudioBuffer {
  const sr = c.sampleRate, sec = 30, n = sr * sec;
  const buf = c.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0, seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296) * 2 - 1; };
  for (let i = 0; i < n; i++) {
    const w = rnd();
    if (kind === "beyaz") out[i] = w * 0.25;
    else if (kind === "pembe") { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    else if (kind === "kahve") { last = (last + 0.02 * w) / 1.02; out[i] = last * 3.5; }
    else {
      const t = i / sr, beat = 60 / 70, ph = t % beat;
      const thump = (at: number, len: number, f: number) => (ph > at && ph < at + len ? Math.sin((Math.PI * (ph - at)) / len) * Math.sin(2 * Math.PI * f * (ph - at)) : 0);
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164;
      out[i] = thump(0, 0.12, 45) * 0.6 + thump(0.22, 0.1, 40) * 0.45 + (b0 + b1) * 0.02;
    }
  }
  const x = Math.floor(sr * 1.0); // 1 sn çapraz karışım: son 1 sn ile ilk 1 sn
  for (let i = 0; i < x; i++) { const a = i / x; out[n - x + i] = out[n - x + i] * (1 - a) + out[i] * a; }
  return buf;
}

/** 1 sn sessiz WAV — iOS'ta ses oturumunu açık tutmak için döngüde çalar */
function silentWav(): string {
  const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    gain = ctx.createGain(); gain.connect(ctx.destination);
    document.addEventListener("visibilitychange", () => { if (state.playing && ctx?.state === "suspended") ctx.resume().catch(() => undefined); });
  }
  if (!keepAlive) { keepAlive = new Audio(silentWav()); keepAlive.loop = true; keepAlive.volume = 0.01; }
  return { ctx: ctx!, gain: gain! };
}

export async function play(kind: Kind = state.kind) {
  const { ctx: c, gain: g } = ensure();
  if (c.state === "suspended") await c.resume().catch(() => undefined);
  src?.stop(); src?.disconnect();
  if (!buffers.has(kind)) buffers.set(kind, makeBuffer(c, kind));
  src = c.createBufferSource(); src.buffer = buffers.get(kind)!; src.loop = true; src.connect(g); src.start();
  g.gain.value = state.volume;
  keepAlive?.play().catch(() => undefined);
  state.kind = kind; state.playing = true;
  state.endsAt = state.timerMin ? Date.now() + state.timerMin * 60_000 : null;
  window.clearInterval(timer);
  timer = window.setInterval(() => { if (state.endsAt && Date.now() >= state.endsAt) stop(); else emit(); }, 1000);
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: KINDS.find((k) => k.id === kind)!.label, artist: "Bilge · uyku sesi" });
    navigator.mediaSession.setActionHandler("pause", stop);
    navigator.mediaSession.setActionHandler("play", () => play(kind));
  }
  emit();
}

let keepAliveWanted = false; // alarm modu istiyor mu
export function stop() {
  src?.stop(); src?.disconnect(); src = null;
  if (!keepAliveWanted) keepAlive?.pause();
  state.playing = false; state.endsAt = null;
  window.clearInterval(timer);
  emit();
}

/** Alarm modu: sessiz tutucu ses (uygulamayı arka planda uyanık tutar) */
export async function keepAliveStart() {
  const { ctx: c } = ensure();
  if (c.state === "suspended") await c.resume().catch(() => undefined);
  keepAliveWanted = true;
  await keepAlive?.play().catch(() => undefined);
  if ("mediaSession" in navigator && !state.playing) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: "Gece alarm modu açık", artist: "Bilge" });
  }
}
export function keepAliveStop() { keepAliveWanted = false; if (!state.playing) keepAlive?.pause(); }

/* ---- Alarm sesi: 880/1320 Hz çift bip, 1,2 sn'de bir, durdurulana kadar ---- */
let alarmTimer: number | undefined;
function beepPair() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, at] of [[880, 0], [1320, 0.2], [880, 0.4], [1320, 0.6]] as [number, number][]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(0.5, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.17);
    o.start(t + at); o.stop(t + at + 0.2);
  }
}
export async function playAlarmTone() {
  const { ctx: c } = ensure();
  if (c.state === "suspended") await c.resume().catch(() => undefined);
  keepAlive?.play().catch(() => undefined);
  window.clearInterval(alarmTimer);
  beepPair();
  alarmTimer = window.setInterval(beepPair, 1200);
}
export function stopAlarmTone() { window.clearInterval(alarmTimer); alarmTimer = undefined; }

export function setVolume(v: number) { state.volume = v; if (gain) gain.gain.value = v; emit(); }
export function setTimer(min: number) { state.timerMin = min; if (state.playing) state.endsAt = min ? Date.now() + min * 60_000 : null; emit(); }
export function setKind(k: Kind) { state.kind = k; if (state.playing) play(k); else emit(); }

/** Kısa zil (uygulama açıkken hatırlatma zamanı gelince) — kullanıcı bir kez dokunmuşsa çalar */
export async function chime() {
  try {
    const { ctx: c } = ensure();
    if (c.state === "suspended") await c.resume();
    const t = c.currentTime;
    for (const [f, at] of [[880, 0], [1175, 0.18], [880, 0.36]] as [number, number][]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(0.25, t + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.16);
      o.start(t + at); o.stop(t + at + 0.2);
    }
    navigator.vibrate?.([80, 60, 80]);
  } catch { /* ses açılamadı */ }
}
