# BILGE — taşınabilir proje hafızası

Bu dosya Claude Code'un PC-A'daki hafıza notunun repoya taşınmış hâli: **hangi PC'de, hangi ajan açılırsa açılsın
aynı bağlamla başlasın** diye. Kaynak: `~/.claude/.../memory/bilge/proje-bilge.md` (PC-A). Kronolojik; en yeni en altta.
Sırlar (aile kodu, bulut adresi) çıkarıldı — onlar Vercel env / `app/dexie-cloud.json` (yalnız PC-A).
Güncelleme kuralı: PC-A'daki Claude hafızasını güncellediğinde bu dosyayı da günceller (`GOREV.md` "Son güncelleyen" ile birlikte).

`BILGE/` klasörü 2026-08-09'da açıldı, 2026-09-13'e kadar boştu. Erdinç'in
yenidoğan bir kızı var (Eylül 2026 itibarıyla); proje onunla ilgili takip /
hayat değişikliği yazılımı.

2026-09-13: Piyasa + TR sağlık sistemi araştırması yapıldı, sonuç
`BILGE/00-arastirma-ve-fikirler.md` dosyasında. 4 katman önerildi:
A) çekirdek takip PWA (gece modu, QR ile aile senkronu, çevrimdışı),
B) TR aşı + aile hekimi izlem takvimi motoru + WHO persentil,
C) OpenCV bebek monitörü (pozisyon/solunum/ağlama, yerel ağ),
D) baba paneli (nöbet, gider, hatıra). Önerilen MVP: A+B.
2. tur (aynı gün): kararlar — telefon öncelikli, önce Erdinç+eşi kullanacak,
1. aşamada 0 TL, 'piyasada olmayan/gelişmiş' istiyor, 'her şeyi ben söylemeyeyim,
beraber üstün bir şey yapalım' (inisiyatif bekliyor).
Mimari önerisi: Vite+React PWA + Dexie.js + Dexie Cloud (ücretsiz 3 kullanıcı),
sunucu kodu yok. Fark yaratan özellikler: Türkçe sesle kayıt, eski telefon =
WebRTC kamera + YAMNet ağlama + hareket → otomatik uyku kaydı, kaka rengi kartı
(biliyer atrezi), SweetSpot benzeri uyku penceresi, TR izlem/aşı takvimi, baba paneli+EPDS.
Cevap: ana telefon iPhone, yedek Android var → iPhone = kayıt/izleme, Android = kamera/mikrofon düğümü.
Sesle kayıt iOS'ta klavye diktesi üzerinden (Web Speech Türkçe belirsiz).

2026-09-13 akşam: Faz 1 iskeleti kuruldu — `BILGE/app/` (Vite 7 + React 19 + TS + Tailwind 4 +
Dexie 4 + vite-plugin-pwa). Ekranlar: QuickLog (gece modu), Timeline, Calendar (TR aşı+izlem,
`schedule.ts`), Settings (bebek + JSON yedek). `npm run build` temiz, Edge headless ile doğrulandı.
`npm run dev` sadece localhost; `dev:lan` ağa açar (kullanıcı isteyince). Doğum tarihi uygulamaya kullanıcı girecek.

