# AURA İntegra — CI / CD Automation & Release Gate Dokümantasyonu

---

## 1. Genel Mimari ve İşleyiş

AURA İntegra reposunda **Release Gate (Sürüm Kapısı)** prensibi uygulanmaktadır.
Hiçbir kod değişikliği aşağıdaki kapılardan (Gates) geçmeden `main` branch'ine merge edilemez ve production ortamına dağıtılamaz.

```
Kod Değişikliği (PR / Push)
          │
          ▼
┌───────────────────────────────┐
│ 1. Lint & Kod Kalitesi        │ (ESLint + Migration Drift Kontrolü)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 2. Test Engine Doğrulaması    │ (511 Unit/Scenario/API/Security/Integrity/Perf Testi)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 3. Next.js Production Build   │ (Build Hata ve Paket Bütünlüğü)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 4. Playwright E2E Matrisi     │ (Desktop Chromium + Mobile Chrome)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 5. Release Gate Onayı         │ 🚀 GREEN → MERGE İZNİ / 🛑 RED → MERGE ENGELİ
└───────────────────────────────┘
```

---

## 2. GitHub Actions İş Akışları (Workflows)

### 2.1. PR & Main Pipeline (`.github/workflows/ci.yml`)
- **Tetikleyiciler**: `push` ve `pull_request` (`main`, `master`, `develop` branch'leri).
- **Eşzamanlılık (Concurrency)**: Yeni bir commit geldiğinde devam eden eski test koşusu otomatik iptal edilir (`cancel-in-progress: true`).
- **İşler (Jobs)**:
  1. `lint-and-types`: ESLint ve SQL migration drift denetimi.
  2. `test-engine`: `npm test`, `test:api`, `test:security`, `test:integrity`, `test:performance`.
  3. `build-gate`: `npm run build` ile Next.js production bundle üretimi.
  4. `e2e-matrix`: Paralel Chromium ve Mobile Chrome testleri.
  5. `release-gate-summary`: Tüm aşamaların sonucunu özetleyen GitHub Step Summary tablosu.

### 2.2. Nightly Regression & Stress Pipeline (`.github/workflows/nightly.yml`)
- **Tetikleyici**: Her gece 02:00 UTC ve manuel `workflow_dispatch`.
- **Kapsam**: Tüm test motorları + Full E2E + Performans stres kontrolleri.

---

## 3. Güvenlik ve İzolasyon Kuralları (Fail-Safe)

1. **Production DB Dokunulmazlığı**: CI ortamında asla production DB ref (`dipyrdidkvljojkyaqmd`) kullanılamaz. `env-guard.ts` bu durumu otomatik doğrular.
2. **Secret Masking & Zero Hardcoding**: Supabase servis anahtarları ve webhook secret'ları GitHub Secrets üzerinden yönetilir; CI loglarına asla yazdırılmaz.
3. **Artifact Saklama**: E2E veya build hatası durumunda hata ekran görüntüleri ve Playwright trace dosyaları 7 gün süreyle `actions/upload-artifact` ile saklanır.

---

## 4. GitHub Branch Protection Önerileri (`main` Branch)

- [x] **Require a pull request before merging**
- [x] **Require status checks to pass before merging**:
  - `1. Code Quality (Lint & Typecheck)`
  - `2. Test Engine Suite`
  - `3. Next.js Production Build`
  - `4. Critical E2E (chromium)`
  - `4. Critical E2E (Mobile Chrome)`
  - `5. Release Gate Summary`
- [x] **Require branches to be up to date before merging**
- [x] **Do not allow bypassing the above settings**
