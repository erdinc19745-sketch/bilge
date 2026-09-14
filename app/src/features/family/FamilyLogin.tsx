import { useState } from "react";
import { db } from "../../db/db";
import { getFamilyCode, getRole, ROLE_LABEL, setFamilyCode, setRole, type Role } from "./family";
import { Chip } from "../../lib/icons";
import { isStandalone } from "../notify/push";

const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

/** İlk açılış: "ben kimim" + aile kodu. Ne e-posta ne şifre. */
export default function FamilyLogin() {
  const [role, setRoleState] = useState<Role | "">(getRole());
  const [code, setCode] = useState(getFamilyCode());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!role) return setErr("Önce kim olduğunu seç.");
    if (code.replace(/\s+/g, "").length < 4) return setErr("Aile kodunu gir.");
    setBusy(true);
    setErr("");
    try {
      setRole(role);
      setFamilyCode(code);
      await db.cloud.login();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Giriş başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-6 fade-in">
      <div className="text-center flex flex-col items-center gap-2">
        <Chip name="moon" tone="accent" size={64} />
        <h1 className="text-2xl font-bold">Bilge</h1>
        <p className="muted text-sm">Aile defteri — herkes aynı sayfada</p>
      </div>
      {IOS && !isStandalone() && (
        <div className="card text-sm" style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--card))" }}>
          <b>Önce ana ekrana ekle:</b> Safari'de alttaki Paylaş <span aria-hidden>⎙</span> → <b>Ana Ekrana Ekle</b> → oradan aç. Bildirim ve gece alarmı ancak öyle çalışır; kodu orada gir.
        </div>
      )}

      <section className="card flex flex-col gap-3">
        <div className="text-sm muted">Ben kimim?</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <button key={r} className={`btn text-base ${role === r ? "btn-accent" : ""}`} style={{ minHeight: 48 }} onClick={() => setRoleState(r)}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        <label className="text-sm muted">
          Aile kodu
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="ör. 1234-5678"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full mt-1 input py-3 text-xl tracking-widest text-center font-mono"
          />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button className="btn btn-accent" style={{ minHeight: 56 }} disabled={busy} onClick={go}>
          {busy ? "Bağlanıyor…" : "Gir"}
        </button>
        <p className="text-xs muted">Kod, aileyi kuran kişide. Bu telefonda bir kez girilir; sonra hep açık kalır.</p>
      </section>
    </div>
  );
}
