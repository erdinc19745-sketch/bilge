import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import type { Baby } from "../../db/types";
import Growth from "../growth/Growth";
import Photos, { Img, addPhoto } from "./Photos";
import { MilestonesAll } from "../milestones/MilestoneCard";

/** Bebeğin sayfası: profil fotoğrafı, yaş, aylık albüm, büyüme eğrisi */
export default function Profile({ baby, onClose }: { baby: Baby; onClose: () => void }) {
  const avatar = useLiveQuery(() => db.photos.where("month").equals(-1).first(), []);
  const days = Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86_400_000);

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex items-center gap-4">
        <label className="relative w-24 h-24 rounded-full overflow-hidden shrink-0" style={{ background: "var(--card)" }}>
          {avatar ? <Img blob={avatar.blob} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-3xl">{baby.sex === "kiz" ? "👧" : "👦"}</span>}
          <span className="absolute inset-x-0 bottom-0 text-center text-[10px] py-0.5" style={{ background: "rgba(0,0,0,0.55)" }}>değiştir</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0], -1)} />
        </label>
        <div className="flex-1">
          <div className="text-2xl font-bold">{baby.name}</div>
          <div className="muted text-sm">{days} günlük · {Math.floor(days / 7)} hafta {days % 7} gün</div>
          <div className="muted text-xs">{new Date(baby.birthDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <button className="muted px-2 self-start" onClick={onClose}>✕</button>
      </div>

      <Growth baby={baby} />
      <MilestonesAll baby={baby} />
      <Photos birthDate={baby.birthDate} />
    </div>
  );
}
