/**
 * Aile kodu ile giriş (Dexie Cloud özel kimlik doğrulama).
 * POST { code, public_key } → kod doğruysa Dexie Cloud'dan aile hesabı için oturum alınır ve
 * yanıt olduğu gibi istemciye döner (dexie-cloud-addon `fetchTokens` bunu bekler).
 * Ne e-posta ne OTP: kodu bilen aileden sayılır. client_secret yalnız burada, sunucuda.
 */
import { makeSessionCookie } from "./_lib/session.js";
import { familyRealm, writeAll } from "./_lib/dexie.js";

type Req = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Res = { status(c: number): Res; json(b: unknown): void; send(b: string): void; setHeader(k: string, v: string): void };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).send("POST");
  const { FAMILY_CODE, FAMILY_USER_ID, DEXIE_DB_URL, DEXIE_CLIENT_ID, DEXIE_CLIENT_SECRET } = process.env;
  if (!FAMILY_CODE || !FAMILY_USER_ID || !DEXIE_DB_URL || !DEXIE_CLIENT_ID || !DEXIE_CLIENT_SECRET) {
    return res.status(503).json({ error: "sunucu ayarı eksik" });
  }
  const b = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as { code?: string; public_key?: string; first?: boolean };
  // Tire/boşluk fark etmez: "N94Z-N52S" == "n94z n52s"
  const norm = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const code = norm(String(b.code ?? ""));

  // Kaba kuvvete karşı: her deneme 1 sn bekler
  await sleep(1000);
  if (code.length < 4 || code !== norm(FAMILY_CODE)) return res.status(401).json({ error: "Aile kodu hatalı" });
  if (!b.public_key) return res.status(400).json({ error: "public_key gerekli" });
  // Giriş günlüğü: zaman, cihaz, şehir (Vercel coğrafi başlıkları) — kod sızarsa ailede görünür
  const h = (k: string) => { const v = req.headers[k]; return Array.isArray(v) ? v[0] : v; };
  const ua = h("user-agent") ?? "";
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows PC" : /Macintosh/.test(ua) ? "Mac" : "Cihaz";
  const city = (() => { try { return decodeURIComponent(h("x-vercel-ip-city") ?? ""); } catch { return h("x-vercel-ip-city") ?? ""; } })();
  const country = h("x-vercel-ip-country") ?? "";
  const ip = (h("x-forwarded-for") ?? "").split(",")[0].trim();
  const logLogin = async (kind: string) => {
    const realmId = await familyRealm();
    if (!realmId) return;
    await writeAll("logins", [{ id: `lg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), kind, device, city, country, ip: ip.replace(/\.\d+$/, ".x"), realmId }]).catch(() => undefined);
  };

  // Yalnız oturum çerezi isteyen cihaz (Dexie girişi zaten var): Dexie'ye gitmeden çerez ver
  if (b.public_key === "session-only") { res.setHeader("Set-Cookie", makeSessionCookie()); await logLogin("oturum"); return res.status(200).json({ ok: true }); }

  const r = await fetch(`${DEXIE_DB_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      scopes: ["ACCESS_DB"],
      public_key: b.public_key,
      client_id: DEXIE_CLIENT_ID,
      client_secret: DEXIE_CLIENT_SECRET,
      claims: { sub: FAMILY_USER_ID, email: FAMILY_USER_ID, name: "Aile" },
    }),
  });
  const json = await r.json();
  if (!r.ok) return res.status(502).json({ error: "Dexie Cloud oturum vermedi", detail: json });
  res.setHeader("Set-Cookie", makeSessionCookie()); // diğer API'ler (hatırlatma) bu çerezi ister
  if (b.first !== false) await logLogin("giriş"); // saatlik token yenilemeleri (first:false) günlüğe girmez
  return res.status(200).json(json);
}
