# BİLGE — Araştırma notu ve ürün fikirleri (2026-09-13)

Amaç: Yenidoğan kızımızla ilgili hayat değişikliği + takip için ne geliştirebiliriz?
Bu dosya ilk araştırmanın özeti; karar verildikçe güncellenecek.

---

## 1. Piyasa: mevcut uygulamalar ne yapıyor, nerede zayıf?

| Uygulama | Güçlü yanı | Zayıf yanı |
|---|---|---|
| Huckleberry | Uyku tahmini (SweetSpot) | İnternetsiz çalışmaz, iyi özellikler ücretli (~60 $/yıl) |
| Baby Connect | Çok detaylı kayıt, çoklu bakıcı | Arayüz eski ve yoğun; veriyi kimliğe bağlı topluyor |
| Glow Baby | Gelişim + AI içgörü | Gizlilik endişesi, çevrimdışı yok, karşılaştırma kaygısı |
| Baby Tracker | Basit | Aile senkronu ve çevrimdışı mod Premium |
| Nara Baby | Ücretsiz, reklamsız | Özellik az |
| Ebeveyn (TR) | Aşı, atak haftası, ek gıda hepsi bir arada (Türkçe) | Genel amaçlı, kalabalık |
| Emzirme & Bebek Takibi (TR) | Emzirme odaklı | Sağlık takvimi zayıf |

**Ebeveynlerin isteyip bulamadığı 6 şey** (Pebbi 2026 karşılaştırmasından):
1. Ücretsiz, sınırsız aile senkronu (anne + baba + anneanne/babaanne)
2. Hesap açmadan paylaşım
3. Gerçek çevrimdışı çalışma
4. Uyku + beslenme + sağlık takviminin tek yerde olması
5. Minimal arayüz ama kapsamlı özellik
6. Veri bende kalsın — reklam yok, izleme yok, dışa aktarma var

Hiçbir global uygulama Türkiye sağlık sistemini (aile hekimi izlem takvimi,
Bakanlık aşı takvimi) bilmiyor. TR uygulamalar aşıyı biliyor ama izlem
protokolünü (15. gün, 41. gün, D vitamini/demir başlangıcı) bilmiyor.

---

## 2. Açık veri kaynakları (uygulamaya gömülecek)

### 2a. Sağlık Bakanlığı 2026 aşı takvimi (kaynak: drserpilcan.com — resmi PDF ile doğrulanacak)
| Zaman | Aşılar |
|---|---|
| Doğumda | Hepatit B (1) |
| 2. ay | Altılı karma DaBT-İPA-Hib-HepB (1), KPA (1), BCG |
| 4. ay | Altılı karma (2), KPA (2) |
| 6. ay | Altılı karma (3), OPA (1) |
| 12. ay | KKK (1), Suçiçeği, KPA pekiştirme |
| 18. ay | Altılı karma pekiştirme, OPA (2), Hepatit A (1) |
| 24. ay | Hepatit A (2) |
| 48. ay | KKK (2), DaBT-İPA pekiştirme |
| 13 yaş | Td |

Ücretli/isteğe bağlı: Rotavirüs (ilk doz en geç 12. hafta!), Meningokok (2. aydan), HPV (12 yaş).

### 2b. Aile hekimi bebek izlem takvimi (ilk yıl 9 izlem)
| İzlem | Zaman | Ne yapılıyor |
|---|---|---|
| 1 | Doğumda | Muayene, işitme taraması |
| 2 | İlk 48 saat | Muayene, topuk kanı (ilk hafta) |
| 3 | 15. gün (13-17) | **D vitamini başlar** |
| 4 | 41. gün (36-46) | Gelişim değerlendirmesi; kalça USG (ilk ay) |
| 5 | 2. ay (55-65) | Aşı, tartı/boy/baş çevresi |
| 6 | 3. ay (85-95) | **Anemi testi** |
| 7 | 4. ay (115-125) | **Demir başlar** |
| 8 | 6. ay (165-195) | Aşı, ölçüm |
| 9 | 9. ay (250-290) | **Anemi testi** |
| — | 12, 18, 24. ay, sonra 6 ayda bir | |

### 2c. Büyüme eğrileri
- WHO Child Growth Standards — LMS tabloları (kilo/boy/baş çevresi, kız-erkek, gün bazında) ücretsiz .xlsx.
  Z-skoru formülü: z = ((ölçüm/M)^L − 1) / (L·S). Persentil = Φ(z).
- Aile hekiminin kullandığı eğri de WHO; yani aynı sayıyı göstereceğiz.

### 2d. Gelişim basamakları
- CDC "Learn the Signs. Act Early." 2022 listeleri kamu malı, Türkçeye çevrilebilir.
- Wonder Weeks "atak haftaları": TR'de çok popüler ama bilimsel olarak tartışmalı → isteğe bağlı bilgi kartı olarak koyulur, uyarı üretmez.

---

## 3. Ne geliştirebiliriz — 4 katman

