# AI Token Maliyet Planı

## Model

- **Primary:** `gemini-2.5-flash-lite`
- **Fallback:** `gemini-2.5-flash`
- **Fiyat (Paid tier):** $0.10 / 1M input, $0.40 / 1M output

## Paket kotası

| Paket | Dahil mesaj/ay | Token tavanı | Rate limit (15 dk) |
|-------|----------------|--------------|-------------------|
| Stok & Satış (1) | — | — | — |
| Teknik Servis (2) | 500 | 250K | 30/kullanıcı |
| Finans (3) | 2.000 | 1M | 60/kullanıcı |

## Teknik limitler

- Son 12 tur history
- maxOutputTokens: 512
- Upstash rate limit: `ai:{tenantId}:{userId}`

## Senaryo maliyetleri (tenant/ay)

| Profil | Tur/ay | Tahmini USD |
|--------|--------|-------------|
| Hafif | 180 | ~$0.03 |
| Normal | 960 | ~$0.19 |
| Yoğun | 2.700 | ~$0.64 |

100 tenant × Normal profil ≈ **$19/ay** platform maliyeti.

## Upsell (opsiyonel)

- +500 mesaj: ₺99
- +1.000 mesaj: ₺149

## Break-even

Paket 2 (₺750/ay) → AI maliyeti ~%1–3 brüt gelir (Normal profil).

## İzleme

- Tablo: `ai_usage_logs`, `tenant_ai_quotas`
- Admin widget: aylık tahmini maliyet
