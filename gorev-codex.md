Önce AJAN-KURALI.md, GOREV.md ve HAFIZA.md'nin son 40 satırını oku. GOREV.md "Adaylar" listesindeki 2, 4 ve 9 numaralı maddeleri uygula. Her madde ayrı commit ([codex] ... İngilizce mesaj). Başlamadan ve bitince: cd app; npm test ve npx tsc -b --noEmit yeşil olmalı.

Madde 2 — app/src/features/report/Report.tsx:85 civarı: paylaşım metninde `zScore(...) ?? 0` hesaplanamayan persentili P50 gibi gösteriyor; ekran (:142) boş bırakıyor. Paylaşım metni de "hesaplanamadı" (ya da ekranla aynı ifade) göstersin. Persentil hesabı bir yardımcı fonksiyona çıkarılabiliyorsa çıkar ve vitest ile "veri aralığı dışı ölçüm → null/hesaplanamadı" testini ekle. Sağlık eşiği değiştirme.

Madde 4 — app/src/features/stats/Weekly.tsx:23 civarı: önceki gün başlayıp hâlâ süren uyku `e.end ?? e.start` filtresi yüzünden bugünkü toplamdan düşüyor (23:00–02:00 → bugünün 120 dk'sı sayılmıyor). Devam eden süreli olayı "şimdi"ye kadar gün aralığıyla kesiştir. Gün-içi süre hesabını saf bir fonksiyona al (varsa mevcut yardımcıyı kullan) ve vitest testi ekle: gece yarısını aşan bitmiş uyku + devam eden uyku.

Madde 9 — app/src/lib/time.ts `minutesSince` ve app/src/db/db.ts `inviteMember`: Select-String / grep ile hiçbir yerden çağrılmadığını doğrula, kaldır; kaldırınca gereksiz kalan import'ları temizle. Başka ölü kod bulursan dokunma, GOREV.md'ye not düş.

Bitince GOREV.md: 2, 4, 9'u "Tamamlananlar"a taşı (commit hash'leriyle), "Adaylar"dan sil, "Sıradaki adım" listesini güncelle, "Son güncelleyen: codex, 2026-09-20". Son mesaj ≤6 satır: test/tsc son satırları, 3 commit hash'i, dokunulan dosyalar. Deploy yapma, npm install yapma, GitHub'a push yapma.
