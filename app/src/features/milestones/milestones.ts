/**
 * Gelişim basamakları.
 * Liste: CDC "Learn the Signs. Act Early." 2022 (kamu malı; "çocukların %75'i bu aya kadar yapar").
 * Dönem notları: Sağlık Bakanlığı Bebek-Çocuk İzlem Protokolü, GİDR (BILGE/kaynaklar/…2018.txt s.40-41).
 * Teşhis aracı değil: aile hekimi 2. aydan itibaren GİDR ile değerlendirir; eksik basamakları ona söyleyin.
 */
export type Cat = "sosyal" | "dil" | "bilis" | "hareket";
export const CAT_LABEL: Record<Cat, string> = { sosyal: "Sosyal / duygusal", dil: "Dil / iletişim", bilis: "Bilişsel", hareket: "Hareket" };
export const CAT_ICON: Record<Cat, string> = { sosyal: "🙂", dil: "🗣", bilis: "🧠", hareket: "🤸" };

export interface Milestone { key: string; month: number; cat: Cat; text: string }

const m = (month: number, cat: Cat, i: number, text: string): Milestone => ({ key: `${month}-${cat}-${i}`, month, cat, text });

export const MILESTONES: Milestone[] = [
  // 2. ay
  m(2, "sosyal", 1, "Konuşunca ya da kucağa alınca sakinleşir"),
  m(2, "sosyal", 2, "Yüzüne bakar"),
  m(2, "sosyal", 3, "Yanına gidince sevindiğini belli eder"),
  m(2, "sosyal", 4, "Konuşunca ya da gülümseyince gülümser"),
  m(2, "dil", 1, "Ağlama dışında sesler çıkarır"),
  m(2, "dil", 2, "Yüksek sese tepki verir"),
  m(2, "bilis", 1, "Sen hareket edince gözüyle izler"),
  m(2, "bilis", 2, "Bir oyuncağa birkaç saniye bakar"),
  m(2, "hareket", 1, "Yüzüstüyken başını kaldırır"),
  m(2, "hareket", 2, "İki kolunu ve iki bacağını oynatır"),
  m(2, "hareket", 3, "Ellerini kısa süre açar"),
  // 4. ay
  m(4, "sosyal", 1, "Dikkatini çekmek için kendiliğinden gülümser"),
  m(4, "sosyal", 2, "Güldürmeye çalışınca kıkırdar"),
  m(4, "sosyal", 3, "Dikkatini çekmek için bakar, kıpırdanır, ses çıkarır"),
  m(4, "dil", 1, "“ooo”, “aaa” gibi sesler çıkarır (agulama)"),
  m(4, "dil", 2, "Konuşunca ses çıkararak karşılık verir"),
  m(4, "dil", 3, "Başını sesine doğru çevirir"),
  m(4, "bilis", 1, "Açken meme/biberonu görünce ağzını açar"),
  m(4, "bilis", 2, "Ellerine ilgiyle bakar"),
  m(4, "hareket", 1, "Kucakta başını desteksiz dik tutar"),
  m(4, "hareket", 2, "Eline verilen oyuncağı tutar"),
  m(4, "hareket", 3, "Oyuncağa doğru kolunu sallar"),
  m(4, "hareket", 4, "Ellerini ağzına götürür"),
  m(4, "hareket", 5, "Yüzüstüyken dirseklerine dayanıp yükselir"),
  // 6. ay
  m(6, "sosyal", 1, "Tanıdık kişileri bilir"),
  m(6, "sosyal", 2, "Aynada kendine bakmayı sever"),
  m(6, "sosyal", 3, "Kahkaha atar"),
  m(6, "dil", 1, "Seninle sırayla ses çıkarır"),
  m(6, "dil", 2, "Dilini çıkarıp “pırrr” yapar"),
  m(6, "dil", 3, "Ciyaklar, çığlık atar"),
  m(6, "bilis", 1, "Keşfetmek için nesneleri ağzına götürür"),
  m(6, "bilis", 2, "İstediği oyuncağa uzanıp alır"),
  m(6, "bilis", 3, "Doyunca dudaklarını kapatır"),
  m(6, "hareket", 1, "Yüzüstünden sırtüstüne döner"),
  m(6, "hareket", 2, "Yüzüstüyken kollarını düz tutup yükselir"),
  m(6, "hareket", 3, "Otururken ellerine dayanır"),
  // 9. ay
  m(9, "sosyal", 1, "Yabancılardan çekinir, sokulgan ya da ürkek olur"),
  m(9, "sosyal", 2, "Mutlu, üzgün, kızgın, şaşkın gibi yüz ifadeleri gösterir"),
  m(9, "sosyal", 3, "Adı söylenince bakar"),
  m(9, "sosyal", 4, "Sen gidince tepki verir (bakar, uzanır, ağlar)"),
  m(9, "sosyal", 5, "“Ce-e” oynayınca güler"),
  m(9, "dil", 1, "“mamama”, “bababa” gibi çok farklı sesler çıkarır"),
  m(9, "dil", 2, "Kucağa alınmak için kollarını kaldırır"),
  m(9, "bilis", 1, "Düşen ya da kaybolan nesneyi arar"),
  m(9, "bilis", 2, "İki şeyi birbirine vurur"),
  m(9, "hareket", 1, "Kendi kendine oturma pozisyonuna geçer"),
  m(9, "hareket", 2, "Nesneyi bir elinden diğerine geçirir"),
  m(9, "hareket", 3, "Yiyeceği parmaklarıyla kendine çeker"),
  m(9, "hareket", 4, "Desteksiz oturur"),
  // 12. ay
  m(12, "sosyal", 1, "Seninle oyun oynar (el çırpma gibi)"),
  m(12, "dil", 1, "El sallar (“bay bay”)"),
  m(12, "dil", 2, "Anne/baba ya da özel bir ad söyler"),
  m(12, "dil", 3, "“Hayır”ı anlar (durur ya da duraklar)"),
  m(12, "bilis", 1, "Bir şeyi kabın içine koyar (küp → bardak)"),
  m(12, "bilis", 2, "Sakladığın şeyi arar (battaniye altındaki oyuncak)"),
  m(12, "hareket", 1, "Tutunup ayağa kalkar"),
  m(12, "hareket", 2, "Mobilyaya tutunarak yürür"),
  m(12, "hareket", 3, "Sen tutarken kapaksız bardaktan içer"),
  m(12, "hareket", 4, "Küçük şeyleri baş ve işaret parmağıyla tutar"),
];

