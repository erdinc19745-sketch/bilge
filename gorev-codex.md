Önce AJAN-KURALI.md ve GOREV.md oku. Bu bir TARAMA görevi: app/src altında KOD DEĞİŞTİRME, sadece GOREV.md'nin "Adaylar" bölümünü doldur.

Yap:
1. cd app; npm test ve npx tsc -b --noEmit çalıştır, son satırları not et.
2. app/src'yi oku (features/, lib/, db/, notify/). Şunları ara:
   - Ölü kod: hiçbir yerden import edilmeyen export/dosya (Get-ChildItem + Select-String ile doğrula).
   - Tekrar eden mantık: aynı hesabın iki yerde yazılması (ör. yaş/gün hesabı, süre biçimleme, tarih ayrıştırma).
   - Bariz hata: yanlış koşul, unutulmuş await, UTC/yerel tarih karışıklığı, sınır durumları.
   - Testsiz kritik modül: schedule.ts (SB aşı takvimi), sleepWindow, meds doz aralığı, jaundice eşikleri, assessment eşikleri — hangilerinin testi yok.
3. GOREV.md "## Adaylar" altına en fazla 10 madde yaz. Her madde: dosya:satır, tek cümle sorun, tek cümle öneri, etki (küçük/orta/büyük), risk (düşük/orta/yüksek). Sağlık eşikleriyle ilgili bir şey bulursan kaynak gerektirdiğini belirt, eşik önerme.
4. GOREV.md "Sıradaki adım"daki codex maddesini [x] yap; "Son güncelleyen: codex, 2026-09-19".
5. Son mesaj ≤5 satır: test/tsc son satırı, kaç aday, en önemli 2 aday.

Başka hiçbir dosyaya dokunma. npm install yapma. Deploy yapma.
