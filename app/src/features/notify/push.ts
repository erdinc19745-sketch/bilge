import { db, familyRealmId } from "../../db/db";
import { getRole, ROLE_LABEL, type Role } from "../family/family";

export const VAPID_PUBLIC: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

/** iPhone'da push yalnızca ana ekrana eklenmiş uygulamada çalışır */
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export const pushSupported = () => !!VAPID_PUBLIC && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Bu cihaz için bildirim izni al, aboneliği aile alanına kaydet */
export async function enablePush(): Promise<"ok" | "denied" | "unsupported" | "not-standalone"> {
  if (!pushSupported()) return "unsupported";
  if (/iPhone|iPad/.test(navigator.userAgent) && !isStandalone()) return "not-standalone";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) as BufferSource }));
  const j = sub.toJSON();
  const id = await sha1(sub.endpoint);
  await db.pushSubs.put({
    id,
    endpoint: sub.endpoint,
    keys: { p256dh: j.keys!.p256dh, auth: j.keys!.auth },
    device: `${/iPhone/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Cihaz"}${getRole() ? ` (${ROLE_LABEL[getRole() as Role]})` : ""}`,
    createdAt: Date.now(),
    realmId: await familyRealmId(),
  });
  return "ok";
}

/** Bu cihazın aboneliğini kaldır */
export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await db.pushSubs.delete(await sha1(sub.endpoint));
    await sub.unsubscribe();
  }
}

/** Bu cihaz kayıtlı mı? */
export async function thisDeviceSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub && !!(await db.pushSubs.get(await sha1(sub.endpoint)));
}

async function sha1(s: string) {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}
