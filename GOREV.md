# GÖREV: BILGE — iki ajanlı geliştirme

Klasör: `app/` (PC-A: `C:\Users\erdinckoseoglu\Desktop\yazilimdosyalari\BILGE`, PC-B: `C:\Users\erdin\projeler\bilge`)
Doğrulama: `cd app && npm test`   ← yeşilse iş doğru. Tip: `npx tsc -b --noEmit`. Build: `npm run build`.

## Hedef
Codex (PC-B) ve Claude (PC-A) aynı repoda paralel çalışır: biri yazarken diğeri test/review yapar.
Canlı sürüm iPhone'da gerçek kullanımda — **kırmayan, küçük, doğrulanmış adımlar.**

## Tamamlananlar
- [x] Repo iki PC'ye açıldı, kural/görev dosyaları eklendi (commit `e4ff50b`, claude, 19 Eyl 2026)

## Sıradaki adım
- [x] (codex) İlk tarama: `app/src` içinde ölü kod / tekrar eden mantık / bariz hata / testsiz kritik modül listesi çıkar; **kod değiştirme**, bulguları buraya "Adaylar" olarak yaz.
- [ ] (kullanıcı seçer) Adaylardan hangisi ilk iş olacak

## Adaylar
Tarama doğrulaması (2026-09-19): `npm test` → 3 dosya, 45 test geçti; son dolu satır: `Duration  2.53s (import 87%, transform 12%, tests 1%)`; `npx tsc -b --noEmit` → çıktı yok, çıkış kodu 0.
Test envanteri: `app/src/__tests__/rules.test.ts:13` içinde sleepWindow için 2 test var; schedule, meds doz aralığı, JaundiceCard ve Assessment eşikleri için test yok (üç test dosyasının importları ve test gövdeleri tarandı; reminders importu yalnız alarm saatlerini test ediyor).

1. `app/src/features/meds/meds.ts:29`, `app/src/features/meds/MedsBlock.tsx:54` — Sorun: Testsiz `tooEarly`, PRN kartındaki “en az X saat ara” metnine rağmen aralığın %85'inde uyarıyı kaldırıyor (4 saatlik kayıtta 3 saat 30 dakika sonra `early: false` doğrulandı). Öneri: PRN metni ile kontrol davranışını kaynak ve hekim planı doğrulamasıyla tutarlı hale getirip ilk doz, sınır anları ve PRN senaryolarını test et; sağlık eşiği için kaynak gerekiyor, yeni eşik önerilmiyor. Etki: büyük; risk: yüksek.
2. `app/src/features/report/Report.tsx:85` — Sorun: Paylaşım metninde `zScore(...) ?? 0`, hesaplanamayan persentili P50 olarak gösterirken aynı raporun ekranı (`:142`) persentili boş bırakıyor. Öneri: `null` sonucunu metinde de “hesaplanamadı” olarak koru ve veri aralığı dışındaki ölçümle ekran/paylaşım tutarlılığını test et. Etki: büyük; risk: düşük.
3. `app/src/features/notify/reminders.ts:88` — Sorun: Abonelik yokken `msgId: ""` ile oluşturulan yerel hatırlatma, abonelik sonradan açılınca zamanı aynı olduğu için atlanıyor ve sunucuda zamanlanmıyor. Öneri: Abonelik mevcutken boş `msgId` kaydını sunucuda zamanlanması gereken kayıt say ve aboneliksizden abonelikliye geçişi test et. Etki: büyük; risk: orta.
4. `app/src/features/stats/Weekly.tsx:23` — Sorun: Önceki gün başlayıp halen süren uyku, `e.end ?? e.start` filtresi nedeniyle bugünkü toplamdan düşüyor (23:00–02:00 örneğinde bugünün 120 dakikası sayılmıyor). Öneri: Devam eden süreli olayları şimdiki zamana kadar gün aralığıyla kesiştir ve gece yarısını aşan uyku senaryosunu test et. Etki: orta; risk: düşük.
5. `app/src/features/meds/MedsBlock.tsx:63`, `app/src/features/log/QuickLog.tsx:40` — Sorun: Kür boyunca verilen doz sayısı yalnız son 200 genel olaydan hesaplandığı için yoğun kayıtta eski dozlar kaybolup toplam azalıyor. Öneri: Kür sayacı için ilgili `medId` geçmişini ayrı sorgula ve araya 200'den fazla başka olay giren senaryoyu test et. Etki: orta; risk: orta.
6. `app/src/features/jaundice/JaundiceCard.tsx:29`, `app/src/db/types.ts:47` — Sorun: Testsiz sarılık kontrol hesabı yalnız gün içeren doğum tarihini gece yarısı kabul ederek saat bazlı taburculuk yaşı ve kesin kontrol saati üretiyor. Öneri: Doğum saati bilinmediğinde belirsizliği göster, saat hesabı ve taburculuk sınırlarını test et; klinik kontrol kuralları için kaynak doğrulaması gerekiyor, yeni eşik önerilmiyor. Etki: büyük; risk: yüksek.
7. `app/src/features/stats/Assessment.tsx:104` — Sorun: Testsiz kilo değerlendirmesinde önceki kayıp dalı, 14. gün doğum kilosuna dönmeme dalını belirli kayıplarda gölgeliyor ve aynı durum farklı uyarı düzeylerine düşüyor. Öneri: Koşulların önceliğini mevcut sağlık kaynağıyla doğrulayıp kilo, yaş, ateş ve veri-yok sınırlarını tablo testleriyle kapsa; sağlık eşikleri için kaynak gerekiyor, yeni eşik önerilmiyor. Etki: büyük; risk: yüksek.
8. `app/src/features/calendar/schedule.ts:70` — Sorun: SB aşı/izlem takvimini üreten `buildSchedule` için tarih, benzersiz anahtar, doz sırası ve ay sonu/artık yıl regresyon testi yok. Öneri: Mevcut SB kaynak belgesiyle doğrulanmış beklenen takvim ve tarih sınırı testleri ekle; klinik takvim değişikliği kaynak doğrulaması gerektirir. Etki: büyük; risk: düşük.
9. `app/src/lib/time.ts:33`, `app/src/db/db.ts:104` — Sorun: `minutesSince` ve `inviteMember` exportlarının `Get-ChildItem app/src -Recurse -File -Include *.ts,*.tsx | Select-String` taramasında yalnız tanımları bulundu, import veya çağrıları yok. Öneri: Kullanılmayan iki yardımcıyı ve kaldırma sonrası gereksiz kalan importları temizle. Etki: küçük; risk: düşük.
10. `app/src/features/growth/Growth.tsx:11`, `app/src/features/milestones/MilestoneCard.tsx:10`, `app/src/features/log/StatusPanel.tsx:26`, `app/src/features/stats/Assessment.tsx:46` — Sorun: Doğum tarihini ayrıştırıp gün farkını 30.4375'e bölerek yaş hesaplama mantığı birden fazla modülde tekrar ediyor. Öneri: Mevcut davranışı koruyan, referans zamanı parametre alan ortak yaş yardımcısına taşı ve tarih sınırlarını tek yerde test et. Etki: orta; risk: orta.

## Yarım kaldı / dikkat
- PC-B'de bulut yok (`dexie-cloud.json` yalnız PC-A'da) → orada uygulama yerel modda; test/tsc/build için yeterli.

## Son güncelleyen
Son güncelleyen: codex, 2026-09-19
