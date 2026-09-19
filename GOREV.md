# GÖREV: BILGE — iki ajanlı geliştirme

Klasör: `app/` (PC-A: `C:\Users\erdinckoseoglu\Desktop\yazilimdosyalari\BILGE`, PC-B: `C:\Users\erdin\projeler\bilge`)
Doğrulama: `cd app && npm test`   ← yeşilse iş doğru. Tip: `npx tsc -b --noEmit`. Build: `npm run build`.

## Hedef
Codex (PC-B) ve Claude (PC-A) aynı repoda paralel çalışır: biri yazarken diğeri test/review yapar.
Canlı sürüm iPhone'da gerçek kullanımda — **kırmayan, küçük, doğrulanmış adımlar.**

## Tamamlananlar
- [x] Aday 6: İsteğe bağlı birthTime, Ayarlar alanı ve sarılık saat hesabı eklendi; saat yoksa ±12 sa notu, 9 regresyon testi; Dexie v9 korundu (commit `7b96d79`, codex, 20 Eyl 2026).
- [x] Aday 1: Mevcut prn alanıyla PRN aralığı %100, kür %85; kart metni ve 9 doz aralığı regresyon testi (commit `5184758`, codex, 20 Eyl 2026).
- [x] Aday 7: Kilo kaybı dal önceliği ve 14 gün sonrası doğum kilosuna dönüş uyarısı düzeltildi; saf fonksiyon ve 14 regresyon testi (commit `424b58d`, codex, 20 Eyl 2026).
- [x] Aday 3: Abonelik açılınca msgId boş yerel hatırlatma sunucuda zamanlanıyor; saf karar fonksiyonu için 8 test (geçiş, yeniden deneme ve ±60 saniye sınırı), api/ değişmedi (commit `50bc40d`, codex, 20 Eyl 2026).
- [x] Aday 5: Kür sayacı ilgili medId için sınırsız ilaç geçmişinden hesaplanıyor; kart ve bitirme onayı ortak sayıyı kullanıyor. Mevcut saf dosesGiven için 4 test; 250 başka olay, farklı kür ve geri alma dahil (commit `60f3e46`, codex, 20 Eyl 2026).
- [x] Aday 10: Dört modül ortak ageDays/ageMonths yardımcısını kullanıyor; tam gün hesabı, 30.4375 böleni ve NaN davranışı korundu, 9 sınır testi (commit `e482bfe`, codex, 20 Eyl 2026).
- [x] Aday 8: Takvim değiştirilmeden 36 kaydın açık tarihleri, benzersiz anahtarlar, izlem ve ay sonu/artık yıl sınırları 8 regresyon testiyle sabitlendi (commit `30f3429`, codex, 20 Eyl 2026).
- [x] Aday 9: Select-String taraması yalnız tanımları buldu; `minutesSince`, `inviteMember` ve gereksiz `differenceInMinutes` importu kaldırıldı; son taramada eşleşme yok (commit `cbc0302`, codex, 20 Eyl 2026).
- [x] Aday 4: Haftalık özet saf fonksiyona taşındı; bitmiş/devam eden gece uykusu gün aralığıyla kesiştiriliyor, 4 regresyon testi (commit `1ee5b08`, codex, 20 Eyl 2026).
- [x] Aday 2: Rapor ekranı ve paylaşımında ortak persentil yardımcısı; veri aralığı dışında “hesaplanamadı”, 3 regresyon testi (commit `d2775af`, codex, 20 Eyl 2026).
- [x] Repo iki PC'ye açıldı, kural/görev dosyaları eklendi (commit `e4ff50b`, claude, 19 Eyl 2026)

## Sıradaki adım
- [ ] kullanıcı test eder (iPhone): ilaç PRN uyarısı, sarılık saati, kilo değerlendirmesi

## Adaylar
(kalan yok)

## Yarım kaldı / dikkat
- Son doğrulama (7, 1, 6; 2026-09-20): başlangıç 81 test; madde commitleri öncesi 95, 104, 113 test geçti. Son npm test satırı: `Duration  2.23s (import 89%, transform 9%, tests 1%, worker 1%)`; `npx tsc -b --noEmit`: çıktı yok, çıkış kodu 0. Kullanıcının belirttiği kararlar uygulandı; AAP_WEIGHT ve TND kontrol eşikleri korunuyor. iPhone testi bekleniyor.
- Doğrulama (8, 10, 5, 3; 2026-09-20): başlangıç 5 dosya, 52 test; son dolu satır `Duration  2.09s (import 91%, transform 7%, tests 1%)`. Dört madde commit'i öncesi sırasıyla 60, 69, 73, 81 test geçti; tüm `npx tsc -b --noEmit` kontrolleri çıktısız, çıkış kodu 0. Son doğrulama aşağıda. Takvim ve sağlık eşikleri değiştirilmedi.
- Uygulama notu: QuickLog'un son 200 genel olayı artık kür sayacının veri kaynağı değil; MedsBlock mevcut type indeksinden ilgili medId geçmişini ayrı sorgular. Mevcut saf dosesGiven tekrar kullanılmaktadır; şema değişmedi, fake-indexeddb gerekmedi.
- Eşitleme: başlangıç `git pull --rebase 2pc main` ağ zaman aşımıyla başarısız oldu; yerel temiz ağaçtan devam edildi. Deploy, npm install ve GitHub push yapılmadı.
- Ek ölü kod notu (değiştirilmedi): `app/src/features/stats/summarize.ts` içindeki `Day.bottleMl` hesaplanıyor ancak Weekly tarafından okunmuyor; Select-String taramasında haftalık özet için yalnız tanım ve atama bulundu. Report içindeki ayrı `Stats.bottleMl` kullanılıyor.
- Doğrulama (2026-09-20): başlangıç `npm test` → 3 dosya, 45 test; son dolu satır `Duration  2.40s (import 89%, transform 9%, tests 1%, worker 1%)`. Bitiş → 5 dosya, 52 test; son dolu satır `Duration  2.27s (import 91%, transform 7%, tests 1%, worker 1%)`. Başlangıç ve bitiş `npx tsc -b --noEmit` → çıktı yok, çıkış kodu 0. Sağlık eşikleri değiştirilmedi.
- PC-B'de bulut yok (`dexie-cloud.json` yalnız PC-A'da) → orada uygulama yerel modda; test/tsc/build için yeterli.

## Son güncelleyen
Son güncelleyen: codex, 2026-09-20
