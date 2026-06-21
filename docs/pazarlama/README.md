# AURA İntegra — Saha Pazarlama Kataloğu

Bayi ziyaretlerinde kullanılmak üzere hazırlanmış **basılı / PDF** satış dokümanı.

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `katalog.html` | Tarayıcıda açılabilir, yazdırılabilir kaynak |
| `AURA-Integra-Saha-Katalogu.pdf` | Otomatik üretilen PDF (npm script) |

## PDF oluşturma

```bash
# Playwright Chromium gerekir (e2e kurulumu yeterli)
npm run test:e2e:install

# PDF üret
npm run pdf:katalog
```

Alternatif: `katalog.html` dosyasını Chrome’da açın → **Ctrl+P** → **PDF olarak kaydet** → Kenar boşlukları: Yok, Arka plan grafikleri: Açık.

## Saha kullanım önerisi

1. **Kapak + “Kimler için?”** — 2 dk sohbet açılışı  
2. **Günlük akış** — “Tek defter” anlatımı  
3. **Hızlı Kabul + Portal** — canlı demo (telefon/tablet)  
4. **Paketler** — bütçe seviyesine göre kapanış  
5. **Arka kapak** — QR ile başvuru: `integra.aurabilisim.net/basvuru`

## Güncelleme

Fiyat ve modül metinleri `lib/plan-tiers.ts` ve `lib/landing-modules.ts` ile uyumlu tutulmalı. Değişiklik sonrası `npm run pdf:katalog` ile PDF’i yenileyin.
