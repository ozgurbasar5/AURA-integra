/**
 * AURA İntegra — Seed Profilleri Yapılandırması (Seed Profiles Config)
 *
 * Test veritabanı için ölçeklenebilir seed profilleri ve gerçekçi dağılım oranları.
 * Desteklenen Profiller: FAST, NORMAL, STRESS
 */

export interface SeedProfile {
  name: 'FAST' | 'NORMAL' | 'STRESS'
  description: string
  tenantsCount: number
  branchesPerTenant: number
  techniciansPerTenant: number
  customersPerTenant: number
  partsPerTenant: number
  productsPerTenant: number
  servicesPerTenant: number
  stockMovementsPerTenant: number
  paymentsPerTenant: number
  warrantyRatio: number // Teslim edilmiş servislerin garanti oranı
  warrantyClaimRatio: number // Garantilerin talep oranı
  batchSize: number
  statusDistribution: Record<string, number>
}

export const SEED_STATUS_DISTRIBUTION = {
  beklemede: 0.10,        // Kabul / Giriş yapıldı
  teslim_alindi: 0.10,    // Teşhis / İnceleme aşamasında
  teklif_bekliyor: 0.10,  // Müşteri teklif onayı bekliyor
  onaylandi: 0.10,        // Teklif onaylandı, sıraya alındı
  tamirde: 0.20,          // Teknisyen masasında onarımda
  hazir: 0.15,            // QC yapıldı, müşteriye teslime hazır
  teslim: 0.20,           // Teslim edildi & Ödeme alındı
  iptal: 0.05,            // Red / İptal edildi
} as const

export const SEED_PROFILES: Record<'FAST' | 'NORMAL' | 'STRESS', SeedProfile> = {
  FAST: {
    name: 'FAST',
    description: 'Hızlı yerel geliştirme ve CI/CD duman testleri (~50 servis, ~20 müşteri, 2 tenant)',
    tenantsCount: 2,
    branchesPerTenant: 1,
    techniciansPerTenant: 2,
    customersPerTenant: 10,
    partsPerTenant: 25,
    productsPerTenant: 10,
    servicesPerTenant: 25,
    stockMovementsPerTenant: 50,
    paymentsPerTenant: 10,
    warrantyRatio: 0.30,
    warrantyClaimRatio: 0.20,
    batchSize: 100,
    statusDistribution: SEED_STATUS_DISTRIBUTION,
  },

  NORMAL: {
    name: 'NORMAL',
    description: 'Kapsamlı entegrasyon ve iş akışı testleri (~2.000 servis, ~500 müşteri, 5 tenant)',
    tenantsCount: 5,
    branchesPerTenant: 2,
    techniciansPerTenant: 4,
    customersPerTenant: 100,
    partsPerTenant: 100,
    productsPerTenant: 50,
    servicesPerTenant: 400,
    stockMovementsPerTenant: 1000,
    paymentsPerTenant: 200,
    warrantyRatio: 0.25,
    warrantyClaimRatio: 0.15,
    batchSize: 500,
    statusDistribution: SEED_STATUS_DISTRIBUTION,
  },

  STRESS: {
    name: 'STRESS',
    description: 'Büyük ölçekli performans, indeksleme ve yük benchmark testleri (~50.000 servis, ~10.000 müşteri, 10 tenant)',
    tenantsCount: 10,
    branchesPerTenant: 3,
    techniciansPerTenant: 8,
    customersPerTenant: 1000,
    partsPerTenant: 500,
    productsPerTenant: 200,
    servicesPerTenant: 5000,
    stockMovementsPerTenant: 10000,
    paymentsPerTenant: 1000,
    warrantyRatio: 0.20,
    warrantyClaimRatio: 0.10,
    batchSize: 500,
    statusDistribution: SEED_STATUS_DISTRIBUTION,
  },
} as const

/**
 * Verilen string'den geçerli profili çözer (case-insensitive).
 */
export function resolveSeedProfile(profileName?: string): SeedProfile {
  if (!profileName) return SEED_PROFILES.FAST

  const normalized = profileName.trim().toUpperCase()
  if (normalized === 'FAST' || normalized === 'NORMAL' || normalized === 'STRESS') {
    return SEED_PROFILES[normalized as keyof typeof SEED_PROFILES]
  }

  throw new Error(
    `❌ Geçersiz seed profili: "${profileName}".\n` +
    'Kullanılabilir profiller: FAST, NORMAL, STRESS'
  )
}