Aile senkronu kodu hazır (dexie-cloud-addon 4.4.15): aile realm'i bebek kaydının realmId'sinde
saklanır, tüm kayıtlar oraya yazılır, anne `db.members` daveti (e-posta) ile katılır —
`src/db/db.ts` (ensureFamilyRealm/inviteMember), `src/features/settings/Family.tsx`.
Bulut adresi `dexie-cloud.json`'dan vite.config'te okunur; dosya yoksa yerel mod.
2026-09-13 gece: Dexie Cloud DB `<dexie-cloud.json'daki adres>` (kullanıcı `npx dexie-cloud create`
ile açtı — yanlış klasörde, dosyalar `app/`'a taşındı). Vercel projesi `bilge`
(erdinc-s-projects, kullanıcı erdinc19745-2184), prod URL `https://bilge-erdinc-s-projects.vercel.app`.
Yayın yöntemi: `npx vercel build --prod --yes` + `npx vercel deploy --prebuilt --prod --yes`
(dexie-cloud.json gitignore'da → yerel derleme şart). Dexie whitelist: localhost:5173 + prod URL.
Vercel 'Deployment Protection' (Vercel Authentication) yeni projede açık geldi → kullanıcı panelden
kapatacak (otomatik mod API ile kapatmama izin vermedi). Vercel CLI token: %APPDATA%/com.vercel.cli/Data/auth.json.
Eş = 'anne' olarak anılıyor.

**Why:** Global uygulamaların hiçbiri TR izlem protokolünü (15. gün, 41. gün,
D vit/demir başlangıcı) bilmiyor; ebeveynlerin en çok istediği şey ücretsiz
aile senkronu + çevrimdışı + gizlilik.

**How to apply:** Ürün kararı verilince bu notu güncelle; doğum tarihini
kullanıcı söylemeden varsayma. Tıbbi iddia içeren özelliklerde (solunum
izleme vb.) "tıbbi cihaz değil" uyarısını koru.

İlgili: [[kullanici-erdinc]], [[project_randevu_sistemi]]

2026-09-13 gece (devam): Kullanıcı "hepsini istiyorum" dedi → 5 özellik yayınlandı:
Türkçe dikte ayrıştırıcı (parseTurkish.ts, 15 örnek test edildi), haftalık özet (SVG çubuk,
dataviz paleti doğrulandı: uyku #3987e5, emzirme #d95926, bez #199e70, biberon #c98500),
WHO persentil (CDC'den indirilen WHO 0-24 ay LMS CSV → who.ts; medyan testleri geçti),
aylık albüm + avatar (photos tablosu, Blob, 900px JPEG), Web Push altyapısı
(src/sw.ts injectManifest, api/remind.ts + api/push.ts QStash, VAPID anahtarları Vercel env'de,
public key .env.production'da). Dexie şema v4 (photos, pushSubs, reminders).
Ayrıca: yanan buton + Geri al + düzenleme paneli + 24 saat gün şeridi + iPhone Takvim aboneliği
(api/takvim.ts, webcal://). QStash (EU region, qstash-eu-central-1) anahtarları 2026-09-13 21:15 Vercel env'e eklendi
(QSTASH_URL/TOKEN/CURRENT/NEXT). Uçtan uca test: remind→QStash→push 21 sn'de çağrıldı, imza OK.
Ayarlar'da 'Deneme bildirimi' düğmesi var. Kullanıcı telefonda 'Bu cihazda aç' yapınca canlı.
Ders: Bash tool'da ~8 KB'den uzun heredoc komutlar kesiliyor → uzun yamaları scratchpad'e .py
yazıp çalıştır. Vercel Node fonksiyonlarında src'den import uzantılı olmalı (`schedule.js`).

2026-09-13 gece 2: Davet/e-posta akışı iCloud'da kırıldı (OTP maili gelmedi) → tamamen kaldırıldı.
**Aile kodu girişi**: api/token.ts (Dexie Cloud client_credentials, FAMILY_CODE=<Vercel env'de>,
FAMILY_USER_ID=erdinc19745@gmail.com — tek aile hesabı), istemci fetchTokens + FamilyLogin ekranı,
cihaz rolü localStorage → events.by. Anne şu an babanın hesabıyla giriş yapmış durumda (aynı hesap, sorun yok).
Görünüm/kullanışlılık: durum paneli, otomatik açık/koyu tema (08-20), ipucu kartı, şerit filtresi,
serbest ml, WhatsApp davet, @layer components (utility'ler .btn'i ezebilsin).
Araç: scratchpad/cdp.mjs — headless Edge'e DevTools protokolüyle bağlanıp konsol + ekran görüntüsü;
`--dump-dom --timeout` IndexedDB'yi beklemiyor, güvenilmez. Yerel bulutsuz derleme: dexie-cloud.json'u
geçici taşı + `?demo=1&tab=..&theme=..&notips&profile` parametreleri (seed.ts).
Kaynak arşivi BILGE/kaynaklar/ (Bakanlık protokolü PDF+txt, WHO CSV). Sonraki adaylar md §15.

2026-09-14 gece: Onay penceresi (lib/confirm.tsx: ask() + ConfirmHost; Ayarlar "Onay iste" cihaz
ayarı; varsayılan onaylı: Uyandı, D vitamini [20 saat içinde ikinci doz kırmızı uyarı]); "Çıkış yap"
(push sync → logout force → FamilyLogin). Gelişim kartı (features/milestones): CDC 2022 listesi
2/4/6/9/12 ay Türkçe (milestones.ts), Bakanlık GİDR dönem notları 0-4/4-8/8-12, Kayıt ekranında
katlanır kart + Profil'de tüm aylar; tablo milestones (şema v5). cdp-click.mjs: tıklayıp ekran görüntüsü.
Sıradaki adaylar: uyku penceresi tahmini (2. ay), beyaz gürültü, aile hekimine PDF özet, kaka rengi kartı.
2026-09-14: Aile hekimi raporu (features/report/Report.tsx; Özet sekmesinden; window.print + metin paylaş;
ortalamalar kayıtlı gün sayısına bölünür) ve uyku sesi çalar (features/noise/WhiteNoise.tsx; WAV tarayıcıda
üretilir, <audio loop> + Media Session, 15/30/60/sürekli). 41. gün izlemi 20 Eylül 2026.
Kalan adaylar: uyku penceresi tahmini (2. ay), kaka rengi kartı, Android kamera düğümü, baba paneli/EPDS.
2026-09-14: Kaka rengi kartı (features/stool): 7 renk (1-3 soluk=uyarı), kaka kaydından sonra 25 sn
şerit, EditEvent'te seçim, fotoğraftan Lab en-yakın öneri (yardımcı), Şerit'te "renk n ⚠", raporda
"Kaka rengi — dikkat" bölümü. events.stoolColor alanı.
Kalan adaylar: uyku penceresi tahmini (2. ay, ~10 Ekim), Android kamera düğümü, baba paneli/EPDS,
Kayıt ekranı buton sırası ayarı.
2026-09-14: Ayarlar → "Deneme verilerini sıfırla" (DataReset: kayıtları sil / her şeyi sıfırla, 2 onay,
QStash hatırlatmaları iptal) ve "Kayıt ekranı düzeni" (LayoutSettings + log/layout.ts: blok gizle/sırala,
cihaz ayarı; QuickLog blok haritasıyla render). Kullanıcı gerçek kullanıma geçmeden deneme verisini silecek.
2026-09-14: Uyku penceresi tahmini (features/sleep/sleepWindow.ts: yaş bandı [Huckleberry ilk yıl] +
son 5 gün uyanıklık medyanı ≥5 örnekle; StatusPanel'de önce/içinde/geçti şeridi, "geçti" en fazla 2 sa).
Kullanıcı aile kodunu sordu → <eski kod> hatırlatıldı; değiştirmek isterse FAMILY_CODE env + redeploy.
Kalan: Android kamera düğümü, baba paneli/EPDS, gece kullanım geri bildirimi.
2026-09-14: Görsel yenileme v2 ("amatör" geri bildirimi üzerine): lib/icons.tsx (SVG çizgi ikon seti +
Chip), ActionTile (ikon çipi + başlık + alt yazı), section-title/hero-num/label sınıfları, SVG'li alt menü,
avatar halkası + tarih; Timeline satırları çipli. Emoji sadece uyku sesi seçeneklerinde kaldı.
Ekran görüntüleri BILGE/kaynaklar/ekran-kayit-*.png. Kullanıcı "sıradan devam" dedi → sonraki: baba paneli.
2026-09-14: Ayrıştırıcı v2 (parseTurkish: "X dk önce" zaman kaydırma, virgül/buçuk ondalık, "biberon 80",
aşı; 24/24 test; VoiceInput örnek çipleri). Rakip kıyaslaması md §16-19 (özellik matrisi, iyi/kötü yanlar,
eylem listesi: 1 pompa+süt stoku, 2 URL kısayol [YAPILDI: quickAct.ts ?act=…], 3 anne paneli/EPDS,
4 serbest ilaç+doz, 5 ek gıda, 6 ikinci bebek, 7 baba paneli, 8 Android kamera).
2026-09-14: Yeni uygulama ikonu (Pillow ile; lacivert gradyan + turuncu hilal + yıldız; public/*.png).
Süt sağma + stok (features/milk: event type "sagma", store dolap/dondurucu/taze; biberon bottleKind sut/mama;
FIFO stok, dolap>4 gün / dondurucu>6 ay uyarısı; Kayıt bloğu "sagma", Şerit/Düzenle/Rapor/parser desteği).
Kullanıcı: App Store'da "normal uygulama" istedi → Capacitor+99$/Mac gerektiği için ertelendi;
kestirme/widget zorunlu değil, bırakıldı. Sonraki: anne paneli (EPDS), serbest ilaç+doz, ek gıda.
2026-09-14: Anne paneli (features/mother): Kayıt'ta "Anne · nasılsın?" bloğu → tam sayfa: ruh hali 1-5,
su +1, gece uykusu 3/5/7, ilaç (motherLog, senkron) + 14 gün özeti; EPDS 10 soru (epds.ts, TR kesme 13,
madde 10 uyarısı) — epds tablosu unsyncedTables (yalnız cihazda). Şema v6.
Kalan: serbest ilaç+doz hatırlatma, ek gıda/alerjen (6. ay), baba paneli (nöbet/gider), Android kamera.
2026-09-14: İlaç kürleri (features/meds: meds tablosu şema v7; ad/doz/aralık 4-24 sa/süre veya gerekirse;
Kayıt bloğu "ilaclar": sonraki doz, kim/kaçta, erken doz uyarısı %85, kürü bitir; reminders med-<id>;
rapor "İlaçlar (30 gün)"). Bildirim yönetimi: Ayarlar→Bildirimler (cihaz aç/kapa, kurallar), takvim alarmı
iOS Takvim'den; erteleme/sessiz saat YOK (PWA sınırı / yapılmadı).
Kalan: ek gıda/alerjen (6. ay), baba paneli (nöbet/gider), Android kamera.
2026-09-14: Bildirimler kullanıcının iPhone'unda DOĞRULANDI ("çalışıyor"). Baba paneli (features/father:
gece 23-06 kalkış sayısı anne/baba etiketinden, bu gece nöbetçi baby.nightShift, annenin dün gece uykusu,
gider defteri expenses tablosu şema v8). Değerlendirme kartı (stats/Assessment.tsx, Özet üstünde): beslenme
≥8/24sa, ıslak bez ≥6 (ilk 5 gün gün sayısı), kaka, uyku 14-17, kilo ≥20 g/gün (ilk 5 gün kayıp normal),
D vit, ateş; "veri yok" durumu — geçmiş veri gerekmez. Kullanıcı: bebek "4 günlük" dedi (sıfırlayıp yeni
doğum tarihi girmiş olabilir; bulutta önce 9 Eylül vardı).
Kalan: ek gıda/alerjen (6. ay), Android kamera, sessiz saatler (istenirse).
2026-09-14: Değerlendirme v2 (Assessment.tsx): 4 durum iyi/izle/dikkat/veri-yok; "dikkat" yalnız AAP/WHO/SB
eşiklerinde (ıslak bez gün kuralı, kilo kaybı >%10, 14. günde dönüş yok, g/gün hedefin %70 altı [≥5 gün aralık],
ateş yaşa göre 38.0/38.3/38.9 + <36 hipotermi, soluk kaka, D vit 5/7 altı, kaka 48 sa yok <4 hf, beslenme ≤5);
kaynaklar listesi ekranda. Kayıt'ta "Ölçüm" bloğu (MeasureForm export). Fotoğraf capture kaldırıldı (galeri).
Kullanıcı kararı: kamera/Android düğümü İPTAL. Sağlık içeriğinde yanıltıcı olmama önceliği (feedback).
2026-09-14: Bilgi tabanı turu (kullanıcı önerisi: "kaynak bul, ders çıkar"): BILGE/kaynaklar/bilgi-tabani.md
(SB protokol, TND sarılık rehberi [pdf+txt], AAP bez/beslenme/kilo/güvenli uyku/kolik, NICE NG194 kırmızı
bayraklar, WHO, CDC, EPDS). Uygulanan dersler: Sarılık takibi kartı (features/jaundice, ilk 28 gün, Kramer
bölgeleri, taburculuk saatine göre 72/96/120 sa kontrol, event type "sarilik", baby.dischargeAt), Bilgi
kartları (features/info: acil işaretler NICE, güvenli uyku AAP, ağlama/kolik). Değerlendirmeye sarılık satırı.
Açık dersler: aşı sonrası ateş notu, ek besin (WHO 2023), hipotermi/hipoglisemi, aşı PDF doğrulama.
2026-09-15 gece: 5. tur (öğren→öğret→geliştir): resmi SB aşı kartı 2026 (kaynaklar/sb-asi-karti-2026.pdf,
1 Eylül 2026 güncellemesi) ile takvim düzeltildi: 9. ay KKK ek doz, 48. ay Suçiçeği 2, 13 yaş Td. WHO 2023
tamamlayıcı beslenme 7 önerisi notlandı (ek gıda modülü için). Yazılım: Vitest 28 test (parser, uyku penceresi,
süt FIFO, persentil, EPDS, milestone), build script test+tsc+vite; React.lazy kod bölme; manifest id/shortcuts;
Dynamic Type (font: -apple-system-body); .bar-glass yarı saydam çubuklar; vercel.json güvenlik başlıkları.
Araç: PyMuPDF (fitz) ile PDF→PNG render (pdftoppm yok). Notlar md §20-22.
2026-09-15: Durum panelinde günlük hedef halkaları (lib/Ring.tsx: beslenme/ıslak bez/uyku, yaşa göre hedef);
Ek gıda modülü (features/solids: 5,5 aya kadar geri sayım + hazırlık işaretleri + WHO 2023 özeti; sonra besin
kaydı event "ekgida" food/reaction, alerjen tanıtım takibi, tepki uyarısı); VoiceInput'ta mikrofon düğmesi
(webkitSpeechRecognition tr-TR, hata → klavye diktesi ipucu). iOS'ta Türkçe tanıma çalışıp çalışmadığı
kullanıcıdan teyit bekliyor.
2026-09-15 KRİTİK: Dexie Cloud aile kullanıcısı "eval" tipindeydi (30 aktif gün sonra senkron durur; 13 gün
kalmıştı). REST API (/token scopes ACCESS_DB+GLOBAL_READ+GLOBAL_WRITE, POST /users type "prod") ile ÜRETİM
kullanıcısına çevrildi (ücretsiz katman 3 prod koltuk, 100 MB, 10 eşzamanlı bağlantı). Yeni kullanıcı
eklenirse (ikinci hesap vb.) aynı işlem gerekir. Limitler: 100 MB (fotoğraflar 900px JPEG ~100 KB),
10 bağlantı, 50 istek/5 dk/kullanıcı.
2026-09-15: Kullanıcı "bilgi boğulması yeter, kullanılabilirlik" dedi → Kayıt ekranı 3 bölme (layout.ts
Segment: hizli [emzirme/biberon/bez/uyku/ates-dvit/ses] · bakim [sarilik/ilaclar/olcum/sagma/ekgida/gelisim/
uykusesi/bilgi] · aile [anne/baba]); durum paneli yalnız Hızlı'da; seçim localStorage. Yeni içerik/özellik
eklemeden önce kullanılabilirlik öncelikli (feedback).
2026-09-15: Güvenlik: /api/remind artık imzalı oturum çerezi ister (api/_lib/session.ts, HMAC
DEXIE_CLIENT_SECRET, 400 gün; /api/token başarılı girişte Set-Cookie; public_key:"session-only" ile yalnız
çerez). OTP döneminden kalan cihazlarda kod yoksa Ayarlar→Bildirimler'de kod girişi kutusu. Kaza: Python
patch'te virgül → NotifySettings.tsx boşaldı, yeniden yazıldı (ders: io.open('w') yazmadan önce s tipini
kontrol et). Kullanıcı sorusu: kopyalanmaya karşı koruma → cevap: istemci kodu görünür; sır sunucuda;
tek-aile mimarisi (çok aile için sunucu tarafı aile kaydı gerekir).
2026-09-15 sabah (gece kullanım geri bildirimi): (1) uyku sesi bölme değişince duruyordu → audioEngine.ts
tek örnek (Web Audio AudioBufferSource loop=true dikişsiz, 30 sn tampon, sessiz <audio loop> iOS oturum
tutucu, Media Session), NowPlaying şeridi alt menü üstünde; (2) kesilme = loop dikişi (bağlantı değil);
(3) bez: Islak→Çiş, İkisi→Çiş+Kaka, kaka şeridinde kıvam (normal/sulu/sert/kanlı⚠) + renk kartı, "Tamam";
(4) bildirim sesi: iOS'ta özel ses yok, sistem sesi (Ayarlar→Bildirimler→Bilge→Sesler); uygulama açıkken
chime.ts zil (Web Audio) + üst şerit. Deploy: ilk `vercel deploy` alias vermedi, ikinci denemede oldu —
her yayında canlı bundle hash'ini doğrula.
2026-09-15: "Gece alarm modu" (notify/alarmEngine.ts): sessiz <audio loop> tutucu ile uygulama arka planda
uyanık kalır, 15 sn'de bir reminders tablosu → zamanı gelince Web Audio sürekli bip (880/1320 Hz) + tam ekran
Durdur / 10 dk ertele + Media Session; 90 sn sonra susar; sayfa yenilenince "yeniden aç" şeridi (iOS ses
kuralı: kullanıcı dokunuşu şart). Ayarlar→Bildirimler'de anahtar + deneme alarmı; NowPlaying şeridinde durum.
Mod kapalıyken eski davranış (uygulama açıkken kısa zil). Kullanıcının gece testi bekleniyor.
2026-09-15: (a) Demo modu: `?demo=1` → localStorage bilge.demo=1, bulut kapalı, DB "bilge-demo", seed
"Demo Bebek" + gider/anne/ilaç örnekleri; DEMO rozeti; Ayarlar'da "Demo'dan çık". Doktora/arkadaşa
demo linki: https://bilge-omega.vercel.app/?demo=1 (aile kodu VERİLMEZ). Kullanıcı kendi telefonunda
açmamalı (açarsa Ayarlar→Demo'dan çık). (b) api/_lib/dexie.ts: sunucu REST (client_credentials GLOBAL_READ/
WRITE) → api/takvim dinamik hatırlatmalar (reminders+meds → VEVENT, no-cache; uygulama kapalıyken iPhone
Takvim alarmı; kullanıcı Takvim hesabı yenilemeyi 15 dk yapmalı). (c) Giriş günlüğü: api/token → logins
tablosuna (cihaz, şehir x-vercel-ip-city, ip son oktet maskeli); Family'de "Son girişler". NOT: logins
tablosu bulutta ancak bir istemci v9 ile senkronlayınca oluşur (REST 422 "primary key not known" o zamana kadar).
2026-09-15: Git deposu BILGE/ kökünde başlatıldı (main, user erdinc19745@gmail.com; .gitignore ile
app/dexie-cloud.*, .env.local, node_modules, dist, .vercel dışarıda). GitHub: kullanıcı erdinc19745-sketch,
gh CLI yok, credential manager var. 2026-09-15: depo https://github.com/erdinc19745-sketch/bilge (private)
açıldı, origin eklendi, main gönderildi (710bc39). NOT: `git push` otomatik mod sınıflandırıcısı tarafından
"Out-of-Place Publication" diye ENGELLENİYOR → commit'i ben yaparım, push'u kullanıcı VS Code terminalinde
tek satır `git push` ile yapar (iki satır yapıştırınca PowerShell `>>` devam satırı sanıp hata verdi).
Onboarding turu (features/onboarding, localStorage bilge.onboarded, 3 slayt, son → Bakım/Ölçüm), başlıkta
senkron noktası (syncState$), Ring aria-label, yedek hatırlatma (bilge.lastBackup/firstUse, 30 gün), Tips kaldırıldı.
2026-09-14 sabah (kullanıcı testi): takvim 15 dk ✓; "Deneme alarmı" kilitliyken tek bildirim gibi tek bip çaldı
→ neden: alarm Web Audio osilatörüyle çalıyordu, iPhone kilitlenince Web Audio susar, yalnız <audio> sürer.
Düzeltme: alarm WAV'ı üretilip tutucu <audio> elemanının src'si sessizden alarma çevriliyor (müzik uygulaması
tarzı), 30 sn deneme düğmesi, 2 dk sus + 3 dk sonra tekrar (2 kez), cihazda tanı günlüğü (bilge.alarmLog,
Ayarlar→Bildirimler→"alarm günlüğü"). Kullanıcı testi bekleniyor; çalmazsa günlüğü istet.
Mikrofon: iOS ana ekran PWA'da webkitSpeechRecognition çalışmıyor → "Söyle" düğmesi kutuyu odaklayıp klavye
diktesini tarif ediyor (Android'de tanıma sürüyor). Giriş günlüğü boştu: tablo bulutta var ama iki telefon
günlükten önce girmişti; artık yalnız cihaz başına ilk giriş (first:true) yazılır (saatlik token yenilemesi değil).
Ayarlar sadeleşti: bebek özet satırı + Düzenle (put→update hatası düzeltildi: kurallar/nöbet siliniyordu),
Kısayollar kartı kaldırıldı (kullanıcı "eski kalmış" dedi), düzen listesi katlanır, sürüm damgası __BUILD__
(vite define; Ayarlar altında "sürüm 14 Eyl 08:55" — canlı yayını telefondan doğrulamak için).
Hatalar: biberon serbest ml onBlur çift kayıt → Kaydet düğmesi; new Date("YYYY-MM-DD") UTC → parseISO (22 yer);
push kapalıyken reminders boş kalıyordu → artık yerel (msgId "") yazılır. Commit 77b8067 (push kullanıcıda).
Kullanıcı tarzı: "gereksiz kısımları" kendim bulmamı ve hata taraması yapmamı istiyor.
2026-09-14: Alarm <audio> yolu kullanıcıda ÇALIŞTI ("çaldı ses de geliyor"). Kullanıcı: alarm seçenek olmamalı,
kapatıp açınca kapanmasın → varsayılan AÇIK (localStorage "0" değilse), sayfa yenilenince uygulamadaki ilk
dokunuş (document click capture) modu yeniden kurar (autoArmOnFirstTap); demo modunda kapalı. Not: tutucu
sessiz ses iOS ses oturumunu alır → Bilge açıkken başka uygulamanın müziği durur (kabul edilen bedel).
"Uygulama kapalıyken çalar mı?" → iOS web uygulaması kapalıyken sürekli alarm İMKÂNSIZ; yerine tekrarlı push
"salvo": beslenme/uyku/ilaç hatırlatması 0·1·3 dk 3 bildirim (api/remind repeat[], msgId virgüllü çoklu,
cancel hepsini siler), uygulama öne gelince syncReminders (focusTick) geçmiş hatırlatmayı iptal eder → kalan
tekrarlar durur. D vit tek bildirim. Commit 4f61984 (push kullanıcıda). Sürüm damgası 14 Eyl 09:0x.
2026-09-14 (devam): Akıllı kurallar: uyurken emzirme/biberon/bez/ek gıda girilirse uyku o anda biter
(db.addEvent → wakeIfSleeping, consumeAutoWake → toast "· uyandı (X uyudu)", Geri al uykuyu da açar);
emzirirken "Sağa/Sola geç" kutusu; emzirirken "Uyudu" emzirmeyi de bitirir. Kilit ekranı canlı durum kartı:
alarm modu açıkken Media Session başlığı 15 sn'de bir "Uyuyor 1 sa 20 dk / Sonraki beslenme ~02:30 · Bilge"
(notify/lockStatus.ts). Sabah özeti kartı (log/MorningCard.tsx, 06-12, dün 23-06: beslenme/bez/uyku/en uzun/
kim kalktı, günde bir "tamam"). Commit e2f7627 (push kullanıcıda). Kullanıcı "daha neler yapılabilir" diye
inisiyatif istiyor; sonraki adaylar: toast'a "−10 dk" zaman kaydırma, Şerit'te geçmişe emzirme ekleme,
sessiz saatler, aşı sonrası ateş notu, Android Chrome testi, Capacitor/App Store (99$/yıl).
2026-09-14 (devam 2): Kullanıcı "geç durduruyorum, 27 dk'yı 15'e çekmem lazım" → log/AdjustCard.tsx: emzirme/uyku
bitince süre çipleri (5/10/15/20/30/45 + −5/+5), başlayınca "−5/−10/−15/−30 dk önce başladı" çipleri, 30 sn
ya da Tamam. Şerit'te "Geçmiş" düğmesi → log/AddPast.tsx (tür, saat, süre/ml). Sesli alarm saatleri
(reminders.alarmFrom/To, inAlarmHours testli; dışında kısa zil + şerit; state.loud). HATA düzeltildi: mod
kapalıyken zil sonrası ringing hiç temizlenmiyordu → sonraki hatırlatmalar çalmıyordu (60 sn'de temizlenir).
calendar/VaccineCard.tsx: aşı "yapıldı" sonrası 48 sa kart (SB Aşı Portalı + AAP; BCG notu; 3 aydan küçükte
≥38 °C vurgusu) + "Ateş ölçtüm" kısayolu. 31 test. Commit b6ca76d (push kullanıcıda). Heredoc >8 KB yine
kesildi → uzun yamalar Write tool ile scratchpad .py.
2026-09-14 (devam 3): Kullanıcı "sesli komut geliştirilmeli, çok tıklama var" → log/VoiceSheet.tsx: Kayıt
ekranında yüzen 🎤 (FAB, alt sağ) → alt sayfa; iPhone'da kutu DOKUNUŞ İÇİNDE odaklanır (klavye+dikte açılır;
kutu hep DOM'da, translateY ile gizli — visibility:hidden odaklamayı bozar), Android'de SR doğrudan. Yapılandırılmış
komut 2 sn değişmeyince KENDİLİĞİNDEN kaydolur (ilerleme çubuğu, ✕ iptal); not tıklama ister. parseTurkishMulti
("ve", ",", "sonra", "ayrıca"), yeni komutlar: bitti, sağa/sola geç, mama N, sağma N, "37,8". ?say=<metin> →
tek Siri kısayolu ("Metni Dikte Et" → "URL Aç"; Safari'de açılır, orada da aile kodu gerekir) — rehber sayfada.
Eski VoiceInput.tsx silindi; "ses" bloğu düzenden çıktı. 35 test. Commit 85910c7. Vercel deploy bir kez
"Not authorized" verdi → tekrar denemede oldu (canlı hash doğrulanmalı).
2026-09-14 (devam 4): Kullanıcı "kelimeleri yutarsam ne olacak" → parseTurkish: has(t, stems) bulanık eşleme
("~kök" = 4+ harfte 1 hata; düz kök = tam önek; "kaka"→"kadar", "demir"→"demin", "bitti"→"gitti" yanlış
pozitifleri yüzünden bunlar tam), joinSplits ("sağ dan", "de vitamini"), eş anlamlılar; feedEnd süre varsa
tetiklenmez. VoiceSheet: anlaşılmayan cümleler bilge.unparsed (15) → "kopyala" ile bana gönderir. 37 test.
Commit (parser tolerance). DERS: Bash inline heredoc'ta `\` tek `\`'a iniyor (python string'e backspace/newline
oluyor) → backslash içeren yamalar Write tool ile scratchpad .py + PYTHONUTF8=1.
2026-09-14 gece (komple tarama): Aile bölmesi dolduruldu (father/FamilyStatus "Kim ne zaman" + MorningCard
always "Dün gece" + rapor kutusu; blok "ailedurum"); Takvim emoji→SVG çip (syringe/microscope ikonları eklendi);
--danger token (.text-danger; text-red-300 açık temada okunmuyordu); DayBar şimdi çizgisi; Düzenle'de süre satırı;
Şerit'te rol etiketi. ÖNEMLİ: SW registerType "prompt" + sw.ts skipWaiting yalnız SKIP_WAITING mesajıyla →
uygulama gece açıkken kendi kendine yenilenmez (alarm modunu düşürüyordu); App'te "Yeni sürüm hazır · yenile" pili
(window.__bilgeUpdate). ErrorBoundary (lib/ErrorBoundary.tsx, bilge.lastError). Giriş ekranı: iOS Safari'de
"önce ana ekrana ekle" kartı, ikon çipi. Unutulmuş kronometre ipuçları (emzirme >1 sa, uyku >6 sa).
Push cihaz adına rol eklendi ("iPhone (Anne)"). Commits 4e0640e, e6e3863 (push kullanıcıda).
2026-09-15 00:00 VİZYON KARARLARI (kullanıcı): "bir gün başkasına da verilebilir" → tek aileye kilitleyen karar
alma; çok-aile (sunucu tarafı aile kaydı, Dexie free 3 üretim kullanıcısı = 3 aile) ilk gerçek talepte yapılacak;
KVKK özel nitelikli veri notu o zaman. "Anne için her şey önemli"; annenin gece derdi: "programa girip düğme
aramaya üşenirim" → GECE EKRANI yapıldı (log/NightScreen.tsx: siyah OLED, dev saat+durum, dev Sol/Sağ-Bitir,
Çiş/Kaka, Uyudu/Uyandı, 🎤, büyük GERİ AL; başlık 🌙 ile ya da 21-09 arası alarm modu açıkken 2 dk dokunulmazsa
otomatik; ConfirmHost z-60). Sıradaki plan: uygulama içi geri bildirim kutusu (anne → aile bulutu → ben REST'ten
okurum), anne izlem takvimi (SB lohusa izlemi, kaynaklı), emzirme rahatlığı/ağrı takibi, 9 Ekim "1 aylık" hatıra
kartı, 3 hafta veri sonrası öngörü. Beşik düğmesi/oda sensörü (ESP32) kullanıcının uzmanlığı — cevap vermedi, rafta.
2026-09-15: Kullanıcı saha/donanım fikirlerini REDDETTİ ("buton muton yapamayız, vardiya ne, saçmalama") →
sadece uygulama içi, rakip odaklı geliştirme. Rakip taraması 6. tur md §23 (Robin Baby sesle+soru-cevap,
Nara, Pebbi, Tottli, Huckleberry; TR: Mutlu Bebek vb. — hiçbirinde SB takvimi/izlem yok). Eksik listesinden
yapılanlar: askTurkish.ts (soru-cevap: son/sonraki beslenme, sıra, bez sayısı, uyku, D vit, ilaç, ateş, kilo,
yaş, özet; VoiceSheet'te cevap kutusu + 🔊 speechSynthesis tr-TR; mikrofonla sorulursa sesli okur; ?say= de
cevaplar), care/SymptomBlock.tsx (belirti çipleri + NICE dipnotu; rapora "Belirtiler (7 gün)"), care/
ActivityBlock.tsx (karın üstü dk çipleri AAP notu, banyo, dışarı), parser belirti/aktivite komutları, CSV dışa
aktarma (UTF-8 BOM, ';'). Event tipleri: belirti (symptoms[]), aktivite (activity). 45 test. Commit fc47bf8.
Kalan eksikler: widget/Watch/Live Activity (yalnız native), çoklu bebek (çok-aile ile), pompa zamanlayıcı.
Vercel deploy "Not authorized" ara sıra → tekrar dene.
2026-09-15: Görsel/hareket turu: Kayıt bölme seçici kayan turuncu yastık (.seg/.seg-ind) + sağa/sola KAYDIRMA ile
bölme değişimi + içerik slide-l/r; Özet'te uyku ısı haritası (stats/SleepHeatmap.tsx, 14 gün × 24 sa, SVG W=360);
çubuklar alttan büyür (.bar-grow), büyüme çizgisi çizilir (.draw-line); Şerit gün başlıkları sticky; Suspense
iskelet (.skeleton); prefers-reduced-motion desteği. Araç: scratchpad/cdp-scroll.mjs (main'i kaydırıp ekran görüntüsü).
Commit 950aa51 (push kullanıcıda).
2026-09-19 gece: BILGE iki PC'li düzene alındı (`2pcentegre/yeni-proje.ps1 -Ad bilge`): bare repo PC-B'de
`C:\Users\erdin\bilge.git`, PC-A remote `2pc` (GitHub `origin` ayrı, kullanıcı push eder), PC-B çalışma kopyası
`C:\Users\erdin\projeler\bilge` (npm ci yapıldı, 45/45 test yeşil; dexie-cloud.* yok → yerel mod; deploy yalnız PC-A).
Repo köküne AJAN-KURALI.md (BILGE'ye özel: npm test doğrulama, sağlık içeriği temkini, deploy/push yasakları),
GOREV.md (iş panosu), CLAUDE.md/AGENTS.md işaretçileri eklendi; `core.autocrlf false` iki tarafta.
Codex ilk tarama yaptı (commit e5184fc): GOREV.md "Adaylar" 10 madde — en önemlileri: meds tooEarly %85 eşiği
PRN metniyle çelişiyor (kaynak gerek), Report.tsx:85 `zScore ?? 0` hesaplanamayan persentili P50 gösteriyor,
reminders.ts:88 msgId "" abonelik açılınca sunucuda zamanlanmıyor, Weekly.tsx:23 gece yarısını aşan uyku
bugüne sayılmıyor, ölü kod minutesSince/inviteMember, yaş hesabı 4 yerde tekrar. Kullanıcı seçimi bekleniyor.
Codex'e iş: `is-ver.ps1 -Proje bilge -Kime codex -Dosya gorev-codex.md -Baslik "..."` (bkz. [[2pcentegre-topoloji-ve-karar]]).
