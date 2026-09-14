// Veri modeli. Tek tablo "events": her şey bir olay (emzirme, bez, uyku...).
// Bitişi olan olaylar (emzirme, uyku) "end" boşken "devam ediyor" sayılır.
//
// realmId: Dexie Cloud "aile alanı". Bulut kapalıyken boş kalır; açıkken tüm
// kayıtlar aile alanına yazılır ki anne ve baba aynı veriyi görsün.

export type EventType = "emzirme" | "biberon" | "bez" | "uyku" | "ates" | "ilac" | "not" | "sagma" | "sarilik" | "ekgida";

export interface BabyEvent {
  id: string; // UUID — Dexie Cloud'da aynen kullanılır
  type: EventType;
  start: number; // epoch ms
  end?: number; // emzirme / uyku bitişi
  side?: "sol" | "sag"; // emzirme
  amountMl?: number; // biberon / sağma
  bottleKind?: "sut" | "mama"; // biberon: anne sütü mü mama mı (stok düşümü için)
  store?: "dolap" | "dondurucu" | "taze"; // sağma: nereye kondu
  diaper?: "islak" | "kaka" | "ikisi"; // bez
  stoolColor?: number; // kaka rengi kartı 1-7 (1-3 soluk = dikkat)
  food?: string; // ek gıda: besin adı
  reaction?: "yok" | "dokuntu" | "kusma" | "ishal" | "huzursuz" | "solunum"; // ek gıda tepkisi
  zone?: number; // sarılık: 0 yok · 1 yüz · 2 gövde · 3 kol-bacak · 4 avuç-taban (Kramer)
  tempC?: number; // ateş
  medName?: string; // ilaç (D vitamini, demir...)
  medId?: string; // ilaç kürü kaydına bağ (meds tablosu)
  note?: string;
  by?: string; // kaydı giren: anne | baba | anneanne | babaanne | bakici
  createdAt: number;
  updatedAt: number;
  realmId?: string;
}

export interface Measurement {
  id: string;
  at: number;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
  realmId?: string;
}

export interface Baby {
  id: "me"; // tek bebek; ileride birden fazla olabilir
  name: string;
  birthDate: string; // "YYYY-MM-DD"
  sex: "kiz" | "erkek";
  dvitTime?: string; // "09:00" — D vitamini hatırlatma saati
  reminders?: { feedGapMin?: number; sleepMaxMin?: number; dvit?: boolean }; // bildirim kuralları
  nightShift?: { date: string; who: string }; // bu gecenin nöbetçisi (YYYY-MM-DD, rol)
  dischargeAt?: number; // hastaneden çıkış zamanı (sarılık kontrol kuralı için)
  realmId?: string; // aile alanı kimliği burada saklanır
}

// Web Push aboneliği (cihaz başına bir tane); aile alanında durur ki her cihaz herkese hatırlatabilsin
export interface PushSub {
  id: string; // endpoint'in sha1'i
  endpoint: string;
  keys: { p256dh: string; auth: string };
  device: string;
  createdAt: number;
  realmId?: string;
}

// Zamanlanmış hatırlatma (QStash mesajı); kind: feed | sleep | dvit
export interface Reminder {
  kind: string;
  at: number;
  msgId: string;
  updatedAt: number;
  realmId?: string;
}

// Fotoğraf: month = -1 profil, 0 doğum, 1..n aylık albüm. Küçültülmüş JPEG blob.
export interface Photo {
  id: string;
  month: number;
  at: number;
  blob: Blob;
  realmId?: string;
}

// Giriş günlüğü (sunucu yazar; aile görür): kod sızarsa buradan anlaşılır
export interface LoginLog { id: string; at: number; kind: string; device: string; city?: string; country?: string; ip?: string; realmId?: string }

// Gider defteri (aile defterinde)
export interface Expense {
  id: string;
  at: number;
  category: "bez" | "mama" | "ilac" | "doktor" | "giysi" | "diger";
  amount: number;
  note?: string;
  by?: string;
  realmId?: string;
}

// İlaç kürü: "Antibiyotik · 2,5 ml · 12 saatte bir · 7 gün"
export interface Medication {
  id: string;
  name: string;
  dose: string;
  intervalH: number;
  prn: boolean; // gerekirse
  startAt: number;
  endAt?: number;
  totalDoses?: number;
  endedAt?: number; // elle bitirildi
  createdAt: number;
  realmId?: string;
}

// Anne günlüğü (aile defterinde, senkron): ruh hali 1-5, su bardak, gece uykusu saat, ilaç adı
export interface MotherLog {
  id: string;
  at: number;
  kind: "ruh" | "su" | "uyku" | "ilac";
  value?: number;
  note?: string;
  realmId?: string;
}

// EPDS testi — YALNIZ bu cihazda (unsyncedTables), buluta gitmez
export interface EpdsResult {
  id: string;
  at: number;
  answers: number[];
  total: number;
  selfHarm: boolean;
}

// Gelişim basamağı işareti (milestones.ts key'i)
export interface MilestoneDone {
  key: string;
  doneAt: number;
  note?: string;
  realmId?: string;
}

// Takvimdeki bir maddeyi "yapıldı" işaretlemek için
export interface ScheduleDone {
  key: string; // schedule.ts'deki item.key
  doneAt: number;
  note?: string;
  realmId?: string;
}
