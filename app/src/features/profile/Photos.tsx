import { useEffect, useState } from "react";
import { ask } from "../../lib/confirm";
import { useLiveQuery } from "dexie-react-hooks";
import { db, familyRealmId, uid } from "../../db/db";
import type { Photo } from "../../db/types";

/**
 * Aylık "aynı poz" albümü: 0 (yenidoğan) … 12. ay. Fotoğraf telefonda küçültülür (~900 px, JPEG),
 * böylece aile senkronunun ücretsiz 100 MB'ı yıllarca yeter. -1 = profil fotoğrafı (avatar).
 */
export default function Photos({ birthDate }: { birthDate: string }) {
  const photos = useLiveQuery(() => db.photos.toArray(), []) ?? [];
  const [view, setView] = useState<Photo | null>(null);
  const byMonth = new Map(photos.filter((p) => p.month >= 0).map((p) => [p.month, p]));
  const nowMonth = Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.4375 * 86_400_000));
  const months = Array.from({ length: Math.max(13, nowMonth + 2) }, (_, i) => i);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">Aylık albüm</h2>
      <p className="text-xs muted">Her ay aynı yerde, aynı pozda bir kare. 1 yılın sonunda büyümesini yan yana göreceksin.</p>
      <div className="grid grid-cols-4 gap-2">
        {months.map((m) => {
          const p = byMonth.get(m);
          return (
            <div key={m} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: "var(--card)", opacity: m > nowMonth ? 0.45 : 1 }}>
              {p ? (
                <button className="w-full h-full" onClick={() => setView(p)}>
                  <Img blob={p.blob} className="w-full h-full object-cover" />
                </button>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center text-2xl muted">
                  +
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0], m)} />
                </label>
              )}
              <span className="absolute left-1 bottom-1 text-[10px] px-1.5 rounded-md" style={{ background: "rgba(0,0,0,0.55)" }}>{m === 0 ? "doğum" : `${m}. ay`}</span>
            </div>
          );
        })}
      </div>
      {view && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 p-4" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setView(null)}>
          <Img blob={view.blob} className="max-h-[75vh] max-w-full rounded-2xl" />
          <div className="text-sm">{view.month === 0 ? "Doğum" : `${view.month}. ay`}</div>
          <button className="text-red-300 text-sm" onClick={async (e) => { e.stopPropagation(); if (await ask({ title: "Fotoğraf silinsin mi?", ok: "Sil", danger: true })) { db.photos.delete(view.id); setView(null); } }}>Sil</button>
        </div>
      )}
    </section>
  );
}

/** Blob → <img> (URL'yi oluşturur ve bırakır) */
export function Img({ blob, className }: { blob: Blob; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} className={className} alt="" /> : null;
}

/** Fotoğrafı küçült ve kaydet; aynı ay varsa üstüne yazar */
export async function addPhoto(file: File, month: number) {
  const blob = await resize(file, month === -1 ? 256 : 900);
  const realmId = await familyRealmId();
  const existing = (await db.photos.where("month").equals(month).toArray())[0];
  if (existing) await db.photos.update(existing.id, { blob, at: Date.now() });
  else await db.photos.add({ id: uid(), month, at: Date.now(), blob, realmId });
}

async function resize(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.82));
}
