import { useState } from "react";
import { BLOCK_LABEL, getLayout, isVisible, resetLayout, ROLE_ONLY, SEGMENT_LABEL, SEGMENT_OF, setLayout, type Block } from "../log/layout";
import { getRole } from "../family/family";

/** Ayarlar → Kayıt ekranı düzeni: blokları gizle / yukarı-aşağı taşı (cihaz ayarı) */
export default function LayoutSettings() {
  const [l, setL] = useState(getLayout);
  const apply = (next: typeof l) => { setLayout(next); setL(getLayout()); };
  const move = (b: Block, dir: -1 | 1) => {
    const i = l.order.indexOf(b), j = i + dir;
    if (j < 0 || j >= l.order.length) return;
    const order = [...l.order]; [order[i], order[j]] = [order[j], order[i]];
    apply({ ...l, order });
  };
  const role = getRole();
  const toggle = (b: Block) => {
    // Role bağlı blok (anne paneli) başka rolde: "show" listesiyle açılır/kapanır
    if (ROLE_ONLY[b] && role !== ROLE_ONLY[b]) {
      const show = l.show ?? [];
      return apply({ ...l, show: show.includes(b) ? show.filter((x) => x !== b) : [...show, b] });
    }
    apply({ ...l, hidden: l.hidden.includes(b) ? l.hidden.filter((x) => x !== b) : [...l.hidden, b] });
  };

  return (
    <section className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Kayıt ekranı düzeni</h2>
        <button className="text-xs muted underline" onClick={() => { resetLayout(); setL(getLayout()); }}>varsayılan</button>
      </div>
      <p className="text-xs muted">Kullanmadığın bloğu gizle (örn. biberon yoksa), sık kullandığını yukarı al. Sadece bu telefon için.</p>
      <ul className="divide-y divide-(--line)">
        {l.order.map((b, i) => {
          const hidden = !isVisible(l, b, role);
          return (
            <li key={b} className="flex items-center gap-2 py-1.5 text-sm">
              <button className={`w-7 h-7 rounded-lg text-base ${hidden ? "muted" : ""}`} style={{ background: "var(--card-2)" }} onClick={() => toggle(b)} aria-label="göster/gizle">
                {hidden ? "◻" : "✓"}
              </button>
              <span className={`flex-1 ${hidden ? "muted line-through" : ""}`}>{BLOCK_LABEL[b]} <span className="text-[10px] muted">· {SEGMENT_LABEL[SEGMENT_OF[b]]}{ROLE_ONLY[b] && role !== ROLE_ONLY[b] ? " · varsayılan gizli (rol: " + (role || "—") + ")" : ""}</span></span>
              <button className="w-8 h-8 rounded-lg muted" style={{ background: "var(--card-2)", opacity: i === 0 ? 0.3 : 1 }} onClick={() => move(b, -1)} aria-label="yukarı">▲</button>
              <button className="w-8 h-8 rounded-lg muted" style={{ background: "var(--card-2)", opacity: i === l.order.length - 1 ? 0.3 : 1 }} onClick={() => move(b, 1)} aria-label="aşağı">▼</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
