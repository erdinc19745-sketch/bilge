import { WHO, type Indicator, type LMS, type Sex } from "./who";

/** Yaşa göre L, M, S — aylar arasında doğrusal ara değer */
function lmsAt(table: LMS[], ageMonths: number): { L: number; M: number; S: number } | null {
  if (ageMonths < 0 || ageMonths > table[table.length - 1][0]) return null;
  let i = 0;
  while (i < table.length - 2 && table[i + 1][0] <= ageMonths) i++;
  const [m0, L0, M0, S0] = table[i], [m1, L1, M1, S1] = table[i + 1];
  const f = m1 === m0 ? 0 : (ageMonths - m0) / (m1 - m0);
  return { L: L0 + (L1 - L0) * f, M: M0 + (M1 - M0) * f, S: S0 + (S1 - S0) * f };
}

/** WHO z-skoru (LMS yöntemi) */
export function zScore(sex: Sex, ind: Indicator, ageMonths: number, value: number): number | null {
  const p = lmsAt(WHO[sex][ind], ageMonths);
  if (!p || value <= 0) return null;
  return p.L === 0 ? Math.log(value / p.M) / p.S : (Math.pow(value / p.M, p.L) - 1) / (p.L * p.S);
}

/** Verilen z için beklenen ölçüm (eğri çizmek için) */
export function valueAtZ(sex: Sex, ind: Indicator, ageMonths: number, z: number): number | null {
  const p = lmsAt(WHO[sex][ind], ageMonths);
  if (!p) return null;
  return p.L === 0 ? p.M * Math.exp(p.S * z) : p.M * Math.pow(1 + p.L * p.S * z, 1 / p.L);
}

/** Standart normal dağılım Φ(z) → 0-100 persentil */
export function percentile(z: number): number {
  // Abramowitz-Stegun 7.1.26 yaklaşımı
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  const p = 0.5 * (1 + (z < 0 ? -y : y));
  return Math.round(p * 100);
}

export const Z_LINES: { z: number; label: string }[] = [
  { z: -1.881, label: "P3" },
  { z: -1.036, label: "P15" },
  { z: 0, label: "P50" },
  { z: 1.036, label: "P85" },
  { z: 1.881, label: "P97" },
];

export const IND_LABEL: Record<Indicator, { title: string; unit: string }> = {
  weight: { title: "Kilo", unit: "kg" },
  length: { title: "Boy", unit: "cm" },
  head: { title: "Baş çevresi", unit: "cm" },
};
