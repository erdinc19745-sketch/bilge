# Ajan çalışma kuralı — BILGE (Claude Code PC-A + Codex PC-B)

BILGE: Erdinç'in yenidoğan kızı için bebek takip PWA'sı (`app/`: Vite 7 + React 19 + TS + Tailwind 4 + Dexie 4 + Dexie Cloud + Vercel).
Kullanıcı Türkçe; ona Türkçe yaz. Commit mesajları İngilizce. Birbirinizin hafızasını görmezsiniz: **repo + `GOREV.md`** tek ortak hafıza.

## Başlarken
1. `GOREV.md` oku. "Sıradaki adım" boşsa kullanıcıya sor, iş uydurma.
2. `git status` / `git log -5`. Kirli ağaç = diğer ajan yarım bırakmış; silme, anla, devam et.
3. Doğrulama: `cd app && npm test` (vitest, ~45 test) — başlamadan yeşil olmalı, bitince de.

## Çalışırken
- Küçük adım, sık commit; mesaj başında `[claude]` / `[codex]`. Her commit'ten sonra `GOREV.md` güncelle.
- Yarım bırakırken WIP commit + `GOREV.md` "Yarım kaldı" satırı. Sessizce ölme.
- Tip kontrolü: `cd app && npx tsc -b --noEmit`. Build: `npm run build` (test+tsc+vite).
- **Sağlık içeriği**: teşhis yok, kaynaklı eşik (SB/AAP/WHO/NICE), "veri yok" dürüstlüğü, yanıltıcı olma. Var olan kaynak listesini bozma.
- **Kullanılabilirlik > yeni özellik** (kullanıcı kararı 15 Eyl). Gece kullanımı, az tıklama.

## Yapma
- `app/dexie-cloud.json`, `dexie-cloud.key`, `.env*` → **sadece PC-A'da**, gitignore'da. PC-B'de yok; PC-B yerel modda çalışır, buluta bağlanmaya çalışma.
- **Deploy (Vercel) yalnız PC-A'dan, yalnız kullanıcı isteyince.** Codex deploy yapmaz.
- `git push origin` (GitHub) yapma — kullanıcı yapar.
- `2pc` remote'u (LAN, diğer PC): `is-ver.ps1` ile gelen işlerde eşitleme otomatik. **Kullanıcı seninle sohbette çalışıyorsa** (VS Code
  Codex / Claude paneli) bitirince kendin yap: `git add -A; git commit -m "[codex] ..."; git push 2pc main` (Claude'da `[claude]`).
  Başlarken de `git pull --rebase 2pc main` — diğer ajanın son işi gelsin.
- `npm install <yeni paket>` yapma; gerekiyorsa `GOREV.md`'ye yaz.
- Diğer ajanın commit'lerini rebase/squash/amend etme. `GOREV.md` formatını değiştirme.

## Bitirince
- `GOREV.md`: yapılan → "Tamamlananlar" (commit hash), "Sıradaki adım" güncel, doğrulama çıktısının son satırı, "Son güncelleyen".
- Son mesajın ≤5 satır: ne yaptın, ne doğruladın (`npm test` son satırı), ne kaldı, commit'ler.
