import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Aile oturumu çerezi: /api/token başarılı olunca verilir, diğer API'ler ister.
 * İçerik: "<exp>.<hmac>" — sunucu sırrı (SESSION_SECRET ya da DEXIE_CLIENT_SECRET) ile imzalı, 400 gün.
 */
const NAME = "bilge_session";
const secret = () => process.env.SESSION_SECRET || process.env.DEXIE_CLIENT_SECRET || "";
const sign = (exp: string) => createHmac("sha256", secret()).update(exp).digest("base64url");

export function makeSessionCookie(): string {
  const exp = String(Date.now() + 400 * 86_400_000);
  return `${NAME}=${exp}.${sign(exp)}; Path=/; Max-Age=${400 * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

export function hasValidSession(cookieHeader: string | string[] | undefined): boolean {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader ?? "";
  const m = raw.match(new RegExp(`(?:^|;\s*)${NAME}=([^;]+)`));
  if (!m || !secret()) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
