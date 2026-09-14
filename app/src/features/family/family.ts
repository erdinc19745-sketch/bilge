/**
 * Aile kodu girişi — cihazda tutulan iki şey: aile kodu ve "ben kimim" rolü.
 * Kod, Dexie Cloud oturumu almak için /api/token'a gider; rol her kayda `by` olarak işlenir.
 */
export type Role = "anne" | "baba" | "anneanne" | "babaanne" | "bakici";
export const ROLE_LABEL: Record<Role, string> = { anne: "Anne", baba: "Baba", anneanne: "Anneanne", babaanne: "Babaanne", bakici: "Bakıcı" };

const K_CODE = "bilge.familyCode";
const K_ROLE = "bilge.role";

const safeGet = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* özel mod */ } };

export const getFamilyCode = () => safeGet(K_CODE);
export const setFamilyCode = (c: string) => safeSet(K_CODE, c.replace(/\s+/g, "").toUpperCase());
export const getRole = (): Role | "" => safeGet(K_ROLE) as Role | "";
export const setRole = (r: Role) => safeSet(K_ROLE, r);

/** dexie-cloud-addon fetchTokens: kodu sunucuya götür, Dexie oturumunu getir */
export async function fetchFamilyTokens(params: { public_key: string; hints?: unknown }) {
  const code = getFamilyCode();
  if (!code) throw new Error("Aile kodu girilmemiş");
  // Bu cihaz daha önce girdiyse "yenileme"dir (Dexie oturumu saatlik tazelenir) → sunucu günlüğe yazmaz
  const first = safeGet("bilge.loggedIn") !== "1";
  const r = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, public_key: params.public_key, first }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error ?? "Giriş başarısız");
  safeSet("bilge.loggedIn", "1");
  return json;
}
