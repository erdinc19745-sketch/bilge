import { Client } from "@upstash/qstash";
import { hasValidSession } from "./_lib/session.js";

/**
 * Hatırlatma zamanla / iptal et.
 * POST { action: "schedule", at: epochMs, title, body, tag, subs: PushSubscription[], repeat?: [0, 60, 180] } → { msgId }
 *   repeat: saniye cinsinden tekrar gecikmeleri (en çok 5). Uygulama kapalıyken iOS tek bildirim sesi çalar;
 *   birkaç dakika arayla tekrar eden bildirimler "alarm" yerine geçer. Uygulama açılınca istemci iptal eder.
 *   msgId virgülle ayrılmış birden çok QStash kimliği olabilir.
 * POST { action: "cancel", msgId } → { ok }
 * Sunucuda hiçbir şey saklanmaz: bildirim içeriği ve abonelikler QStash mesajının içinde taşınır,
 * zamanı gelince QStash /api/push'u çağırır.
 */
type Req = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Res = { setHeader(k: string, v: string): void; status(c: number): Res; json(b: unknown): void; send(b: string): void };

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).send("POST");
  // Yalnız aile koduyla giriş yapmış cihazlar (imzalı çerez) — başkası kotamızı kullanamaz
  if (!hasValidSession(req.headers.cookie)) return res.status(401).json({ error: "oturum yok; aile koduyla giriş gerekli" });
  const token = process.env.QSTASH_TOKEN;
  if (!token) return res.status(503).json({ error: "QSTASH_TOKEN tanımlı değil" });
  // QSTASH_URL: bölge adresi (EU/US); yoksa SDK varsayılanı
  const qstash = new Client({ token, baseUrl: process.env.QSTASH_URL || undefined });
  const b = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Record<string, unknown>;

  try {
    if (b.action === "cancel") {
      if (typeof b.msgId === "string") await Promise.all(b.msgId.split(",").filter(Boolean).map((id) => qstash.messages.delete(id).catch(() => undefined))); // teslim edilmişse sorun değil
      return res.status(200).json({ ok: true });
    }
    if (b.action === "schedule") {
      const at = Number(b.at);
      const subs = Array.isArray(b.subs) ? b.subs.slice(0, 10) : [];
      if (!at || subs.length === 0) return res.status(400).json({ error: "at ve subs gerekli" });
      const host = (req.headers["x-forwarded-host"] ?? req.headers.host) as string;
      const repeat = (Array.isArray(b.repeat) ? b.repeat : [0]).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 1800).slice(0, 5);
      const ids: string[] = [];
      for (const [i, off] of (repeat.length ? repeat : [0]).entries()) {
        const r = await qstash.publishJSON({
          url: `https://${host}/api/push`,
          body: {
            title: String(b.title ?? "Bilge"),
            body: i === 0 ? String(b.body ?? "") : `${String(b.body ?? "")} (tekrar ${i + 1}/${repeat.length} — uygulamayı açınca durur)`,
            tag: i === 0 ? String(b.tag ?? "bilge") : `${String(b.tag ?? "bilge")}-${i}`,
            subs,
          },
          notBefore: Math.max(Math.floor(at / 1000) + off, Math.floor(Date.now() / 1000) + 5),
          retries: 1,
        });
        ids.push(r.messageId);
      }
      return res.status(200).json({ msgId: ids.join(",") });
    }
    return res.status(400).json({ error: "action?" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
