/**
 * Bebek kaka rengi kartı (biliyer atrezi taraması).
 * Tayvan/Japonya'da her yenidoğana verilen 7 renkli kartın yaklaşık karşılığı:
 * 1-3 soluk (kil/beyaz/gri) = anormal → aynı gün hekim; 4-7 sarı-yeşil-kahve = normal.
 * Kaynak: Taiwan Infant Stool Color Card; PoopMD (Johns Hopkins). Teşhis aracı değildir.
 */
export interface Swatch { n: number; hex: string; label: string; abnormal: boolean }

export const SWATCHES: Swatch[] = [
  { n: 1, hex: "#EAE6DA", label: "kil / beyaz", abnormal: true },
  { n: 2, hex: "#E6DDB0", label: "açık sarımsı beyaz", abnormal: true },
  { n: 3, hex: "#D6D0BE", label: "grimsi", abnormal: true },
  { n: 4, hex: "#E4B537", label: "sarı", abnormal: false },
  { n: 5, hex: "#A7A02A", label: "sarı-yeşil", abnormal: false },
  { n: 6, hex: "#8A5A26", label: "kahverengi", abnormal: false },
  { n: 7, hex: "#4F5B2E", label: "koyu yeşil", abnormal: false },
];

export const swatch = (n?: number) => SWATCHES.find((s) => s.n === n);

/* --- Renk uzaklığı (CIE Lab) — fotoğraftan öneri için --- */
function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const f = (c: number) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g2 = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * g2(y) - 16, 500 * (g2(x) - g2(y)), 200 * (g2(y) - g2(z))];
}
export function nearestSwatch(rgb: [number, number, number]): { swatch: Swatch; distance: number } {
  const lab = rgbToLab(rgb);
  let best = SWATCHES[0], bd = Infinity;
  for (const s of SWATCHES) {
    const l2 = rgbToLab(hexToRgb(s.hex));
    const d = Math.hypot(lab[0] - l2[0], lab[1] - l2[1], lab[2] - l2[2]);
    if (d < bd) { bd = d; best = s; }
  }
  return { swatch: best, distance: bd };
}

/** Fotoğrafın orta bölgesinin (%40) ortalama rengi */
export async function averageCenterColor(file: File): Promise<[number, number, number]> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const s = Math.min(1, 300 / Math.max(bmp.width, bmp.height));
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const x0 = Math.round(c.width * 0.3), y0 = Math.round(c.height * 0.3), w = Math.round(c.width * 0.4), h = Math.round(c.height * 0.4);
  const d = ctx.getImageData(x0, y0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}