### Katman A — Bilge Defteri (çekirdek takip, telefonda PWA)
- Tek dokunuşla kayıt: emzirme (sol/sağ, süre), biberon (ml), bez (ıslak/kaka),
  uyku (başla/bitir), ateş, ilaç (D vit, demir), tartı/boy/baş çevresi.
- **Gece modu**: koyu, kocaman butonlar, "son işlemi tekrarla", tek el.
- Zaman çizelgesi (günlük şerit), "son emzirmeden bu yana 2 s 40 dk" sayacı.
- **Aile senkronu**: QR ile eşleştirme, hesap yok. Anne kaydeder, baba anında görür.
- **Çevrimdışı**: kayıt telefonda (IndexedDB), internet gelince eşler.
- Dışa aktarma: CSV/PDF (doktora götürmek için haftalık özet).

### Katman B — Türkiye sağlık takvimi motoru
- Doğum tarihi girilir → aşı + izlem + D vit/demir + topuk kanı + kalça USG + anemi testi
  otomatik takvime düşer, hatırlatma gelir. "41. gün izlemine 3 gün kaldı."
- WHO persentil grafiği (kız). Ölçüm girince eğri üstünde nokta.
- Yapılan aşıyı işaretle; e-Nabız'la elle karşılaştırma için PDF.

### Katman C — Bilge Monitör (görüntü işleme — bizim alan)
- Eski telefon / Raspberry Pi + kamera, tamamen yerel ağ, buluta hiçbir şey gitmez.
- OpenCV: yatış pozisyonu (sırt / yan / yüzüstü) → yüzüstü uyarısı.
- Solunum hareketi (göğüs bölgesi hareket genliği) → hareket yoksa uyarı.
- Ağlama sınıflandırma (YAMNet gibi hazır ses modeli).
- Uyku başlangıç/bitişini kameradan otomatik yazar → Katman A'ya "uyudu/uyandı" düşer.
- ⚠ Tıbbi cihaz değil; SIDS önleme iddiası yok, "yardımcı gözlem".

