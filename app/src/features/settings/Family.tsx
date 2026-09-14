import { useState } from "react";
import { useLiveQuery, useObservable } from "dexie-react-hooks";
import { cloudEnabled, db, currentUser$, syncState$ } from "../../db/db";
import { getFamilyCode, getRole, ROLE_LABEL, setRole, type Role } from "../family/family";
import { ask } from "../../lib/confirm";

/**
 * Aile senkronu: aile kodu ile giren her telefon aynı defteri görür.
 * Burada: durum, bu telefonun rolü, kodu gösterme, başka telefon ekleme tarifi, çıkış.
 */
export default function Family() {
  const user = useObservable(currentUser$);
  const sync = useObservable(syncState$);
  const [role, setRoleState] = useState<Role | "">(getRole());
  const [showCode, setShowCode] = useState(false);
  const logins = useLiveQuery(() => db.logins.orderBy("at").reverse().limit(8).toArray(), []) ?? [];
  if (!cloudEnabled) return null;

  /** Önce bekleyen kayıtları gönder, sonra çık; ardından "Ben kimim + kod" ekranı gelir */
  const logout = async () => {
    if (!(await ask({ title: "Çıkış yapılsın mı?", text: "Bu telefondaki kopya silinir; tekrar girince buluttan iner. Başka biri olarak (örn. Anne) girmek için de bu yolu kullan.", ok: "Çıkış yap", danger: true }))) return;
    if (!navigator.onLine) return alert("Çıkış için internet gerekiyor (kayıtlar önce gönderilir).");
    try { await db.cloud.sync({ purpose: "push", wait: true }); } catch { /* sunucu geçici yoksa yine de dene */ }
    await db.cloud.logout({ force: true });
  };

  const phase: Record<string, string> = {
    initial: "başlıyor", "not-in-sync": "bekliyor", pushing: "gönderiyor", pulling: "alıyor", "in-sync": "güncel", error: "hata", offline: "çevrimdışı",
  };

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="font-semibold">Aile senkronu</h2>
      <div className="flex items-center justify-between text-sm">
        <div>
          <div>{user?.isLoggedIn ? "Aile defterine bağlı" : "bağlı değil"}</div>
          <div className="text-xs muted">senkron: {phase[sync?.phase ?? ""] ?? sync?.phase ?? "—"}</div>
        </div>
        {user?.isLoggedIn ? (
          <button className="btn text-sm px-3" style={{ minHeight: 40 }} onClick={logout}>Çıkış yap</button>
        ) : (
          <button className="btn text-sm px-3" style={{ minHeight: 40 }} onClick={() => db.cloud.login()}>Bağlan</button>
        )}
      </div>

      <div className="text-sm">
        <div className="muted text-xs mb-1">Bu telefonda ben:</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <button key={r} className={`btn text-sm ${role === r ? "btn-accent" : ""}`} style={{ minHeight: 40 }} onClick={() => { setRole(r); setRoleState(r); }}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {logins.length > 0 && (
        <div className="text-sm">
          <div className="muted text-xs mb-1">Son girişler (aile koduyla) — tanımadığın bir cihaz görürsen kodu değiştirelim</div>
          <ul className="text-xs divide-y divide-(--line)">
            {logins.map((l) => (
              <li key={l.id} className="py-1 flex justify-between gap-2">
                <span>{new Date(l.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.device}</span>
                <span className="muted">{[l.city, l.country].filter(Boolean).join(", ")}{l.ip ? ` · ${l.ip}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-sm">
        <div className="muted text-xs mb-1">Başka telefon eklemek için</div>
        <ol className="list-decimal pl-4 text-xs muted flex flex-col gap-0.5">
          <li>O telefonda <b style={{ color: "var(--text)" }}>bilge-omega.vercel.app</b> adresini aç, Paylaş → Ana Ekrana Ekle.</li>
          <li>Kim olduğunu seç, aile kodunu gir → aynı defter iner.</li>
        </ol>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="btn text-sm" style={{ minHeight: 44 }} onClick={() => setShowCode((v) => !v)}>
            {showCode ? getFamilyCode() || "(kayıtlı değil)" : "Kodu göster"}
          </button>
          <button
            className="btn btn-accent text-sm"
            style={{ minHeight: 44 }}
            onClick={() => {
              const text = `Bilge – bebek defterimiz 🌙\n${window.location.origin}\nAçınca "Ana Ekrana Ekle" de, kim olduğunu seç, aile kodu: ${getFamilyCode()}`;
              if (navigator.share) navigator.share({ text }).catch(() => undefined);
              else navigator.clipboard?.writeText(text);
            }}
          >
            📨 Davet gönder
          </button>
        </div>
      </div>
    </section>
  );
}
