# GÖREV: BILGE — iki ajanlı geliştirme

Klasör: `app/` (PC-A: `C:\Users\erdinckoseoglu\Desktop\yazilimdosyalari\BILGE`, PC-B: `C:\Users\erdin\projeler\bilge`)
Doğrulama: `cd app && npm test`   ← yeşilse iş doğru. Tip: `npx tsc -b --noEmit`. Build: `npm run build`.

## Hedef
Codex (PC-B) ve Claude (PC-A) aynı repoda paralel çalışır: biri yazarken diğeri test/review yapar.
Canlı sürüm iPhone'da gerçek kullanımda — **kırmayan, küçük, doğrulanmış adımlar.**

## Tamamlananlar
- [x] Repo iki PC'ye açıldı, kural/görev dosyaları eklendi (commit `e4ff50b`, claude, 19 Eyl 2026)

## Sıradaki adım
- [ ] (codex) İlk tarama: `app/src` içinde ölü kod / tekrar eden mantık / bariz hata / testsiz kritik modül listesi çıkar; **kod değiştirme**, bulguları buraya "Adaylar" olarak yaz.
- [ ] (kullanıcı seçer) Adaylardan hangisi ilk iş olacak

## Adaylar
<Codex'in taraması buraya>

## Yarım kaldı / dikkat
- PC-B'de bulut yok (`dexie-cloud.json` yalnız PC-A'da) → orada uygulama yerel modda; test/tsc/build için yeterli.

## Son güncelleyen
claude — 2026-09-19 — "repo iki tarafta, ilk tarama Codex'te"