export const WINDOWS = [2, 4, 6, 9, 12] as const;

/** Bebeğin yaşına göre "hedef ay": ilk gelecek pencere (1 aylık → 2. ay listesi) */
export function targetMonth(ageMonths: number): number {
  return WINDOWS.find((w) => ageMonths < w + 0.5) ?? 12;
}

/** Bakanlık GİDR dönem notları (kısaltılmış alıntı) */
export const PERIOD_NOTES: { from: number; to: number; title: string; text: string; tips: string[] }[] = [
  {
    from: 0, to: 4, title: "0–4 ay: Dünyayı sizinle keşfedecek",
    text: "Kokunuz, sesiniz, yüzünüzden sizi tanıyor. Ağlayınca yanıtlamanız, sıkıntısını giderip kucaklamanız; onu yatıştıracağınıza güvenmesiyle istediğinde sizinle ilişkiye geçebileceğini öğrenecek. Doğumdan itibaren sizi görmekte, işitmekte, size doğru dönebilmekte, ağlayarak kendini anlatabilmekte.",
    tips: [
      "Yüz yüze konuşun, çıkardığı sesleri tekrarlayın, ninni söyleyin — konuşmasını başlatır.",
      "Ellerini serbest bırakın; güvenli nesneleri ağzına götürmesini engellemeyin (en duyarlı tanıma organı ağzı).",
      "Uyumadığında yüzükoyun oynamasına fırsat verin — sırtı güçlenir, başını kaldırmayı öğrenir.",
      "Bakıcı değişecekse en az on gün birlikte bakın, sık bakıcı değiştirmeyin.",
    ],
  },
  {
    from: 4, to: 8, title: "4–8 ay: Anlamaya ve anlatmaya çalışıyor",
    text: "Size bağlandığından yabancıları yadırgayabilir. Pek çok şeyi anlamaya ve size anlatmaya çalışıyor; sizi dinleyecektir. Oturarak tüm dünyayı görebilmeli, dokunarak keşfedebilmeli.",
    tips: [
      "Çıkardığı sesleri tekrar edin; yaptıklarını, hissettiklerini ona anlatın; herkesi, her şeyi tanıtın.",
      "Evdeki temiz, ses çıkaran nesneleri ağzına götürmesine, elden ele geçirmesine, vurmasına izin verin.",
      "“Ce-ee”, saklanan nesneyi bulma, attığını geri verme — sizi görmediğinde yok olmadığınızı öğretir.",
      "Huyunu, mizacını tanıyıp ona göre davranmak uyumunu ve öğrenmesini destekler.",
    ],
  },
  {
    from: 8, to: 13, title: "8–12 ay: Hareketlendikçe uzaklaşabileceğini fark ediyor",
    text: "Sizden ayrılmasının zor olması çok doğal. Yavaş alışan bebekleri zorlamayın; yabancı yer ve insanları yadırgamasını saygıyla karşılayın. Sınır ve kurallarla karşılaştığında bocalayabilir; az sayıda, tutarlı kural daha kolay anlaşılır.",
    tips: [
      "Saklambaç, el sallama, “ce-e” — ayrılıkla baş etmeyi öğreten oyunlar.",
      "Babıldamalarına anlam katın; kitap resimleri, öyküler, parmakla işaret ederek tanıtma.",
      "Plastik şişe, bardak, tahta kaşık, kap kacakla oynasın; içine atsın, boşaltsın, üst üste koysun.",
      "Yiyecekleri (ekmek, pilav, makarna, peynir) parmak uçlarıyla tutup kendini beslemesi parmaklarını geliştirir.",
      "Rahatça dolaşmasına izin verin: sürünme, emekleme, yürüme böyle gelişir.",
    ],
  },
];
