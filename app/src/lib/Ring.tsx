/** Günlük hedef halkası: değer/hedef, dolunca tam daire. Renk seriye göre. */
export default function Ring({ value, target, color, size = 44, label, text }: { value: number; target: number; color: string; size?: number; label: string; text?: string }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, target ? value / target : 0));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${label}: ${text ?? value} / hedef ${target}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize={size * 0.3} fontWeight={700} fill="var(--text)" className="tabular-nums">{text ?? value}</text>
      </svg>
      <div className="min-w-0">
        <div className="text-[11px] muted leading-tight truncate">{label}</div>
        <div className="text-[11px] muted leading-tight tabular-nums">hedef {target}</div>
      </div>
    </div>
  );
}
