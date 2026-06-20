# AURA İntegra — Operasyonel Prosedürler

## Yedekleme (Supabase)

- **Günlük yedek:** Supabase Dashboard → Database → Backups (Pro plan PITR önerilir)
- **Manuel dump:** `pg_dump` veya Supabase CLI `db dump`
- **Restore:** Yeni branch oluştur → dump import → DNS/Vercel env doğrula

## Uptime izleme

- Endpoint: `https://integra.aurabilisim.net/api/health/supabase`
- Beklenen: `{ "ok": true }` ve `env.ok === true` (dev)

## Webhook hataları

- Tablo: `webhook_failures`
- Admin API: `GET /api/admin/webhook-failures`
- Stripe `invoice.payment_failed` → tenant `payment_overdue`

## Destek SLA

- E-posta: destek@aurabilisim.net
- Kritik (giriş/sync): 4 saat iş günü
- Normal: 24 saat iş günü

## Vercel ortam değişkenleri

- Proje: `aura-integra-912o`
- **Production + Preview + Development** ortamlarına Supabase key'leri ekleyin
- `vercel env pull` Development boşsa `.env.local` silinir — `npm run env:pull` (production) veya `npm run env:setup` kullanın

## Genel satış için zorunlu env

| Değişken | Amaç |
|----------|------|
| `STRIPE_SECRET_KEY` (sk_live_) | Online ödeme |
| `STRIPE_WEBHOOK_SECRET` | Abonelik uzatma |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Rate limit (login, başvuru, takip) |
| `TURNSTILE_SECRET_KEY` | Başvuru CAPTCHA secret (Cloudflare → Turnstile → Secret Key) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **veya** `TURNSTILE_SITE_KEY` | Site key — **ikisi de Production ortamında** olmalı; hostname: `integra.aurabilisim.net` |
| `NEXT_PUBLIC_SENTRY_DSN` | Hata izleme |
| `SMTP_EMAIL` + `SMTP_PASSWORD` | Trial / ödeme hatırlatma e-postası |
| `CRON_SECRET` | Cron koruması (trial, ödeme, randevu) |
| `NEXT_PUBLIC_APP_URL` | Magic link redirect — prod: `https://integra.aurabilisim.net` |

## E-posta otomasyonu (cron)

| Endpoint | Zamanlama | Açıklama |
|----------|-----------|----------|
| `GET /api/cron/trial-reminders` | 09:00 günlük | Deneme bitişine 7/3/1 gün kala |
| `GET /api/cron/payment-reminders` | 10:00 günlük | Vadesi yaklaşan + gecikmiş ödemeler |
| `GET /api/cron/churn-interventions` | 11:00 günlük | Düşük health skoru — otomatik e-posta |
| `GET /api/cron/appointment-reminders` | 18:00 günlük | Yarınki randevu SMS |

Admin panel: **Operasyon → Zamanlanmış Görevler** — manuel tetikleme.

Manuel test: `curl -H "Authorization: Bearer $CRON_SECRET" https://integra.aurabilisim.net/api/cron/payment-reminders`

Admin ayarları → Bildirim → **Ödeme Hatırlatma (kaç gün önce)** cron gün sayısını belirler.

## Magic link (bayi panele giriş)

1. Vercel: `NEXT_PUBLIC_APP_URL=https://integra.aurabilisim.net`
2. Supabase Auth → URL Configuration → Site URL aynı domain
3. Redirect URLs: `https://integra.aurabilisim.net/**`
