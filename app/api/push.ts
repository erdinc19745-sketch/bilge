import { Receiver } from "@upstash/qstash";
import webpush from "web-push";

/**
 * QStash zamanı gelince burayı çağırır; imzayı doğrulayıp mesajdaki aboneliklere Web Push gönderir.
 * Ham gövde gerekli (imza gövde üzerinden) → Vercel'in JSON ayrıştırmasını kapatıyoruz.
 */
export const config = { api: { bodyParser: false } };

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; on(ev: string, cb: (c?: Buffer) => void): void };
type Res = { status(c: number): Res; json(b: unknown): void; send(b: string): void };

function rawBody(req: Req): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => c && chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).send("POST");
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
    return res.status(503).json({ error: "ortam değişkenleri eksik" });
  }

  const body = await rawBody(req);
  const sig = (req.headers["upstash-signature"] ?? "") as string;
  const receiver = new Receiver({ currentSigningKey: QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: QSTASH_NEXT_SIGNING_KEY });
  const ok = await receiver.verify({ signature: sig, body }).catch(() => false);
  if (!ok) return res.status(401).json({ error: "imza geçersiz" });

  const msg = JSON.parse(body) as { title: string; body: string; tag: string; subs: webpush.PushSubscription[] };
  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:bilge@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag });
  const results = await Promise.all(
    msg.subs.map((s) =>
      webpush
        .sendNotification(s, payload, { TTL: 3600, urgency: "high" })
        .then(() => "ok")
        .catch((e: { statusCode?: number }) => `hata ${e.statusCode ?? "?"}`),
    ),
  );
  return res.status(200).json({ results });
}
