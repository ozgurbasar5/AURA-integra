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

Odak: **teknik servis + stok + POS + kasa ERP**. Pazaryeri / e-ticaret yok.

| Module | Data | API | Notes |
|--------|------|-----|-------|
| Kabul / Atölye | API-first | `/api/service-orders` | Müşteri geçmişi + technician_id |
| Servis teslim | API-first | `/deliver` + `/use-parts` | Parça + kasa + finans atomik |
| Stok / POS / Kasa | API-first | Dedicated APIs | POS/teslim açık vardiyaya bağlanır |
| Alış / Tedarik | API-first | purchases + receive | Teslim alındı → stok |
| Stok sayım | API-first | `/api/tenant/stock/count` | `stock_movements` fark notu |
| Bildirimler | hybrid | `/api/notify` | SMS + WhatsApp (Meta Cloud / wa.me) |
| e-Fatura | Queue + UBL | Stub/NES/Logo | Kuyruk UI + cron — docs/EFATURA-ROADMAP.md |
| AI Asistan | — | `/api/ai` | Gemini 2.5 + kota (Paket 2+) |
| Müşteri Portalı | — | `/portal/[slug]` | Landing vitrin + public showcase API |
| Raporlar | API-first 100% | `/api/tenant/reports` + export | Finans + KDV + vardiya + CSV |
| Vitrin | API-first 100% | `/api/tenant/showcase` | CRUD + sell; push kapalı |
| Tedarik | API-first 100% | supplier-orders GET/PATCH/receive | Push kapalı |
| PWA / Expo | — | manifest + `mobile/` | Kabul / Atölye / Satış / Sayım / Kasa + foto/WA/fiş |

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

Env değiştirdikten sonra **Deployments → son deploy → Redeploy** (sadece env kaydetmek yetmez).

Build, Vercel'de Supabase env eksikse **bilerek durur** (`next.config.mjs` + `npm run build` içindeki `verify-env`). İstemci tarafında env, her istekte `layout` üzerinden enjekte edilir — Vercel'de doğru env varsa push sonrası bağlantı kopmaz.

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
npm run pdf:katalog          # Saha satış PDF (docs/pazarlama/)
node scripts/verify-env.mjs   # push öncesi lokal env kontrolü
```

**Saha pazarlama kataloğu:** [docs/pazarlama/AURA-Integra-Saha-Katalogu.pdf](docs/pazarlama/AURA-Integra-Saha-Katalogu.pdf) · HTML: [docs/pazarlama/katalog.html](docs/pazarlama/katalog.html)

## Public API

```http
GET /api/v1/orders
X-API-Key: ak_live_...
```

Generate keys in **Ayarlar → Entegrasyonlar**.

## Nasıl Çalışır? (Türkçe)

Uygulama içi interaktif rehber: **`/dashboard/nasil-calisir`** (sağ üstte ? ikonu).

| Modül | Ne işe yarar? | Otomatik mantık |
|-------|---------------|-----------------|
| **Hızlı Kabul** | Cihaz teslim alma, servis no, fiş | SMS/WhatsApp + portal linki |
| **Atölye** | Tamir, parça, teslim | Stoktan parça → stok düşer, maliyet/kâr |
| **Stok** | Yedek parça envanteri | Giriş → finansa gider; barkod otomatik |
| **Alış** | İkinci el cihaz alımı (tedarik) | Vitrin/satışa hazırlık; stoktan farklı |
| **Satış POS** | Perakende satış | Stok doğrula → satış → gelir → kasa |
| **Kasa** | Vardiya aç/kapat, Z raporu | Sabah kasa + gün içi tüm işlemler detaylı |

**Tema özelleştirme:** Ayarlar → Tema & Görünüm — renk, sol panel stili (Marka/Koyu/Açık), köşe yuvarlaklığı, canlı önizleme.

**SMS kurulum:** `/dashboard/nasil-calisir` → SMS Kurulumu adımı veya Dokümantasyon → Bayi Kurulum SMS.

Detaylı dokümantasyon: `/dashboard/dokumantasyon`

## Cron

```http
POST /api/cron/appointment-reminders
Authorization: Bearer $CRON_SECRET
```

```http
POST /api/cron/efatura-queue
Authorization: Bearer $CRON_SECRET
```

e-Fatura kuyruk worker her 15 dk (`vercel.json`). Stub modda pending → submitted; NES/Logo env ile gerçek HTTP.