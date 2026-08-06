# Features (Domain-Driven Design)

Bu klasör, uygulamanın iş mantığını ve alanlarını (domains) birbirinden izole etmek için oluşturulmuştur.
Daha önce tüm iş mantığı ve veritabanı eşleştiricileri `lib/` altında tek bir klasörde toplanıyordu.

Yeni mimariyle birlikte modüller kendi içinde kapsüllenmiştir (encapsulated):

- `auth`: Oturum yönetimi, yetkilendirme (Role Guards)
- `core`: Ortak tipler, global hook'lar, hata yakalayıcılar
- `finance`: Kasa işlemleri, E-fatura, gelir/gider tabloları
- `service`: Teknik servis (Atölye, Kabul, Teslim) kayıtları
- `stock`: Stok yönetimi, tedarik ve barkod işlemleri

**Kurallar:**
1. Bir feature, başka bir feature'ın iç yapısını (internal) doğrudan çağırmamalıdır. İletişim, o feature'ın kendi ana index.ts veya açık servisleri üzerinden yapılmalıdır.
2. `lib/` klasörü zamanla sadece yardımcı (utility) fonksiyonlar (örn: tarih formatlama, string manipülasyonu) için kullanılacak şekilde boşaltılacaktır.
