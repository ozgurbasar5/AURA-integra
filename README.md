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

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NETGSM_USER=
NETGSM_PASSWORD=
NETGSM_HEADER=
SMTP_EMAIL=
SMTP_PASSWORD=
GEMINI_API_KEY=
CRON_SECRET=
```

## Scripts

```bash
npm run dev
npm run build
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
