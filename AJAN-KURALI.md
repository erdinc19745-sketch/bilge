# Ajan çalışma kuralı — Claude Code ve Codex için ortak

Bu repoda iki ajan çalışır: **Claude Code** (PC-A, 192.168.1.26) ve **Codex** (PC-B, 192.168.1.23).
Birbirinizin hafızasını göremezsiniz. Tek ortak hafıza: **bu repo + `GOREV.md`**.
Kullanıcı Türkçe konuşur; ona Türkçe yaz. Commit mesajları İngilizce.

## Başlarken
1. `GOREV.md` oku. "Sıradaki adım" boşsa iş bitmiş demektir — kullanıcıya sor, kendin iş uydurma.
2. `git status` / `git log -5`. Kirli ağaç varsa diğer ajan yarım bırakmıştır: **silme, üstüne yazma**, ne yaptığını anla ve oradan devam et.
3. `GOREV.md`'deki **Doğrulama** komutunu çalıştır; mevcut durumu gör (kırmızı mı, yeşil mi).

## Çalışırken
- Küçük adım, sık commit. Her commit tek konu. Mesaj başında etiket: `[claude]` ya da `[codex]`.
- Her commit'ten sonra `GOREV.md`: "Tamamlananlar"a satır ekle (commit hash ile), "Sıradaki adım"ı güncelle.
- Yarım bırakacaksan (kota bitti, takıldın, hata): **WIP commit at** + `GOREV.md` → "Yarım kaldı" bölümüne ne olduğunu yaz. Sessizce ölme.
- Doğrulama komutu sen başlamadan yeşilse, bitince de yeşil olmalı. Kırmızıysa önce onu düzelt ya da "Yarım kaldı"ya yaz.

## Bitirince
- `GOREV.md`: "Sıradaki adım" boş, Doğrulama çıktısının son satırı yapıştırılmış, "Son güncelleyen" satırı senin.
- Son mesajın 5 satır: ne yaptın, ne doğruladın, ne kaldı, hangi commit'ler.

## Yapma
- `GOREV.md` formatını değiştirme (diğer ajan aynı yerleri arıyor).
- Diğer ajanın commit'lerini rebase/squash/amend etme.
- Doğrulama komutunu değiştirme — onu kullanıcı belirler.
- `GOREV.md`'de olmayan bir işe girişme; "iyileştirme" görürsen "Sıradaki adım"a öneri olarak yaz, yapma.
