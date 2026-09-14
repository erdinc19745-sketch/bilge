/**
 * Sunucu tarafı Dexie Cloud REST erişimi (client_credentials). Aile verisini okumak/yazmak için:
 * takvim aboneliğine dinamik hatırlatmalar, giriş günlüğü. Anahtarlar yalnız sunucuda.
 */
let cached: { token: string; exp: number } | null = null;

async function token(): Promise<string | null> {
  const { DEXIE_DB_URL, DEXIE_CLIENT_ID, DEXIE_CLIENT_SECRET } = process.env;
  if (!DEXIE_DB_URL || !DEXIE_CLIENT_ID || !DEXIE_CLIENT_SECRET) return null;
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const r = await fetch(`${DEXIE_DB_URL}/token`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", scopes: ["ACCESS_DB", "GLOBAL_READ", "GLOBAL_WRITE"], client_id: DEXIE_CLIENT_ID, client_secret: DEXIE_CLIENT_SECRET }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { accessToken: string; accessTokenExpiration: string };
  cached = { token: j.accessToken, exp: new Date(j.accessTokenExpiration).getTime() };
  return j.accessToken;
}

export async function readAll<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const t = await token();
  if (!t) return [];
  const r = await fetch(`${process.env.DEXIE_DB_URL}/all/${encodeURIComponent(table)}`, { headers: { Authorization: `Bearer ${t}`, Accept: "application/json" } });
  if (!r.ok) return [];
  const j = await r.json();
  return (Array.isArray(j) ? j : j.data ?? []) as T[];
}

export async function writeAll(table: string, rows: Record<string, unknown>[]): Promise<boolean> {
  const t = await token();
  if (!t) return false;
  const r = await fetch(`${process.env.DEXIE_DB_URL}/all/${encodeURIComponent(table)}`, {
    method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(rows),
  });
  return r.ok;
}

/** Aile alanı kimliği (bebek kaydından) */
export async function familyRealm(): Promise<string | undefined> {
  const rows = await readAll<{ realmId?: string }>("baby");
  return rows[0]?.realmId;
}
