import { useEffect, useState } from "react";

/**
 * Onay penceresi: ask({...}) → Promise<boolean>. Tarayıcının çirkin confirm()'i yerine
 * uygulamanın kendi alt sayfası. Yanlış dokunmayı önlemek için kritik işlemlerde kullanılır.
 */
export interface AskOptions { title: string; text?: string; ok?: string; cancel?: string; danger?: boolean }
type Pending = AskOptions & { resolve: (v: boolean) => void };

let listener: ((p: Pending | null) => void) | null = null;

export function ask(o: AskOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(window.confirm(o.text ? `${o.title}\n${o.text}` : o.title)); // host yoksa yedek
    listener({ ...o, resolve });
  });
}

/** App kökünde bir kez render edilir */
export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  useEffect(() => {
    listener = setP;
    return () => { listener = null; };
  }, []);
  if (!p) return null;
  const done = (v: boolean) => { p.resolve(v); setP(null); };
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => done(false)}>
      <div className="slide-up card safe-bottom rounded-b-none flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold">{p.title}</div>
        {p.text && <p className="text-sm muted">{p.text}</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn text-base" style={{ minHeight: 56 }} onClick={() => done(false)}>{p.cancel ?? "Vazgeç"}</button>
          <button className={`btn text-base ${p.danger ? "" : "btn-accent"}`} style={{ minHeight: 56, ...(p.danger ? { background: "#b3423a", color: "#fff" } : {}) }} onClick={() => done(true)}>
            {p.ok ?? "Evet"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Hangi hızlı işlemler onay istesin? (cihaz ayarı) ---- */
export type ConfirmKey = "uyku-baslat" | "uyku-bitir" | "emzirme-bitir" | "dvit" | "bez" | "biberon";
export const CONFIRM_LABEL: Record<ConfirmKey, string> = {
  "uyku-baslat": "Uyudu",
  "uyku-bitir": "Uyandı",
  "emzirme-bitir": "Emzirmeyi bitir",
  dvit: "D vitamini",
  bez: "Bez",
  biberon: "Biberon",
};
const DEFAULTS: Record<ConfirmKey, boolean> = { "uyku-baslat": false, "uyku-bitir": true, "emzirme-bitir": false, dvit: true, bez: false, biberon: false };
const KEY = "bilge.confirm";

export function getConfirmPrefs(): Record<ConfirmKey, boolean> {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
}
export function setConfirmPref(k: ConfirmKey, v: boolean) {
  const cur = getConfirmPrefs();
  cur[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* */ }
}
/** İşlem onaylı mı? Onaylıysa sorar; değilse doğrudan true */
export async function confirmIfNeeded(k: ConfirmKey, o: AskOptions): Promise<boolean> {
  return getConfirmPrefs()[k] ? ask(o) : true;
}
