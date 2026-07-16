/**
 * AURA İntegra — 3 Katmanlı Paket Sistemi (kümülatif)
 *
 * Paket 1: Stok & Satış      (level 1) — Temel katman
 * Paket 2: Teknik Servis     (level 2) — Paket 1 dahil
 * Paket 3: Finans & Analitik (level 3) — Paket 1 + 2 dahil
 *
 * Üst paket, alt paketlerin tüm özelliklerini içerir (dependency).
 */

export type PlanLevel = 1 | 2 | 3

export interface PlanTierDef {
  level: PlanLevel
  name: string
  /** Aylık fiyat (₺) */
  price: number
  max_users: number
  max_branches: number
  /** Vitrinde / kartlarda gösterilecek özellikler */
  features: string[]
  /** Bu seviyenin getirdiği modül grupları (kümülatif değil — sadece bu katman) */
  modules: string[]
}

/** Kanonik 3 paket tanımı */
export const PLAN_TIERS: PlanTierDef[] = [
  {
    level: 1,
    name: 'Stok & Satış',
    price: 450,
    max_users: 3,
    max_branches: 1,
    features: [
      'Stok & Envanter Yönetimi',
      'Satış & POS',
      'Kasa Vardiyası',
      'Müşteri Yönetimi',
      'Fatura & İrsaliye',
      'Alış / Tedarik',
    ],
    modules: ['Stok', 'Satış & POS', 'Kasa', 'Müşteriler', 'Fatura', 'Alış'],
  },
  {
    level: 2,
    name: 'Teknik Servis',
    price: 750,
    max_users: 6,
    max_branches: 2,
    features: [
      'Stok & Satış (dahil)',
      'Teknik Servis & Atölye',
      'Cihaz & Arıza Takibi',
      'Teknisyen Yönetimi',
      'Garanti & Randevu',
    ],
    modules: ['Teknik Servis', 'Garanti', 'Randevu', 'Çalıntı Kontrol', 'Personel', 'Yapılacaklar'],
  },
  {
    level: 3,
    name: 'Finans & Analitik',
    price: 1200,
    max_users: 12,
    max_branches: 5,
    features: [
      'Teknik Servis (dahil)',
      'Finans & Nakit Akışı',
      'Banka & Vergi Raporları',
      'Gelişmiş Analitik & Dashboard',
      'Tüm modüller + Öncelikli Destek',
    ],
    modules: ['Gelir/Gider', 'Raporlar', 'Varlık Yönetimi', 'Kampanyalar', 'Fırsatlar', 'Mağaza'],
  },
]

/**
 * Plan adından seviye türetir. Hem yeni hem eski (Deneyim/Pro/Business) isimleri
 * ve serbest metinleri destekler. Eşleşme bulunamazsa 1 (temel) döner.
 */
export function getPlanLevel(planName: string | null | undefined): PlanLevel {
  if (!planName) return 1
  const n = planName.toLocaleLowerCase('tr-TR').trim()

  // Seviye 3 — Finans & Analitik / Business / Enterprise
  if (
    n.includes('finans') ||
    n.includes('analiti') ||
    n.includes('business') ||
    n.includes('kurumsal') ||
    n.includes('enterprise')
  ) {
    return 3
  }

  // Seviye 2 — Teknik Servis / Pro
  if (
    n.includes('servis') ||
    n.includes('atölye') ||
    n.includes('atolye') ||
    n.includes('pro') ||
    n.includes('profesyonel')
  ) {
    return 2
  }

  // Seviye 1 — Stok & Satış / Deneyim / Starter (varsayılan)
  return 1
}

/** Her dashboard route'u için gereken minimum paket seviyesi */
export const ROUTE_MIN_LEVEL: Record<string, PlanLevel> = {
  // Seviye 1 — Stok & Satış (temel)
  '/dashboard': 1,
  '/dashboard/bildirimler': 1,
  '/dashboard/alis': 1,
  '/dashboard/kabul': 1,
  '/dashboard/satis': 1,
  '/dashboard/stok': 1,
  '/dashboard/musteriler': 1,
  '/dashboard/siparisler': 1,
  '/dashboard/ayarlar': 1,
  '/dashboard/destek': 1,

  // Seviye 2 — Teknik Servis
  '/dashboard/atolye': 2,
  '/dashboard/tedarik': 2,
  '/dashboard/komisyon': 2,
  '/dashboard/subeler': 2,
  '/dashboard/garanti': 2,
  '/dashboard/randevu': 2,
  '/dashboard/calinti-kontrol': 2,
  '/dashboard/personel': 2,
  '/dashboard/yapilacaklar': 2,

  // Seviye 1 — günlük kasa (POS ile birlikte)
  '/dashboard/kasa': 1,
  '/dashboard/kasa/rapor': 1,

  // Seviye 3 — Finans & Analitik
  '/dashboard/finans': 3,
  '/dashboard/cari': 3,
  '/dashboard/ikinci-el': 3,
  '/dashboard/vitrin': 3,
  '/dashboard/raporlar': 3,
  '/dashboard/fatura': 1,
  '/dashboard/varliklar': 3,
  '/dashboard/kampanyalar': 3,
  '/dashboard/firsatlar': 3,
  '/dashboard/musteri-portali': 2,
  '/dashboard/yenilikler': 1,
  '/dashboard/dokumantasyon': 1,
  '/dashboard/magaza': 3,
  '/dashboard/plan-yukselt': 1,
  '/dashboard/stok/sayim': 1,
}

/** Bir route'a verilen paket seviyesiyle erişilebilir mi? */
export function isRouteAllowed(route: string, level: PlanLevel): boolean {
  const exact = ROUTE_MIN_LEVEL[route]
  if (exact !== undefined) return level >= exact
  for (const [path, required] of Object.entries(ROUTE_MIN_LEVEL)) {
    if (route.startsWith(`${path}/`)) return level >= required
  }
  return true
}

/** Verilen seviyenin kapsadığı tüm modül adları (kümülatif) */
export function getEntitledModules(level: PlanLevel): string[] {
  return PLAN_TIERS.filter((t) => t.level <= level).flatMap((t) => t.modules)
}

/** Paket seviyesi etiketleri */
export const PLAN_LEVEL_LABELS: Record<PlanLevel, string> = {
  1: 'Stok & Satış',
  2: 'Teknik Servis',
  3: 'Finans & Analitik',
}
