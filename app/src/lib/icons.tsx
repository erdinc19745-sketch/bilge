import type { CSSProperties } from "react";

/**
 * Tutarlı çizgi ikon seti (24x24, 2px stroke). Emoji yerine; her platformda aynı görünür.
 * Yollar Lucide tarzı, elle sadeleştirilmiş.
 */
const PATHS: Record<string, string> = {
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  droplet: "M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z",
  baby: "M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5S14.6 8 13.5 8c-.8 0-1.5-.4-1.5-1",
  bottle: "M10 2h4M9 5h6M9 5l-1 3v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8l-1-3M8 12h8",
  diaper: "M4 7h16v4a8 8 0 0 1-16 0zM4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 11a3 3 0 0 0 6 0",
  poo: "M12 3c1 2 3 2.5 3 5 2 0 3.5 1.5 3.5 3.5 1.5.5 2.5 2 2.5 3.5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4c0-1.5 1-3 2.5-3.5C5.5 9.5 7 8 9 8c0-2.5 2-3 3-5zM9.5 14h.01M14.5 14h.01M10 17c.6.5 1.3.8 2 .8s1.4-.3 2-.8",
  thermometer: "M14 14.8V3.5a2.5 2.5 0 0 0-5 0v11.3a4.5 4.5 0 1 0 5 0z",
  pill: "M10.5 20.5l-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7zM8.5 8.5l7 7",
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  waves: "M2 12h2M6 8v8M10 4v16M14 8v8M18 12h2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  chart: "M18 20V10M12 20V4M6 20v-6",
  calendar: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  plus: "M12 5v14M5 12h14",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM5 3v4M3 5h4M19 17v4M17 19h4",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  check: "M20 6L9 17l-5-5",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  x: "M18 6L6 18M6 6l12 12",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  stethoscope: "M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4M20 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  ruler: "M21.3 8.7l-6-6a1 1 0 0 0-1.4 0l-11.2 11.2a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11.2-11.2a1 1 0 0 0 0-1.4zM7 12l2 2M10 9l2 2M13 6l2 2",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  play: "M6 4l14 8-14 8z",
  stop: "M6 6h12v12H6z",
  undo: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13",
  syringe: "M9.5 6.5l8 8-4.5 4.5-8-8zM6 15l-3 3M17.5 6.5l3-3M15 4l5 5M11 10l3 3",
  microscope: "M6 18h8M3 22h18M14 22a7 7 0 1 0 0-14h-1M9 14h2M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2zM12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, stroke = 2, className, style }: { name: IconName; size?: number; stroke?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Renkli ikon çipi: kategoriye göre tonlu zemin */
export function Chip({ name, tone, size = 40 }: { name: IconName; tone: "uyku" | "emzirme" | "bez" | "biberon" | "accent" | "muted" | "danger"; size?: number }) {
  const color = tone === "accent" ? "var(--accent)" : tone === "muted" ? "var(--muted)" : tone === "danger" ? "#e8703f" : `var(--c-${tone})`;
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl shrink-0"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      <Icon name={name} size={Math.round(size * 0.55)} />
    </span>
  );
}
