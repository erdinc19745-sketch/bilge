import { addDays, addMonths, parseISO } from "date-fns";

// Türkiye: Sağlık Bakanlığı Ulusal Çocukluk Dönemi Aşılama Takvimi (2026, 1 Eylül 2026 güncellemesi;
// kaynaklar/sb-asi-karti-2026.pdf ile satır satır doğrulandı) + aile hekimi bebek izlem protokolü (2018).

export type ScheduleKind = "asi" | "izlem" | "tarama" | "ilac";

export interface ScheduleItem {
  key: string; // kalıcı kimlik (yapıldı işareti buna bağlanır)
  kind: ScheduleKind;
  title: string;
  detail?: string;
  date: Date; // hedef tarih
  windowDays?: number; // ± kaç gün tolerans (izlem protokolündeki aralık)
}

type Def = { key: string; kind: ScheduleKind; title: string; detail?: string; day?: number; month?: number; window?: number };

const DEFS: Def[] = [
  // Doğum
  { key: "hepb1", kind: "asi", title: "Hepatit B (1. doz)", day: 0 },
  { key: "izlem1", kind: "izlem", title: "1. izlem (hastanede)", detail: "Fizik muayene, işitme taraması", day: 0 },
  { key: "izlem2", kind: "izlem", title: "2. izlem (48 saat)", day: 2 },
  { key: "topuk", kind: "tarama", title: "Topuk kanı", detail: "Fenilketonüri, hipotiroidi, biyotinidaz, kistik fibrozis, SMA", day: 4, window: 2 },
  { key: "izlem3", kind: "izlem", title: "3. izlem (15. gün)", detail: "13-17. günler", day: 15, window: 2 },
  { key: "dvit", kind: "ilac", title: "D vitamini başlangıcı", detail: "Günde 400 IU (3 damla) — 1 yaşına kadar", day: 15 },
  { key: "kalca", kind: "tarama", title: "Kalça ultrasonu", detail: "Gelişimsel kalça displazisi taraması, 3-6. hafta", day: 30, window: 10 },
  { key: "izlem4", kind: "izlem", title: "4. izlem (41. gün)", detail: "36-46. günler; gelişim değerlendirmesi", day: 41, window: 5 },
  // 2. ay
  { key: "izlem5", kind: "izlem", title: "5. izlem (2. ay)", detail: "Tartı, boy, baş çevresi", month: 2, window: 5 },
  { key: "bcg", kind: "asi", title: "BCG (verem)", month: 2 },
  { key: "altili1", kind: "asi", title: "Altılı karma (1. doz)", detail: "DaBT-İPA-Hib-HepB", month: 2 },
  { key: "kpa1", kind: "asi", title: "KPA pnömokok (1. doz)", month: 2 },
  // 3. ay
  { key: "izlem6", kind: "izlem", title: "6. izlem (3. ay)", detail: "Anemi testi (hemogram)", month: 3, window: 5 },
  // 4. ay
  { key: "izlem7", kind: "izlem", title: "7. izlem (4. ay)", month: 4, window: 5 },
  { key: "demir", kind: "ilac", title: "Demir damlası başlangıcı", detail: "4. aydan 12. aya kadar", month: 4 },
  { key: "altili2", kind: "asi", title: "Altılı karma (2. doz)", month: 4 },
  { key: "kpa2", kind: "asi", title: "KPA pnömokok (2. doz)", month: 4 },
  // 6. ay
  { key: "izlem8", kind: "izlem", title: "8. izlem (6. ay)", detail: "Ek gıdaya geçiş", month: 6, window: 15 },
  { key: "altili3", kind: "asi", title: "Altılı karma (3. doz)", month: 6 },
  { key: "opa1", kind: "asi", title: "OPA çocuk felci ağızdan (1. doz)", month: 6 },
  // 9. ay
  { key: "izlem9", kind: "izlem", title: "9. izlem (9. ay)", detail: "Anemi testi", month: 9, window: 20 },
  { key: "kkk-ek", kind: "asi", title: "KKK ek doz (9. ay)", detail: "Kızamık için erken koruma; 12. aydaki 1. dozu kaldırmaz", month: 9 },
  // 12. ay
  { key: "izlem12", kind: "izlem", title: "İzlem (12. ay)", month: 12, window: 15 },
  { key: "kkk1", kind: "asi", title: "KKK kızamık-kızamıkçık-kabakulak (1. doz)", month: 12 },
  { key: "sucicegi", kind: "asi", title: "Suçiçeği", month: 12 },
  { key: "kpa3", kind: "asi", title: "KPA pnömokok (pekiştirme)", month: 12 },
  // 18. ay
  { key: "izlem18", kind: "izlem", title: "İzlem (18. ay)", month: 18, window: 15 },
  { key: "altili4", kind: "asi", title: "Altılı karma (pekiştirme)", month: 18 },
  { key: "opa2", kind: "asi", title: "OPA çocuk felci ağızdan (2. doz)", month: 18 },
  { key: "hepa1", kind: "asi", title: "Hepatit A (1. doz)", month: 18 },
  // 24. ay
  { key: "izlem24", kind: "izlem", title: "İzlem (24. ay)", month: 24, window: 15 },
  { key: "hepa2", kind: "asi", title: "Hepatit A (2. doz)", month: 24 },
  // 48. ay
  { key: "kkk2", kind: "asi", title: "KKK (2. doz)", month: 48 },
  { key: "sucicegi2", kind: "asi", title: "Suçiçeği (2. doz)", month: 48 },
  { key: "dabt4", kind: "asi", title: "DaBT-İPA (pekiştirme)", month: 48 },
  // 13 yaş
  { key: "td13", kind: "asi", title: "Td (tetanoz-difteri) pekiştirme", detail: "8. sınıf", month: 156 },
];

/** Doğum tarihinden tüm takvimi üret */
export function buildSchedule(birthDateIso: string): ScheduleItem[] {
  const birth = parseISO(birthDateIso);
  return DEFS.map((d) => ({
    key: d.key,
    kind: d.kind,
    title: d.title,
    detail: d.detail,
    date: d.month != null ? addMonths(birth, d.month) : addDays(birth, d.day ?? 0),
    windowDays: d.window,
  })).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const KIND_LABEL: Record<ScheduleKind, string> = {
  asi: "Aşı",
  izlem: "Aile hekimi izlemi",
  tarama: "Tarama",
  ilac: "İlaç",
};
