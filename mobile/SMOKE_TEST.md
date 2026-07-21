# Mobil smoke test checklist

Üretim öncesi manuel doğrulama listesi.

## Auth ve güvenlik

- [ ] Login → MFA (varsa) → Ana ekran
- [ ] MFA: "Kodu tekrar gönder" ve "Girişe dön" çalışıyor
- [ ] MFA sonrası uygulamayı kapat/aç → MFA tekrar isteniyor (verified persist)
- [ ] Pasif hesap (`is_active=false`) → blok ekranı + çıkış
- [ ] Çıkış → farklı kullanıcı giriş → eski stats görünmüyor
- [ ] 401 (oturum süresi) → toast mesajı + otomatik çıkış

## Saha operasyonları

- [ ] Müşteriler → telefonlu müşteri → Kabul formu prefill + açık
- [ ] Telefonsuz müşteri → chevron yok / tıklanmıyor
- [ ] Kabul oluştur → atölye detay → durum güncelle → teslim
- [ ] Satış (POS) → sepet → ödeme (stok son kontrol)
- [ ] Kasa vardiya aç/kapa, TR ondalık düzeltme (50,5)
- [ ] Z raporu paylaş (Share API)
- [ ] Stok listesi + delta düzeltme
- [ ] Sayım kaydet

## Çevrimdışı kuyruk

- [ ] Uçak modu → kabul oluştur → kuyruğa alındı mesajı
- [ ] Uçak modu → POS satış → kuyruğa alındı
- [ ] Uçak modu → sayım kaydet → kuyruğa alındı
- [ ] Uçak modu → atölye teslim/durum → kuyruğa alındı
- [ ] Online ol → toast flush bildirimi (Alert kesmiyor)
- [ ] Ana ekran “Gönder” → ok/fail sayısı
- [ ] Bildirimler → Offline kuyruk sekmesi

## Push

- [ ] İzin ver → “Push kaydı tamam”
- [ ] İzin reddet → hata mesajı (sahte başarı yok)
- [ ] Ana sayfa her odakta izin popup **istemiyor** (sadece granted ise kayıt)
- [ ] Bildirime tıkla → ilgili ekrana yönlendirme (order_id varsa)

## Rol ve erişim

- [ ] Yetkisiz modül deep link → “Bu modüle erişiminiz yok”
- [ ] Web satış rolü → cari, sayım, atölye erişebiliyor (role-matrix)

## Web PWA

- [ ] Kabul/satis offline → localStorage kuyruk
- [ ] Sync panel → kuyruk listesi + gönder
- [ ] PageShell: kabul, atölye, satış, kasa tutarlı header
- [ ] Dark mode PageHeader okunabilir
- [ ] Mobil web alt nav 5 sekme (Ana, Kabul, Atölye, Satış, Kasa)

## Build

- [ ] `npx tsc --noEmit` temiz (mobile)
- [ ] `npm run build` temiz (web)
- [ ] EAS production build yeşil