### Katman D — Baba paneli / hayat değişikliği
- Gece nöbet çizelgesi: kim kalkıyor, annenin toplam uykusu (annenin dinlenmesi = herkesin sağlığı).
- Gider defteri: bez, mama, ilaç, doktor — aylık toplam.
- Hatıra defteri: aylık aynı poz fotoğraf → 1 yılda timelapse; "kızıma mektup" (18 yaşında açılacak).
- Örüntüler: "uyku pencereleri" tahmini (kendi verimizden, SweetSpot'un yerlisi).

---

## 4. Önerilen sıra (MVP)
1. **Faz 1** — A (gece modu + timeline) + B (takvim + hatırlatma). Bugün lazım olan bu.
2. **Faz 2** — Persentil grafiği, PDF özet, D paneli.
3. **Faz 3** — Monitör (kamera) ayrı proje olarak.

Teknoloji (öneri): Next.js PWA + Supabase (Postgres + realtime) — randevu-sistemi'nden tanıdık.
Yerel önbellek: Dexie.js. Vercel hobby + Supabase free = **0 TL/ay**.
Alternatif: FastAPI (Python) + aynı PWA; evde mini PC'de çalışır ama ev dışında erişim sorun.

---

## 5. Kaynaklar
- https://pebbi.co/blog/best-baby-tracker-apps-2026
- https://asuffolkmum.co.uk/best-baby-tracking-apps-for-new-parents-in-2026-sleep-feeding-diapers-milestones-and-caregiver-sync/
- https://usegrowo.com/tr/insights/best-baby-tracker-apps
- https://play.google.com/store/apps/details?id=app.ebeveyn&hl=tr
- https://asi.saglik.gov.tr/bagisiklama-programi-ve-asi-takvimi/asi-takvimi.html
- https://drserpilcan.com/asi-takvimi/
- https://www.tysdatakentasm.com/hizmetler/bebek-izlem
- https://sbu.saglik.gov.tr/Ekutuphane/Yayin/420 (Bebek ve Çocuk İzlem Protokolü)
- https://www.who.int/tools/child-growth-standards/standards/weight-for-age
- https://github.com/lars-frogner/OpenBabyMonitor
- https://www.hackster.io/Hardi2409/baby-positioning-detection-system-ff22ac

---
---

# 2. TUR ARAŞTIRMA (2026-09-13, akşam) — "telefon, 0 TL, piyasada olmayan"

Kararlar: telefon öncelikli; ilk kullanıcı Erdinç (+eşi); 1. aşamada para harcanmayacak;
hedef "olanların üstüne çıkan" bir şey.

## 6. Sıfır maliyetle telefonda ne mümkün? (teknik zemin)

| İhtiyaç | Çözüm | Ücret | Not |
|---|---|---|---|
| Telefonda uygulama | PWA (ana ekrana ekle) | 0 | Mağaza yok, güncelleme anında |
| Veri + aile senkronu | Dexie.js (IndexedDB) + **Dexie Cloud** | 0 (3 kullanıcı, 100 MB) | Backend kodu yazmadan çevrimdışı-önce senkron |
| Barındırma | Cloudflare Pages / Vercel Hobby / GitHub Pages | 0 | Statik site yeter |
| Bildirim | Web Push | 0 | iOS'ta yalnız ana ekrana eklenmiş PWA'da çalışır |
| Sesle kayıt | Web Speech API (Android Chrome, Türkçe) → ileri aşamada Whisper (transformers.js, tarayıcıda, çevrimdışı, ~75 MB) | 0 | |
| Ağlama tespiti | YAMNet (TensorFlow.js, tarayıcıda) | 0 | 521 ses sınıfı, "Baby cry" hazır |
| Eski telefon = kamera | WebRTC (PeerJS ücretsiz sinyal sunucusu) + tarayıcıda hareket tespiti | 0 | Görüntü buluta gitmez, eşten eşe |
| NFC etiket ile tek dokunuş | Web NFC (yalnız Android Chrome) | ~50 TL/5 etiket | iPhone'da yok |
| Bluetooth tartı | Web Bluetooth (yalnız Android) | — | iPhone'da yok |

**Kritik platform farkı:** Android Chrome'da her şey çalışıyor. iPhone'da PWA push var
(ana ekrana eklenince), ama Web NFC / Web Bluetooth / arka plan senkron **yok**.
→ Hangi telefon kullanıldığı mimariyi belirliyor.

Supabase/PowerSync ücretsiz katmanları 1 hafta hareketsizlikte duraklıyor; Dexie Cloud
bu iş için daha uygun (küçük aile, yerel-önce).

e-Nabız API: sadece sağlık kuruluşlarına, dilekçeyle, 2-4 ay; bireysel geliştiriciye
kapalı sayılır → aşı kayıtları elle işaretlenecek.

## 7. "Piyasada olmayan" özellikler — kanıtlı temel

### 7a. Türkçe sesle kayıt → yapılandırılmış veri
"Sol memeden on beş dakika emdi" → {tür: emzirme, taraf: sol, süre: 15}.
Robin Baby bunu İngilizce ve ücretli yapıyor; Türkçesi yok. Gece 3'te ekrana bakmadan kayıt.

### 7b. Eski telefon = bebek kamerası, tarayıcıda, buluta gitmeden
webrtcHacks'in hareket algılayan WebRTC bebek monitörü örneği var (GitHub).
Üstüne: YAMNet ile ağlama tespiti → "ağladı" olayı otomatik deftere düşer;
hareket durunca "uyudu", hareket başlayınca "uyandı" → uyku kaydı elle girilmez.
Alfred gibi kamera uygulamaları var ama takip defteriyle konuşan yok.

### 7c. Kaka rengi kartı (biliyer atrezi taraması)
Japonya/Tayvan'da her yenidoğana "stool color card" veriliyor; Türkiye'de yok.
PoopMD (Johns Hopkins) pilot: %100 duyarlılık, %89 özgüllük. Bez fotoğrafı →
renk karşılaştırma → "soluk/kil rengi" ise doktora yönlendirme. Basit, ciddi fayda.

### 7d. Sarılık ön izleme (BiliCam tipi)
Telefon kamerası + renk kalibrasyon kartı ile bilirubin tahmini; ciddi sarılıkta
%94 duyarlılık (Univ. of Washington). İlk 2 haftada anlamlı; bizim için artık geç,
**ileride başkaları için** özellik adayı. Tıbbi iddia yok, "doktora git" tetikleyici.

### 7e. Ağlama sınıflandırma (açlık / gaz / yorgun / rahatsız)
Donate-a-Cry açık veri seti (1128 kayıt, 5-9 sınıf), 2025 makaleleri MFCC ile %96
bildiriyor — ama veri seti küçük ve "gerçek hayat" doğruluğu tartışmalı.
→ Önce sadece "ağlıyor/ağlamıyor" (güvenilir), sınıflandırma deneysel etiketle.

### 7f. SweetSpot'un yerlisi — uyku penceresi tahmini
Huckleberry: yaşa göre uyanıklık penceresi tablosu + son 5 günün kişisel örüntüsü;
2. aydan itibaren gösteriyor. Aynı mantık bizde ücretsiz: yaş tablosu + kendi
medyanımız → "tahmini uyku penceresi 14:10-14:35".

### 7g. Türkiye sağlık takvimi motoru (1. turdan)
İzlem (15. gün D vit, 4. ay demir, 3./9. ay anemi) + aşı + topuk kanı + kalça USG.
Hiçbir uygulamada yok.

### 7h. Baba paneli
Gece nöbeti, annenin toplam uykusu, **Edinburgh Doğum Sonrası Depresyon Ölçeği (EPDS)**
(Türkçe geçerliliği var) ile 2 haftada bir kısa tarama → "doktora danış" eşiği.
Gider defteri. Aylık aynı poz fotoğraf → timelapse. "Kızıma mektup".

### 7i. Kural motoru (bilgi kartı + uyarı)
< 3 ay ve ateş ≥ 38 °C → acil; günde < 6 ıslak bez → doktor; 24 saatte kilo kaybı vb.
Kaynak: Bakanlık izlem protokolü + pediatri rehberleri. Uyarı, teşhis değil.

## 8. Önerilen mimari (0 TL)

```
Telefon (PWA)  ──Dexie Cloud (ücretsiz)──  Eşin telefonu (PWA)
   │  IndexedDB (çevrimdışı)
   │  Web Speech / Whisper (ses → kayıt)
   │  YAMNet + hareket (kamera modu)
   └──WebRTC (PeerJS)── Eski telefon (kamera modu, aynı PWA)
```
- Vite + React + TypeScript + Tailwind + Dexie → statik site, sunucu kodu yok.
- Tek kod tabanı; "kamera modu" aynı PWA'nın bir sayfası.
- Veri dışa aktarma (JSON/CSV/PDF) 1. günden var — veri bizim.

## 9. Faz planı
- **Faz 1 (çekirdek, 1-2 hafta):** gece modu kayıt + zaman şeridi + sayaçlar + TR takvim + aile senkronu + dışa aktarma.
- **Faz 2:** sesle kayıt, uyku penceresi tahmini, persentil, kaka rengi kartı, kural motoru.
- **Faz 3:** eski telefon kamera modu (WebRTC + YAMNet + hareket → otomatik uyku/ağlama).
- **Faz 4:** baba paneli, EPDS, timelapse, mektuplar.

## 10. 2. tur kaynaklar
- https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- https://caniuse.com/web-bluetooth , https://www.testmuai.com/learning-hub/web-nfc-browser-support/
- https://dexie.org/pricing
- https://uibakery.io/blog/supabase-pricing
- https://github.com/xenova/whisper-web
- https://www.tensorflow.org/hub/tutorials/yamnet
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10882089/ (ağlama yorumlama, ML)
- https://github.com/martha92/babycry (Donate-a-Cry sınıflandırma)
- https://dl.acm.org/doi/10.1145/2632048.2632076 (BiliCam)
- https://pubmed.ncbi.nlm.nih.gov/28819683/ (PoopMD, kaka rengi)
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11134179/ (dijital kaka rengi taraması çok merkezli)
- https://huckleberrycare.com/blog/sweetspot-your-smart-sleep-timing-companion
- https://webrtchacks.com/baby-motion-detector/ , https://github.com/webrtcHacks/webrtc_baby_monitor
- https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html
- https://ininia.com/blog/e-nabiz-entegrasyonu-teknik-rehber (e-Nabız: bireysel erişim yok)

---
---

# 3. TUR (2026-09-13 gece) — kullanışlılık, görünüm, kaynak arşivi

## 11. Uygulamanın geldiği nokta (yayında: https://bilge-omega.vercel.app)
Kayıt (durum paneli + tek dokunuş + Geri al + dikte) · Şerit (24 saat bandı, filtre, düzenleme) ·
Özet (7 gün, grafik/tablo) · Takvim (TR aşı+izlem, iPhone Takvim aboneliği) · Ayarlar (bildirim
kuralları, tema, aile) · Profil (WHO persentil, aylık albüm). Aile girişi: **aile kodu** (e-posta yok).
Bildirim: Web Push + QStash zamanlayıcı. Veri: Dexie Cloud (tek aile hesabı), cihaz rolü `by` alanında.

## 12. Kullanışlılık incelemesi (gece 3, tek el senaryosu) — yapılanlar
| Sorun | Çözüm |
|---|---|
| "Şu an ne oluyor?" için 3 küçük sayaç yetmiyordu | Durum paneli: Uyuyor/Uyanık + süre, "sonraki beslenme ~40 dk", bugünün sayıları |
| Yanlış dokunuş geri alınamıyordu | 6 sn "Geri al", butonlar basınca yanar |
| Geçmişe kayıt yoktu | Şerit → kayda dokun → −5/−15/−30/−60 dk, bitiş, tür, sil |
| Biberon miktarı 4 seçenekle sınırlıydı | "ml" serbest kutusu |
| Şerit uzun listeydi | Filtre çipleri (beslenme/uyku/bez/diğer) + gün bandı |
| Gündüz koyu tema rahatsız | Otomatik tema (08-20 açık), Ayarlar'da seçim |
| İlk açılışta ne yapılacağı belirsizdi | Tek seferlik "Nasıl kullanılır" kartı |
| Davet/e-posta akışı iCloud'da kırıldı | Aile kodu + "Davet gönder" (WhatsApp) |
| Kim girdi belli değildi | Cihaz rolü → her kayıtta anne/baba etiketi |

## 13. Rakip UX notları (Huckleberry ekran analizi, screensdesign.com)
- Ana panelde ilk dakikadan "sonraki uyku tahmini" gösteriyorlar → bizde "sonraki beslenme" var; 2. aydan
  itibaren uyku penceresi tahmini eklenecek (yaş tablosu + son 5 gün medyanı).
- İki aşamalı kayıt: hızlı zamanlayıcı → isteğe bağlı detay ekranı. Bizde: tek dokunuş → Şerit'te düzenleme. Aynı fikir.
- Kullanıcı ana ekrandaki widget'ları seçebiliyor → ileride: Kayıt ekranında buton sırası/gizleme ayarı.
- Onboarding anketi "çok uzun" şikâyeti → biz 2 alanla (isim, doğum) başlıyoruz; koruyalım.
- Napper: sakin arayüz + 30+ uyku sesi (beyaz gürültü) → ücretsiz beyaz gürültü çalar (Web Audio) kolay bir ekleme.

## 14. Kaynak arşivi (`BILGE/kaynaklar/`)
- `bakanlik-bebek-cocuk-izlem-protokolu-2018.pdf/.txt` — 96 sayfa, resmi. Doğrulananlar: 15. günde D vitamini,
  4. ayda profilaktik demir (prematürede 2. ay), 6. ayda ek besinler (Y13), 2. aydan itibaren GİDR gelişim
  değerlendirmesi (s.37-41: 0-4 ay, 4-8 ay, … dönem anlatımları), "24 saatte ≥8 emme, ≥6 idrar" sağlıklı
  beslenme ölçütü (s.23). → Sonraki iş: GİDR dönem metinlerini uygulamaya "bu ay ne bekleniyor" kartı olarak koy.
- `g_wt/g_len/g_hc/b_*.csv` — WHO 0-24 ay LMS (CDC dağıtımı). Uygulamada `who.ts`.

## 15. Sıradaki adaylar
1. Uyku penceresi tahmini (2. ay+): yaşa göre uyanıklık penceresi tablosu × kişisel medyan.
2. "Bu ay ne bekleniyor" gelişim kartı (GİDR + CDC) ve gelişim işaretleme.
3. Beyaz gürültü / ninni çalar (çevrimdışı, Web Audio).
4. Kaka rengi kartı (biliyer atrezi).
5. Android telefon = kamera düğümü (WebRTC + YAMNet).
6. Baba paneli: nöbet, EPDS, gider.
7. PDF rapor: aile hekimine 1 sayfa özet.

---
---

# 4. TUR (2026-09-14) — Rakip kıyaslaması ve eylem listesi

Kaynaklar: 1-3. tur araştırmaları (Pebbi/Suffolk Mum/Growo karşılaştırmaları, screensdesign Huckleberry analizi,
mağaza sayfaları). "?" = doğrulanmadı.

## 16. Özellik matrisi

| Özellik | Bilge | Huckleberry | Baby Tracker | Nara | Napper | Glow Baby | Ebeveyn (TR) |
|---|---|---|---|---|---|---|---|
| Fiyat | 0 | Free / ~60 $/yıl | Free / Premium | Free | 70 $/yıl | ~60-90 $/yıl | Free+reklam? |
| Çevrimdışı | ✅ tam | ❌ | Premium | ✅ | ? | ❌ | ? |
| Aile senkronu | ✅ sınırsız, kodla | ortak hesap | Premium | ✅ | ? | Family plan | ? |
| Veri sende (dışa aktarma) | ✅ JSON + rapor | kısıtlı | ✅ | ✅ | ? | ❌ | ? |
| Tek dokunuş + Geri al | ✅ | timer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Türkçe sesle/yazarak kayıt | ✅ kural tabanlı | AI (İng., ücretli) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Uyku penceresi tahmini | ✅ yaş+kişisel | ✅ SweetSpot (ücretli) | ❌ | ❌ | ✅ | ❌ | ❌ |
| TR aşı takvimi | ✅ Bakanlık 2026 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| TR aile hekimi izlem takvimi | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| iPhone takvimine alarm | ✅ webcal | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Canlı bildirim (beslenme/uyku/D vit) | ✅ | ✅ | ✅ | ? | ✅ | ✅ | ? |
| WHO persentil | ✅ | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| Gelişim basamakları | ✅ CDC+GİDR | ✅ | ❌ | ❌ | ❌ | ✅ | atak haftası |
| Kaka rengi kartı (biliyer atrezi) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Aile hekimi raporu (PDF/metin) | ✅ | rapor (ücretli) | ✅ | ? | ❌ | ❌ | ❌ |
| Uyku sesi / beyaz gürültü | ✅ çevrimdışı | ❌ | ❌ | ❌ | ✅ 30+ ses | ❌ | ❌ |
| Fotoğraf albümü | ✅ aylık | ❌ | ❌ | ❌ | ❌ | ✅ | ? |
| Süt sağma (pompa) + stok | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ek gıda / katı besin | ❌ (6. ay) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| İlaç: serbest ilaç + doz | kısmi (D vit, demir) | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| Birden fazla bebek | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Widget / kilit ekranı | ❌ (PWA) | ✅ | ✅ | ✅ | ✅ | ✅ | ? |
| Apple Watch | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mağazada | ❌ (PWA) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Topluluk / makale | ❌ | ✅ | ❌ | ❌ | kurs | ✅ | ✅ |
| Anne (doğum sonrası) takibi | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Gizlilik (reklam/izleme yok) | ✅ | orta | orta | ✅ | ? | ❌ | ? |

## 17. İyi yanlarımız (rakiplerin hiçbirinde birlikte yok)
1. Türkiye sağlık sistemiyle bütünleşik: Bakanlık aşı + izlem + D vit/demir + telefonun kendi alarmı.
2. Sıfır ücret, sıfır reklam, veri ailenin: dışa aktarma, PDF rapor, aile kodu ile sınırsız cihaz.
3. Gece 3 kullanılabilirliği: durum paneli, tek dokunuş, Geri al, onaylı işlemler, koyu/sıcak tema, sesle kayıt.
4. Tıbbi erken uyarılar: kaka rengi kartı, ateş eşiği (<3 ay ≥38), çift D vit dozu uyarısı, uyku penceresi.
5. Çevrimdışı-önce; internet yokken hiçbir şey kaybolmaz.
6. Tek kod tabanı, sunucusuz; bakım maliyeti yok.

## 18. Kötü yanlarımız / eksikler
1. **Süt sağma (pompa) ve süt stoku yok** — anne pompa kullanıyorsa günlük ihtiyaç. Rakiplerin tamamında var.
2. **Ek gıda takibi yok** — 6. ayda gerekecek; alerjen tanıtımı takvimi (yumurta, fıstık, süt…) fırsat.
3. **Serbest ilaç/doz takibi** zayıf — antibiyotik, probiyotik, kolik damlası; doz saati + hatırlatma.
4. **Widget / kilit ekranından kayıt yok** — PWA sınırı. Alternatif: iOS Kısayolları ile "Emzirme başlat" URL'i (bilge-omega.vercel.app/?act=emzir-sol) → ana ekran/Kısayol düğmesi; Siri ile de tetiklenir.
5. **Mağaza yok** — güven algısı; bugün gerek yok, dağıtım aşamasında Capacitor.
6. Tek bebek — ikiz/ikinci çocukta lazım.
7. Anne takibi yok — doğum sonrası ruh hali (EPDS), annenin uykusu, su/ilaç.
8. Bildirim sesi "alarm" gibi değil (iOS sınırı) — Takvim alarmı bunu kısmen karşılıyor.
9. Ölçüm girişi elle — Bluetooth tartı yok (iOS'ta PWA yapamaz).
10. Kanıt: özellikler var ama gerçek gece kullanımı 1 gün; Huckleberry'nin 8 yıllık kullanım verisi var.

## 19. Eylem listesi (öncelik sırasıyla)
| # | İş | Neden | Büyüklük |
|---|---|---|---|
| 1 | Süt sağma (pompa) kaydı + süt stoku (ml, tarih, dolap/dondurucu) | Rakiplerin standardı, anne için günlük | 1 gün |
| 2 | iOS Kısayolu / URL ile hızlı kayıt (`?act=…`) | Kilit ekranından tek dokunuş; widget boşluğunu kapatır | yarım gün |
| 3 | Anne paneli: EPDS taraması (2 haftada bir), annenin uykusu, su/ilaç | Kimsede yok; doğum sonrası depresyon 7-8 kadından 1'inde | 1 gün |
| 4 | Serbest ilaç + doz saati + hatırlatma | Hasta günlerinde şart | yarım gün |
| 5 | Ek gıda + alerjen tanıtım takvimi (6. ay) | Zamanı gelince hazır olsun | 1 gün |
| 6 | İkinci bebek desteği | İleride | 1 gün |
| 7 | Baba paneli: gece nöbeti, gider | Hayat değişikliği kısmı | 1 gün |
| 8 | Android kamera/ağlama düğümü | Faz 3, teknik gösteri değeri yüksek | 1 hafta |

---
---

# 5. TUR (2026-09-14) — Öğren → öğret → geliştir

## 20. Alan bilgisi (yeni okunanlar; ayrıntı kaynaklar/bilgi-tabani.md)
- **SB Ulusal Aşı Takvimi 2026 (1 Eylül güncellemesi, resmi kart okundu):** 9. ay sonu **KKK ek doz** ve 48. ay **Suçiçeği 2** eklendi (bizde eksikti). 13 yaş Td. → schedule.ts düzeltildi.
- **WHO 2023 tamamlayıcı beslenme (6-23 ay), 7 öneri:** 6. ayda (180 gün) başla, emzirmeye 2 yaşa kadar devam; et/balık/yumurta **her gün**; meyve-sebze her gün; şekerli içecek yok, şeker/tuz/trans yağ yok; 6-11 ay formül ya da hayvan sütü olabilir, 12-23 ay hayvan sütü (devam sütü gerekmez); duyarlı besleme (açlık/tokluk işaretlerine yanıt); yer fıstığı ve yumurtayı geciktirme (erken tanıtım alerjiyi azaltıyor). → 6. ay öncesi "Ek gıda" modülü için içerik hazır.
- **TND sarılık, NICE kırmızı bayraklar, AAP güvenli uyku/kolik** → bu tur uygulandı (§19 sonrası).
- Öğretebileceklerimiz (uygulama içi "öğren" kartları için aday): sarılık, güvenli uyku, ağlama, ek gıda (6. ay), aşı yan etkileri, diş çıkarma (4-7 ay), ateş yönetimi, gaz/kolik, emzirme pozisyonları, anne ruh sağlığı.

## 21. Yazılım — araştırma ve plan
| Konu | Bulgu | Karar |
|---|---|---|
| iOS 26 PWA | Ana ekrana eklenen her site web app olarak açılıyor; Declarative Web Push (Safari 18.4); File System Access; arka plan senkron hâlâ yok; otomatik kurulum uyarısı yok | Mevcut mimari doğru; "Ana Ekrana Ekle" tarifi kalıyor |
| Manifest | `shortcuts` (Android uzun bas menüsü), `share_target` (fotoğrafı uygulamaya paylaş → albüm), `id` | Eklendi |
| Kalite | Kural motorları (ayrıştırıcı, değerlendirme, uyku penceresi, süt stoku, persentil) test edilmeli | **Vitest** birim testleri eklendi; her yayından önce koşuyor |
| Hız | Bundle 670 KB; rapor/profil/anne/baba sayfaları ilk açılışta gereksiz | React.lazy ile kod bölme |
| Erişilebilirlik | iOS Dynamic Type: `font: -apple-system-body` ile kullanıcının yazı boyutu; kontrast ≥4.5:1 | Eklendi |
| Güvenlik | Aile kodu 8 karakter + 1 sn gecikme; CSP/başlık sertleştirme | vercel.json güvenlik başlıkları eklendi |
| Ses | iOS'ta Web Speech Türkçe belirsiz; transformers.js Whisper-base ~75 MB tek indirme, cihazda | Sonraki tur denemesi (isteğe bağlı indirme) |
| Yapay zekâ | Karmaşık cümle ayrıştırma ve haftalık yorum için LLM mümkün; ücretli | 0 TL kararı: şimdilik yok |
| Yedek | Dexie Cloud + JSON dışa aktarma var | Aylık "yedek al" hatırlatması (sonra) |

## 22. Görsellik — araştırma ve plan
- **iOS 26 Liquid Glass:** yarı saydam, bulanık zeminli çubuklar; derinlik; içerikle tonlanan yüzeyler → üst başlık ve alt menü `backdrop-filter: blur` ile yarı saydam yapıldı.
- **2026 eğilimleri:** koyu mod birincil yüzey (bizde zaten), amaçlı mikro-etkileşimler (lit/undo var), başparmak-öncelikli düzen (alt menü + büyük kartlar var), sesle kullanım (var), uyarlanabilir erişilebilirlik (Dynamic Type eklendi).
- Sıradaki görsel adaylar: günlük hedef halkaları (beslenme 8/8, ıslak bez 6/6) durum panelinde; boş durum illüstrasyonları; sekme geçişinde yumuşak kaydırma; skeleton yükleme; büyük başlık (large title) stili; gece modunda daha sıcak gradyan.

## 23. Rakip taraması — 6. tur (15 Eylül 2026, güncel 2026 incelemeleri)

Kaynaklar: Pebbi "Best Baby Tracker Apps 2026" (11 uygulama), Tottli 2026 karşılaştırması, OurKidsMom (Huckleberry / Napper / Nara / Robin Baby),
ConservaMom, NotSalmon; App Store TR: Mutlu Bebek, Emzirme & Bebek Takibi, Bebek Takibi!, Bebek+, Baby Tracker (Nighp).

### 2026'da "olmazsa olmaz" sayılan özellikler
Apple Watch · ana ekran widget'ı · kilit ekranı Live Activity · eş senkronu · uyku tahmini · hekim PDF'i · WHO persentil ·
süt stoku · gece modu · tek elle kayıt · çoklu bebek · sesle kayıt (yeni) · yapay zekâ soru-cevap (yeni) · veri dışa aktarma.

### Öne çıkanlar
- **Huckleberry**: SweetSpot uyku tahmini, "Berry" AI koç, canlı uyku danışmanlığı. 68,99 $/yıl. Şikâyet: pahalı, obsesif takibe itiyor, çevrimdışı yok.
- **Robin Baby** (2026'nın "en iyi iPhone" seçimi): sesle kayıt — tek cümlede birden çok olay ("15 dk soldan emdi, sonra kaka") + verine soru sorma ("son beslenme ne zamandı?") + hekim PDF.
- **Nara Baby**: tamamen ücretsiz/reklamsız, lohusa sağlığı, ikiz/çoklu bebek, Live Activity, ilaç hatırlatması (çift doz engeli), belirti günlüğü.
- **Pebbi**: 2 bakıcıya ücretsiz senkron, çevrimdışı, hesapsız; "AI devir-teslim özeti", gebelik haftasına göre düzeltilmiş tahmin (prematüre).
- **Tottli**: en hızlı tek el kayıt, kilit ekranı widget'ı, süt stoku, pompa zamanlayıcı; iOS-only, fotoğraf/analiz yok.
- **Baby Tracker (Nighp)**: 4,99 $ tek sefer, PDF, WHO; senkron iCloud (gerçek zamanlı değil).
- **Talli**: fiziksel buton + Alexa (donanım 40–60 $).
- **Wonder Weeks**: "sıçrama dönemi" tahmini (bilimsel kanıtı zayıf; takip yapmaz).
- **TR uygulamaları** (Mutlu Bebek 4,7★ 663 oy, 129–649 ₺/yıl; Emzirme & Bebek Takibi; Bebek Takibi!): temel takip + ilaç hatırlatma;
  hiçbirinde SB aşı takvimi, aile hekimi izlem protokolü, WHO persentil, sarılık/kırmızı bayrak, sesle kayıt yok; senkron ücretli.

### Bizde OLMAYAN (dürüst liste)
| Eksik | Kimde var | Yapılabilir mi? |
|---|---|---|
| Ana ekran widget'ı / Live Activity / Apple Watch | Tottli, Nara, Glow, Huckleberry | PWA'da imkânsız; yalnız native (Capacitor + Swift widget, 99 $/yıl + Mac). Kısmi karşılık: kilit ekranı medya kartı (bizde var). |
| Verine soru sorma ("son beslenme ne zaman?", "bugün kaç bez?") | Robin Baby | EVET, kural tabanlı Türkçe soru-cevap, 0 TL — parser'ın üstüne. |
| Belirti günlüğü (kusma, ishal, döküntü, öksürük, burun akıntısı…) | Nara | EVET, olay türü + çipler + rapora satır. |
| Çoklu bebek / ikiz | Nara, Baby Connect | Çok-aile mimarisiyle birlikte (ertelendi). |
| CSV/Excel dışa aktarma | Baby Tracker, Baby Connect | EVET, 1 saat. |
| Aktivite: karın üstü süresi (tummy time), banyo, dışarı | Huckleberry | EVET; tummy time AAP kaynaklı öneriyle. |
| Pompa zamanlayıcı (power pump) | Tottli, ParentLove | Kolay; anne isterse. |
| Gebelik haftasına göre düzeltme (prematüre) | Pebbi | Gerekmiyor (term bebek); ürünleşirse eklenir. |
| Prematüre/gelişim "sıçrama" takvimi | Wonder Weeks | Bilerek YOK (kanıt zayıf). |
| Uyku tahmini derinliği (uyku basıncı modeli) | Huckleberry, Napper | Bizde yaş bandı + kişisel medyan var; veri birikince geliştirilebilir. |
| Topluluk/forum, koçluk, canlı danışman | Glow, Huckleberry | Hedef değil. |

### Bizde OLUP rakiplerde olmayan / nadir
1. **Türkiye klinik standardı**: SB aşı takvimi 2026 (resmi kartla doğrulandı), aile hekimi izlem protokolü, TND sarılık kuralları, NICE kırmızı bayraklar, WHO 2023 ek gıda — ekranda kaynaklı. Hiçbir TR/global uygulamada yok.
2. **Sesli, sürekli alarm** (telefon kilitliyken de) + uygulama kapalıyken 3'lü bildirim salvosu — rakiplerin hepsi tek bildirim.
3. **Gece ekranı** (siyah, dev düğmeler, kilidi açınca önünde) + varsayılan açık alarm modu + kilit ekranı canlı durum kartı.
4. **Akıllı kurallar**: uyurken bez/emzirme girince uyku biter; emzirirken "uyudu" emzirmeyi bitirir; taraf değiştir; süre düzeltme şeridi.
5. **Türkçe sesle kayıt, çok komutlu, hataya toleranslı, sunucuya ses göndermeden** (Robin Baby sesi buluta yollar).
6. **Ücretsiz, reklamsız, abonelik yok, veri bizde** (AB sunucusu), çevrimdışı, gerçek zamanlı eş senkronu, rol etiketi.
7. **Değerlendirme kartı "veri yok" dürüstlüğü** — Huckleberry'nin "obsesif takip" şikâyetinin tersi: kayıt eksikse yorum yapmaz.
8. Anne paneli + EPDS (TR kesme 13) + gece nöbeti/gider defteri + aile hekimi raporu tek yerde.

### Eylem (sıra)
1. Soru-cevap: "son beslenme?", "kaç bez?", "ne kadar uyudu?", "sonraki beslenme?", "D vitamini verildi mi?" — 🎤 sayfasından.
2. Belirti günlüğü (çipler + not + rapora "Belirtiler" bölümü).
3. CSV dışa aktarma (Ayarlar → Yedek).
4. Karın üstü süresi (tummy time) + banyo kaydı (Bakım bölmesi, AAP kaynaklı hedef).
5. Native karar (widget/Watch) — ürünleşme kararıyla birlikte, Ekim.
