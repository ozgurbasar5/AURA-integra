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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **veya** `TURNSTILE_SITE_KEY` | Site key — Production ortamında zorunlu |
| Cloudflare Turnstile hostname | `integra.aurabilisim.net` (widget boş kalırsa burayı kontrol edin) |
| Cloudflare Turnstile widget modu | **Interactive** (Managed + `interaction-only` boş kutu yapabilir) |
| `NEXT_PUBLIC_SENTRY_DSN` | Hata izleme |
| `SMTP_EMAIL` + `SMTP_PASSWORD` | Trial / ödeme hatırlatma e-postası |
| `SMTP_HOST` + `SMTP_PORT` | Turk Ticaret: `smtp.turkticaret.net:465` (SSL) veya `:587` (STARTTLS) |

Lokal SMTP test: `npm run test:smtp` (alıcı opsiyonel: `npm run test:smtp -- siz@email.com`)
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

## Cloudflare Turnstile (başvuru CAPTCHA)

1. Cloudflare Dashboard → Turnstile → ilgili widget
2. **Hostname:** `integra.aurabilisim.net` (Preview için gerekirse `localhost`)
3. **Widget Mode:** Managed yerine **Interactive** (Always visible) — boş kutu sorununu giderir
4. **Site Key** → Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY` veya `TURNSTILE_SITE_KEY`
5. **Secret Key** → Vercel `TURNSTILE_SECRET_KEY` (aynı widget satırından kopyalanmalı)
6. Değişiklik sonrası Vercel redeploy
7. Doğrulama: `GET /api/public/turnstile-config` → `siteKey` dolu, `required: true`

## TCMB döviz kurları

- Dashboard widget: `GET /api/tenant/fx-rates` (auth gerekli)
- Kaynak: `https://www.tcmb.gov.tr/kurlar/today.xml` — sunucu tarafında 1 saat cache
- USD / EUR / GBP alış-satış (banknot)

## Bekleyen Supabase migration'ları

Production SQL Editor'da sırayla çalıştırın (`npm run check:migrations` dosya listesini doğrular):

| Dosya | Amaç |
|-------|------|
| `20260620_basvuru_legacy_sync.sql` | Başvuru legacy kolon sync |
| `20260626_service_order_device_images.sql` | Cihaz fotoğrafları JSONB |
| `20260627_user_onboarding_flags.sql` | Sihirbaz/tur bir kez |
| `20260628_maturity_sprint.sql` | Storage bucket, e-Fatura kuyruk, AI kota tabloları |

Storage bucket oluşturulduktan sonra cihaz fotoğrafları URL olarak saklanır (base64 yerine).

## AI kota env

| Değişken | Amaç |
|----------|------|
| `GEMINI_API_KEY` | Google AI Studio API key (gemini-2.5-flash-lite) |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | AI rate limit (`/api/ai`) |

Detay: `docs/AI-COST-PLAN.md`

## E2E test

```bash
npm run test:e2e
# Opsiyonel: E2E_TEST_EMAIL, E2E_TEST_PASSWORD (auth akışları)
# Turnstile bypass: TURNSTILE_BYPASS_SECRET (test only)
```

## Magic link (bayi panele giriş)

1. Vercel: `NEXT_PUBLIC_APP_URL=https://integra.aurabilisim.net`
2. Supabase Auth → URL Configuration:
   - **Site URL:** `https://integra.aurabilisim.net` (localhost değil!)
   - **Redirect URLs:**
     - `https://integra.aurabilisim.net/**`
     - `https://integra.aurabilisim.net/auth/callback**`
     - `http://localhost:3000/auth/callback**` (yalnızca lokal geliştirme)
3. Lokal admin panelden link üretirken `.env.local` içinde `NEXT_PUBLIC_APP_URL` prod URL olmalı
4. Eski localhost linkleri çalışmaz — admin panelden yeni magic link oluşturun
