import { useState } from "react";
import { Chip, Icon, type IconName } from "../../lib/icons";

/**
 * Bilgi kartları — kaynaklı, kısa, eyleme dönük. İçerik: BILGE/kaynaklar/bilgi-tabani.md
 * (NICE NG194, AAP Safe Sleep 2022, AAP Colic, TND Sarılık rehberi).
 */
interface Card { id: string; icon: IconName; tone: "danger" | "uyku" | "emzirme" | "accent"; title: string; sub: string; src: string; items: string[]; warn?: string }

const CARDS: Card[] = [
  {
    id: "acil", icon: "thermometer", tone: "danger", title: "Ne zaman hemen doktor / acil?",
    sub: "NICE 2021 kırmızı bayrak listesi", src: "NICE NG194 Postnatal care (2021), öneri 1.4.9",
    items: [
      "Ateş 38 °C ve üstü (3 aydan küçükte her zaman) ya da 36 °C altı",
      "Emmeyi reddetme, uyandırılamama, olağan dışı gevşeklik",
      "Soluk, kül rengi, alacalı ya da morarmış cilt/dudak",
      "Zayıf, tiz ya da sürekli ağlama",
      "İnleyerek nefes alma, dakikada 60'tan hızlı solunum, göğsün içeri çekilmesi",
      "Bastırınca solmayan döküntü; bıngıldağın kabarması; ense sertliği",
      "Nöbet (kasılma, boş bakma, dudak morarması)",
      "Sık, fışkırır tarzda kusma ya da yeşil kusma; ishal + susuzluk (az idrar, kuru ağız)",
      "Doğum kilosunun %10'undan fazla kayıp",
    ],
    warn: "Yenidoğanda ciddi enfeksiyonda ateş OLMAYABİLİR: 'bir şey farklı' hissi, emmeme ve tepkisizlik tek başına yeterli nedendir. Acil: 112.",
  },
  {
    id: "uyku", icon: "moon", tone: "uyku", title: "Güvenli uyku (ilk 6 ay)",
    sub: "Ani bebek ölümü riskini düşüren 10 kural", src: "AAP Safe Sleep Policy 2022 — A Parent's Guide to Safe Sleep",
    items: [
      "Her uykuda sırtüstü — gündüz kısa uyku dahil",
      "Sert, düz yüzey; 10°'den fazla eğim yok (ana kucağı/salıncak uyku yeri değil)",
      "İlk 6 ay aynı oda, ayrı yatak; aynı yatakta uyumayın",
      "Yatakta yastık, yorgan, oyuncak, kenar koruyucu, gevşek örtü yok",
      "Emzik verilebilir (emzirme oturduktan sonra)",
      "Aşırı ısıtmayın: içeride şapka yok, sizden bir kat fazla giysi",
      "Sigara, nikotin, elektronik sigara dumanı yok",
      "Kundak, dönme belirtileri başlayınca biter (3-4 ay)",
      "Ağırlıklı battaniye/kundak yok; 'nefes monitörü' koruma sağlamaz",
      "Uyanıkken gözetimli karın üstü oyun: 7. haftada günde 15-30 dk",
    ],
  },
  {
    id: "aglama", icon: "waves", tone: "emzirme", title: "Ağlama & kolik",
    sub: "2-4. haftada başlar, 6. haftada tepe, 3-4. ayda geçer", src: "AAP HealthyChildren — Colic; Period of PURPLE Crying",
    items: [
      "6. haftada günde ~3 saat huzursuzluk normaldir; 3-4. ayda 1-2 saate iner",
      "Yatıştırma: kundak, yan/yüzüstü tutuş (kucakta, uyanık), 'şşş' / beyaz gürültü, hafif sallama, emme",
      "Taşıyıcı ile yürüyüş, dizde yüzüstü sırt ovma, ılık banyo, bebek masajı",
      "Uyku sesi kartı (yağmur/kalp atışı) bunun için var",
      "Kolik DEĞİLDİR: ateş, kusma, kanlı kaka, kilo almama, 4 ayı geçen huzursuzluk → hekim",
    ],
    warn: "Bebek asla sarsılmaz — körlük, beyin hasarı, ölüm. Dayanamıyorsan bebeği sırtüstü güvenli yere bırak, odadan çık, 10 dakika nefes al, birini ara. Bu zayıflık değil, doğru davranıştır.",
  },
];

export default function InfoCards() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="section-title">Bilgi</div>
      {CARDS.map((c) => (
        <div key={c.id} className="flex flex-col gap-1">
          <button className="tile" onClick={() => setOpen(open === c.id ? null : c.id)}>
            <Chip name={c.icon} tone={c.tone} size={40} />
            <span className="flex-1 min-w-0 text-left">
              <span className="block font-semibold leading-tight" style={{ fontSize: 17 }}>{c.title}</span>
              <span className="block text-xs leading-tight mt-0.5" style={{ opacity: 0.75 }}>{c.sub}</span>
            </span>
            <Icon name={open === c.id ? "chevronDown" : "chevronRight"} size={18} />
          </button>
          {open === c.id && (
            <div className="card slide-up flex flex-col gap-2 -mt-1">
              <ul className="text-sm flex flex-col gap-1.5">
                {c.items.map((it, i) => <li key={i} className="flex gap-2"><span className="muted">•</span><span>{it}</span></li>)}
              </ul>
              {c.warn && <p className="text-sm rounded-xl p-3" style={{ background: "color-mix(in srgb, #b3423a 16%, var(--card))" }}>{c.warn}</p>}
              <p className="text-[10px] muted">Kaynak: {c.src}. Genel bilgidir; hekimin sözü esastır.</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
