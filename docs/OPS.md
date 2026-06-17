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
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Rate limit (serverless) |
| `NEXT_PUBLIC_SENTRY_DSN` | Hata izleme |
| `SMTP_EMAIL` + `SMTP_PASSWORD` | Trial hatırlatma e-postası |
| `TURNSTILE_SECRET_KEY` + site key | Başvuru CAPTCHA |
| `CRON_SECRET` | Trial cron koruması |
