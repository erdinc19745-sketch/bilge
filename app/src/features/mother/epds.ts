/**
 * Edinburgh Doğum Sonrası Depresyon Ölçeği (EPDS) — Cox, Holden & Sagovsky, 1987.
 * Türkçe geçerlik-güvenirlik: Engindeniz, Küey, Kültür (1996); kesme puanı 12/13.
 * 10 madde, her biri 0-3; toplam 0-30. Tarama aracıdır, tanı koymaz.
 * Kullanım koşulu: ölçek maddeleri değiştirilmeden, kaynak belirtilerek çoğaltılabilir.
 */
export interface EpdsItem { q: string; options: [string, string, string, string]; reverse: boolean }

// options: puan sırası 0,1,2,3 (reverse=true olanlarda ekranda 3,2,1,0 sırasıyla gösterilir, ölçeğin aslına uygun)
export const EPDS: EpdsItem[] = [
  { q: "Gülebiliyor ve olayların komik tarafını görebiliyorum.", options: ["Her zaman olduğu kadar", "Şimdi pek o kadar değil", "Şimdi kesinlikle o kadar değil", "Artık hiç değil"], reverse: false },
  { q: "Geleceğe hevesle bakıyorum.", options: ["Her zaman olduğu kadar", "Her zamankinden biraz daha az", "Her zamankinden kesinlikle daha az", "Hemen hemen hiç"], reverse: false },
  { q: "Bir şeyler kötü gittiğinde gereksiz yere kendimi suçluyorum.", options: ["Hayır, hiçbir zaman", "Çok sık değil", "Evet, bazen", "Evet, çoğu zaman"], reverse: true },
  { q: "Nedensiz yere kendimi sıkıntılı ya da endişeli hissediyorum.", options: ["Hayır, hiçbir zaman", "Çok seyrek", "Evet, bazen", "Evet, çoğu zaman"], reverse: false },
  { q: "İyi bir neden olmadığı halde korkuyor ya da panikliyorum.", options: ["Hayır, hiçbir zaman", "Hayır, çok sık değil", "Evet, bazen", "Evet, çoğu zaman"], reverse: true },
  { q: "Her şey giderek sırtıma yükleniyor.", options: ["Hayır, her zamanki gibi başa çıkabiliyorum", "Hayır, çoğu zaman oldukça iyi başa çıkabiliyorum", "Evet, bazen eskisi gibi başa çıkamıyorum", "Evet, çoğu zaman hiç başa çıkamıyorum"], reverse: true },
  { q: "Öylesine mutsuzum ki uyumakta güçlük çekiyorum.", options: ["Hayır, hiçbir zaman", "Çok sık değil", "Evet, bazen", "Evet, çoğu zaman"], reverse: true },
  { q: "Kendimi üzüntülü ya da çökkün hissediyorum.", options: ["Hayır, hiçbir zaman", "Çok sık değil", "Evet, oldukça sık", "Evet, çoğu zaman"], reverse: true },
  { q: "Öylesine mutsuzum ki ağlıyorum.", options: ["Hayır, asla", "Çok seyrek", "Evet, oldukça sık", "Evet, çoğu zaman"], reverse: true },
  { q: "Kendime zarar verme düşüncesi aklıma geliyor.", options: ["Asla", "Hemen hemen hiç", "Bazen", "Evet, oldukça sık"], reverse: true },
];

export const EPDS_INTRO = "Yeni bir bebeğiniz olduğu için nasıl hissettiğinizi öğrenmek istiyoruz. Lütfen son 7 gün içinde (sadece bugün değil) kendinizi nasıl hissettiğinize en yakın cevabı işaretleyin.";

export function scoreEpds(answers: number[]) {
  const total = answers.reduce((s, a) => s + a, 0);
  const selfHarm = (answers[9] ?? 0) > 0;
  let level: "dusuk" | "sinir" | "yuksek" = total >= 13 ? "yuksek" : total >= 10 ? "sinir" : "dusuk";
  if (selfHarm) level = "yuksek";
  return { total, selfHarm, level };
}

export const EPDS_TEXT: Record<"dusuk" | "sinir" | "yuksek", { title: string; text: string }> = {
  dusuk: { title: "Düşük olasılık", text: "Puan 0-9. Şu an için depresyon belirtisi düşük görünüyor. 2 hafta sonra tekrar; ne hissettiğinizi eşinizle paylaşmaya devam edin." },
  sinir: { title: "Sınırda", text: "Puan 10-12. Bazı belirtiler var. 1-2 hafta içinde tekrar edin; sürüyorsa aile hekiminize söyleyin. Uyku, destek ve yalnız kalmamak fark yaratır." },
  yuksek: { title: "Yüksek olasılık — destek alın", text: "Puan 13 ve üstü (Türkçe kesme puanı). Bu bir tanı değil ama doğum sonrası depresyon olasılığı yüksek. Lütfen bu hafta aile hekiminize ya da kadın doğum uzmanınıza bu sonucu gösterin; tedavisi vardır ve iyi yanıt verir. Yalnız değilsiniz: her 7-8 anneden biri bunu yaşıyor." },
};
export const EPDS_SELF_HARM = "10. maddeye 'asla' dışında bir cevap verdiniz. Kendinize zarar verme düşüncesi, ne kadar seyrek olursa olsun, bugün birine söylenmeli: eşinize, bir yakınınıza, aile hekiminize. Acil durumda 112. Bu düşünceler hastalığın belirtisidir, sizin suçunuz değil ve geçer.";
