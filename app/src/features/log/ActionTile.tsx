import type { ReactNode } from "react";
import { Chip, Icon, type IconName } from "../../lib/icons";

type Tone = "uyku" | "emzirme" | "bez" | "biberon" | "accent" | "muted" | "danger";

/**
 * Eylem kartı: renkli ikon çipi + başlık + alt yazı. Basınca yanar (lit), vurgulu hali accent zemin.
 * Tüm hızlı kayıt butonları bu bileşenden — ekran boyunca tek dil.
 */
export default function ActionTile({
  icon, tone, title, sub, onTap, k, lit, accent, hint, right, className = "", compact,
}: {
  icon: IconName; tone: Tone; title: ReactNode; sub?: ReactNode; onTap: () => void; k: string; lit: string | null;
  accent?: boolean; hint?: boolean; right?: ReactNode; className?: string; compact?: boolean;
}) {
  return (
    <button
      className={`tile ${accent ? "tile-accent" : ""} ${lit === k ? "lit" : ""} ${hint ? "hint" : ""} ${className}`}
      style={compact ? { minHeight: 56, padding: "8px 12px" } : undefined}
      onClick={onTap}
    >
      {accent ? (
        <span className="inline-flex items-center justify-center rounded-xl shrink-0" style={{ width: compact ? 32 : 40, height: compact ? 32 : 40, background: "rgba(0,0,0,0.15)" }}>
          <Icon name={icon} size={compact ? 18 : 22} />
        </span>
      ) : (
        <Chip name={icon} tone={tone} size={compact ? 32 : 40} />
      )}
      <span className="flex-1 min-w-0 text-left">
        <span className="block font-semibold leading-tight truncate" style={{ fontSize: compact ? 15 : 17 }}>{title}</span>
        {sub && <span className="block text-xs leading-tight mt-0.5 truncate" style={{ opacity: 0.75 }}>{sub}</span>}
      </span>
      {right && <span className="shrink-0 tabular-nums text-sm font-semibold">{right}</span>}
    </button>
  );
}
