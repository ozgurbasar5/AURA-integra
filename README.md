# AURA İntegra

Multi-tenant SaaS ERP for technical service shops and dealer networks.

## Architecture

- **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, RLS)
- **Client store:** `lib/store.ts` (localStorage) + debounced sync via `/api/tenant/sync|push`
- **Service orders:** Supabase-first via `/api/service-orders`

## Panels

| Path | Description |
|------|-------------|
| `/dashboard` | Dealer ERP (36 modules) |
| `/admin` | Super-admin (tenants, payments, churn) |
| `/portal/[slug]` | Customer self-service tracking |
| `/takip` | Public order lookup |
| `/onay/[token]` | Repair approval (server-backed) |

## Module maturity

| Module | Data | API | Notes |
|--------|------|-----|-------|
| Atölye / Kabul | Hybrid | Yes | Service orders API + SMS |
| Stok / POS / Kasa | localStorage + sync | Push | Stok sayım with barcode |
| Bildirimler | localStorage | `/api/notify` | Real SMS/email send |
| Global search | — | `/api/search` | Cmd+K modal |
| e-Fatura | localStorage | GIB stub | `/api/tenant/invoices/submit` |
| AI Asistan | — | `/api/ai` | Gemini (Paket 2+) |
| Raporlar | Store + DB views | `/api/tenant/reports` | Paket 3 |

## Environment

**Git push veritabanı ayarlarını taşımaz.** `.env.local` commit edilmez. Push sonrası canlı sitede (Vercel) bağlantı kopuyorsa → Vercel ortam değişkenleri eksiktir.

### Lokal geliştirme

```bash
cp .env.example .env.local
# Supabase → Settings → API: URL, anon key, service_role key → .env.local'e yapıştır
npm run dev
```

Kontrol: `node scripts/verify-env.mjs` veya `/api/health/supabase?ping=1`

### Vercel (Production) — push sonrası zorunlu

Vercel → **Project → Settings → Environment Variables** — üç ortamda da ekleyin (Production, Preview, Development):

| Değişken | Nereden |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role (gizli) |

Deploy sonrası: `https://SITENIZ.vercel.app/api/health/supabase?ping=1` → `"ok": true` olmalı.

Build, Vercel'de Supabase URL/anon eksikse **bilerek durur** (`next.config.mjs`) — boş deploy yerine hata mesajı verir.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=
NETGSM_USERCODE=
NETGSM_PASSWORD=
CRON_SECRET=
GEMINI_API_KEY=
```

## Scripts

```bash
npm run dev
npm run build
node scripts/verify-env.mjs   # push öncesi lokal env kontrolü
```

## Public API

```http
GET /api/v1/orders
X-API-Key: ak_live_...
```

Generate keys in **Ayarlar → Entegrasyonlar**.

## Cron

```http
POST /api/cron/appointment-reminders
Authorization: Bearer $CRON_SECRET
```
