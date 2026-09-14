/** Kayıt ekranı düzeni: hangi bloklar görünsün, hangi sırada. Cihaz ayarı (localStorage). */
export type Block = "gelisim" | "emzirme" | "biberon" | "sagma" | "bez" | "uyku" | "ates-dvit" | "ilaclar" | "olcum" | "sarilik" | "ekgida" | "bilgi" | "ses" | "uykusesi" | "anne" | "baba";
export const BLOCK_LABEL: Record<Block, string> = {
  gelisim: "Gelişim kartı",
  emzirme: "Emzirme",
  biberon: "Biberon",
  sagma: "Süt sağma + stok",
  bez: "Bez",
  uyku: "Uyku",
  "ates-dvit": "Ateş · D vitamini",
  ilaclar: "İlaç kürleri",
  olcum: "Ölçüm (kilo, boy, baş)",
  sarilik: "Sarılık takibi (ilk 4 hafta)",
  ekgida: "Ek gıda (6. ay)",
  bilgi: "Bilgi kartları (acil, güvenli uyku, ağlama)",
  ses: "Sesle / yazarak kayıt",
  uykusesi: "Uyku sesi",
  anne: "Anne paneli",
  baba: "Gece nöbeti & giderler",
};
const DEFAULT_ORDER: Block[] = ["gelisim", "emzirme", "biberon", "sagma", "bez", "uyku", "ates-dvit", "sarilik", "ilaclar", "olcum", "ekgida", "bilgi", "ses", "uykusesi", "anne", "baba"];
const KEY = "bilge.layout";

/** Kayıt ekranı bölmeleri: gece 3'te sadece "Hızlı" görünür; diğerleri bir dokunuş uzakta */
export type Segment = "hizli" | "bakim" | "aile";
export const SEGMENT_LABEL: Record<Segment, string> = { hizli: "Hızlı", bakim: "Bakım", aile: "Aile" };
export const SEGMENT_OF: Record<Block, Segment> = {
  emzirme: "hizli", biberon: "hizli", bez: "hizli", uyku: "hizli", "ates-dvit": "hizli", ses: "hizli",
  sarilik: "bakim", ilaclar: "bakim", olcum: "bakim", sagma: "bakim", ekgida: "bakim", gelisim: "bakim", uykusesi: "bakim", bilgi: "bakim",
  anne: "aile", baba: "aile",
};
const SEG_KEY = "bilge.segment";
export const getSegment = (): Segment => { try { return (localStorage.getItem(SEG_KEY) as Segment) || "hizli"; } catch { return "hizli"; } };
export const setSegment = (s: Segment) => { try { localStorage.setItem(SEG_KEY, s); } catch { /* */ } };

export interface Layout { order: Block[]; hidden: Block[]; show?: Block[] }

/** Role bağlı varsayılanlar: anne paneli yalnız "anne" rolünde görünür (Ayarlar'dan açılabilir) */
export const ROLE_ONLY: Partial<Record<Block, string>> = { anne: "anne" };
export function isVisible(l: Layout, b: Block, role: string): boolean {
  if (l.hidden.includes(b)) return false;
  const onlyFor = ROLE_ONLY[b];
  if (onlyFor && role !== onlyFor && !(l.show ?? []).includes(b)) return false;
  return true;
}

export function getLayout(): Layout {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || "null") as Layout | null;
    if (!l) return { order: [...DEFAULT_ORDER], hidden: [] };
    // Yeni bloklar eklendiyse sona ekle
    const order = [...l.order.filter((b) => DEFAULT_ORDER.includes(b)), ...DEFAULT_ORDER.filter((b) => !l.order.includes(b))];
    return { order, hidden: l.hidden.filter((b) => DEFAULT_ORDER.includes(b)), show: (l.show ?? []).filter((b) => DEFAULT_ORDER.includes(b)) };
  } catch { return { order: [...DEFAULT_ORDER], hidden: [] }; }
}
export function setLayout(l: Layout) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* */ }
  window.dispatchEvent(new Event("bilge-layout"));
}
export const resetLayout = () => setLayout({ order: [...DEFAULT_ORDER], hidden: [] });
