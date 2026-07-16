# Pilot checklist — AURA Integra

1–2 bayide 1–2 hafta canlı deneme için.

## Ortam
- [ ] `.env` / Vercel: `NEXT_PUBLIC_SUPABASE_URL` + anon + service role aynı proje
- [ ] Login sonrası `/api/health/supabase` yeşil (DNS/TLS uyarısı yok)
- [ ] Windows aile filtresi / SafeSearch varsa: `ipconfig /flushdns`
- [ ] Migration: `20260716_pos_sale_atomic.sql` uygulandı (`complete_pos_sale`)

## Günlük akış
- [ ] Hızlı kabul → atölye durum → parça → teslim (nakit / kart / veresiye)
- [ ] POS satış (açık vardiya ile) → stok düşer, finans oluşur
- [ ] Kasa aç / kapat → Z raporu sunucudan açılır
- [ ] Alış **veya** tedarik receive (ikisini aynı kaleme uygulamayın)
- [ ] Cari tahsilat
- [ ] Raporlar → Excel/CSV sunucu indirme (Paket 3)

## Mobil
- [ ] Kabul + success foto
- [ ] Atölye: WA / fiş paylaş / foto
- [ ] Çevrimdışı kabul kuyruğu (ağ kesilince) → yeniden bağlanınca flush

## Bilinçli sınırlar (pilete anlat)
- e-Fatura stub ise GİB’e gitmez — opsiyonel
- SMS / WhatsApp prod doğrulaması bu pilotta zorunlu değil
- Muhasebe-grade defter yok

## Kapanış
- [ ] Kasa farkı 0 veya açıklanmış (Kasa Düzeltme ile loglanmış)
- [ ] Bayi geri bildirimi: 3 beğeni / 3 sürtünme
- [ ] Admin: bayi health score + ödeme durumu
