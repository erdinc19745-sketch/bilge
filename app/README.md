# Bilge — bebek takip defteri (PWA)

Telefonda çalışır, internet gerektirmez, veri telefonda durur.

## Çalıştırma
```
npm install
npm run dev        # sadece bu bilgisayarda: http://localhost:5173
npm run dev:lan    # aynı Wi-Fi'daki telefondan test: http://<PC-IP>:5173
npm run build      # dist/ üretir (Vercel / Cloudflare Pages'e yüklenir)
```

## iPhone'a kurma
Yayınlanmış adresi Safari'de aç → Paylaş → **Ana Ekrana Ekle**. Böylece tam ekran açılır,
çevrimdışı çalışır ve bildirim izni istenebilir.

## Yapı
- `src/db/` — Dexie (IndexedDB) şeması ve yardımcılar. `events` tablosu her şeyi tutar.
- `src/features/log/` — Gece modu kayıt ekranı (QuickLog) ve zaman şeridi (Timeline).
- `src/features/calendar/` — Türkiye aşı + aile hekimi izlem takvimi (`schedule.ts` veri, `Calendar.tsx` ekran).
- `src/features/settings/` — Bebek bilgisi, JSON yedek al / geri yükle.

- `src/features/stats/` — Haftalık özet (SVG çubuk grafikler, doğrulanmış palet).
- `src/features/growth/` — WHO 0-24 ay LMS tabloları (`who.ts`), z-skor/persentil (`percentile.ts`), eğri ekranı.
- `src/features/profile/` — Avatar + aylık albüm (fotoğraf telefonda küçültülür, Dexie'de Blob).
- `src/features/notify/` — Web Push: abonelik (`push.ts`), hatırlatma motoru (`reminders.ts`), ayarlar.
- `src/features/log/parseTurkish.ts` — Türkçe cümle → kayıt (klavye diktesi için).
- `api/takvim.ts` — iPhone Takvim aboneliği (.ics, webcal://), `api/remind.ts` + `api/push.ts` — QStash ile zamanlanmış push.
- `src/sw.ts` — service worker (önbellek + push/notificationclick).

## Ortam değişkenleri (Vercel → production)
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (kurulu) · `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (Upstash'ten).
İstemci: `.env.production` → `VITE_VAPID_PUBLIC_KEY`.

## Yayın
`npx vercel build --prod --yes` → `npx vercel deploy --prebuilt --prod --yes` (yerel derleme şart: dexie-cloud.json gitignore'da).

Araştırma ve yol haritası: `../00-arastirma-ve-fikirler.md`
