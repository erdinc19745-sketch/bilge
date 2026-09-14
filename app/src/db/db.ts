import Dexie, { type EntityTable } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Baby, BabyEvent, EpdsResult, Expense, LoginLog, Measurement, Medication, MilestoneDone, MotherLog, Photo, PushSub, Reminder, ScheduleDone } from "./types";
import { fetchFamilyTokens, getRole } from "../features/family/family";

// Bulut adresi: `npx dexie-cloud create` sonrası vite.config.ts bunu dexie-cloud.json'dan okur.
// Adres yoksa uygulama yalnız yerel çalışır — senkron dışında her şey aynı.
export const CLOUD_URL: string = import.meta.env.VITE_DEXIE_CLOUD_URL ?? "";

/**
 * Demo modu: ?demo=1 ile açılır ve cihazda kalır (localStorage). Bulut kapalı, ayrı veritabanı ("bilge-demo"),
 * örnek veri (dev/seed.ts). Bir doktora/arkadaşa göstermek için: gerçek deftere hiç dokunmaz, kod istemez.
 */
export const demoMode: boolean = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("demo")) localStorage.setItem("bilge.demo", q.get("demo") === "0" ? "0" : "1");
    return localStorage.getItem("bilge.demo") === "1";
  } catch { return false; }
})();
export const cloudEnabled = CLOUD_URL.length > 0 && !demoMode;

// IndexedDB üzerinde çalışır: internet olmasa da kayıt alınır.
// Şema satırında sadece INDEX'ler yazılır (id = primary key), tüm alanlar değil.
class BilgeDB extends Dexie {
  events!: EntityTable<BabyEvent, "id">;
  measurements!: EntityTable<Measurement, "id">;
  baby!: EntityTable<Baby, "id">;
  scheduleDone!: EntityTable<ScheduleDone, "key">;
  photos!: EntityTable<Photo, "id">;
  pushSubs!: EntityTable<PushSub, "id">;
  reminders!: EntityTable<Reminder, "kind">;
  milestones!: EntityTable<MilestoneDone, "key">;
  motherLog!: EntityTable<MotherLog, "id">;
  epds!: EntityTable<EpdsResult, "id">;
  meds!: EntityTable<Medication, "id">;
  expenses!: EntityTable<Expense, "id">;
  logins!: EntityTable<LoginLog, "id">;

  constructor() {
    super(demoMode ? "bilge-demo" : "bilge", cloudEnabled ? { addons: [dexieCloud] } : {});
    this.version(9).stores({
      events: "id, type, start, [type+start]",
      measurements: "id, at",
      baby: "id",
      scheduleDone: "key",
      photos: "id, month, at",
      pushSubs: "id",
      reminders: "kind",
      milestones: "key",
      motherLog: "id, at, kind",
      epds: "id, at",
      meds: "id, startAt",
      expenses: "id, at",
      logins: "id, at",
    });
  }
}

export const db = new BilgeDB();

if (cloudEnabled) {
  // Aile kodu ile giriş: e-posta/OTP yok. Kod /api/token'da doğrulanır, Dexie oturumu oradan gelir.
  // Giriş ekranını biz gösteriyoruz (customLoginGui), addon'un diyalogu kapalı.
  // epds: annenin tarama sonuçları cihazda kalır, senkronlanmaz (mahremiyet)
  db.cloud.configure({ databaseUrl: CLOUD_URL, requireAuth: false, customLoginGui: true, fetchTokens: fetchFamilyTokens, unsyncedTables: ["epds"] });
}

export const uid = () => crypto.randomUUID();

/* Bulut kapalıyken (yerel derleme / demo) db.cloud yok; aynı arayüzü veren sabit akışlar */
type Sub = { subscribe(o: { next?: (v: unknown) => void } | ((v: unknown) => void)): { unsubscribe(): void } };
const constant = <T,>(v: T): Sub => ({
  subscribe(o) { (typeof o === "function" ? o : o.next ?? (() => undefined))(v); return { unsubscribe() { /* sabit */ } }; },
});
export const currentUser$ = (cloudEnabled ? db.cloud.currentUser : constant({ isLoggedIn: false })) as typeof db.cloud.currentUser;
export const syncState$ = (cloudEnabled ? db.cloud.syncState : constant({ phase: "offline" })) as typeof db.cloud.syncState;
export const invites$ = (cloudEnabled ? db.cloud.invites : constant([])) as typeof db.cloud.invites;

/* ---------------- Aile alanı (realm) ---------------- */

/** Aile alanının kimliği bebek kaydında durur; bulut kapalıysa undefined */
export async function familyRealmId(): Promise<string | undefined> {
  if (!cloudEnabled) return undefined;
  return (await db.baby.get("me"))?.realmId;
}

/** İlk kurulumda aile alanını oluştur ve o ana kadarki yerel kayıtları içine taşı */
export async function ensureFamilyRealm(): Promise<string | undefined> {
  if (!cloudEnabled) return undefined;
  const existing = await familyRealmId();
  if (existing) return existing;
  // realmId'yi bulut üretir ('@realmId'); o yüzden vermiyoruz
  const realmId = (await db.realms.add({ name: "Aile", represents: "bebek defteri" } as never)) as string;
  await db.transaction("rw", db.events, db.measurements, db.scheduleDone, async () => {
    await db.events.toCollection().modify({ realmId });
    await db.measurements.toCollection().modify({ realmId });
    await db.scheduleDone.toCollection().modify({ realmId });
  });
  return realmId;
}

/** Anneyi (veya başka bir bakıcıyı) aile alanına davet et — sunucu e-posta gönderir */
export async function inviteMember(email: string, name: string) {
  const realmId = await familyRealmId();
  if (!realmId) throw new Error("Aile alanı yok");
  await db.members.add({ realmId, email, name, invite: true, permissions: { manage: "*" } } as never);
}

/* ---------------- Olay yardımcıları ---------------- */

/** Yeni olay ekle (tek satırlık kayıtlar: bez, biberon, ateş, ilaç) */
export async function addEvent(e: Omit<BabyEvent, "id" | "createdAt" | "updatedAt" | "realmId">) {
  const now = Date.now();
  const realmId = await familyRealmId();
  const id = uid();
  await db.events.add({ ...e, id, createdAt: now, updatedAt: now, realmId, by: getRole() || undefined });
  return id; // "Geri al" için
}

/** Süreli olay başlat (emzirme, uyku) — end boş kalır */
export async function startEvent(type: "emzirme" | "uyku", extra: Partial<BabyEvent> = {}) {
  return addEvent({ type, start: Date.now(), ...extra });
}

/** Devam eden olayı bitir */
export async function endEvent(id: string) {
  await db.events.update(id, { end: Date.now(), updatedAt: Date.now() });
}

/** Bitişi geri al — olay yeniden "devam ediyor" olur */
export async function reopenEvent(id: string) {
  await db.events.update(id, { end: undefined, updatedAt: Date.now() });
}

/** Takvim maddesini yapıldı işaretle */
export async function markScheduleDone(key: string) {
  await db.scheduleDone.put({ key, doneAt: Date.now(), realmId: await familyRealmId() });
}
