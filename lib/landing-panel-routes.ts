/**
 * Anasayfa modül id → panel rotası (doğrulandı: app/dashboard altındaki sayfalar)
 */
export const LANDING_PANEL_ROUTES: Record<string, { href: string; platformOnly?: boolean }> = {
  kabul: { href: '/dashboard/kabul' },
  satis: { href: '/dashboard/satis' },
  alis: { href: '/dashboard/alis' },
  kasa: { href: '/dashboard/kasa' },
  'atolye-kanban': { href: '/dashboard/atolye' },
  foto: { href: '/dashboard/atolye' },
  ekspertiz: { href: '/dashboard/atolye' },
  garanti: { href: '/dashboard/garanti' },
  stok: { href: '/dashboard/stok' },
  sayim: { href: '/dashboard/stok/sayim' },
  tedarik: { href: '/dashboard/tedarik' },
  finans: { href: '/dashboard/finans' },
  rapor: { href: '/dashboard/raporlar' },
  efatura: { href: '/dashboard/fatura' },
  komisyon: { href: '/dashboard/komisyon' },
  crm: { href: '/dashboard/musteriler' },
  portal: { href: '/dashboard/musteri-portali' },
  siparis: { href: '/dashboard/siparisler' },
  sms: { href: '/dashboard/bildirimler' },
  vitrin: { href: '/dashboard/vitrin' },
  kampanya: { href: '/dashboard/kampanyalar' },
  varlik: { href: '/dashboard/varliklar' },
  personel: { href: '/dashboard/personel' },
  sube: { href: '/dashboard/subeler' },
  todo: { href: '/dashboard/yapilacaklar' },
  yurtdisi: { href: '/dashboard/calinti-kontrol' },
  admin: { href: '/admin', platformOnly: true },
  api: { href: '/dashboard/api-docs' },
  search: { href: '/dashboard' },
  abonelik: { href: '/dashboard/plan-yukselt' },
}

export const LANDING_EXTRA_ROUTES: Record<string, string> = {
  'QR Servis Etiketi': '/dashboard/kabul',
  'Fiş & Barkod Yazdır': '/dashboard/kabul',
  'Bildirim Merkezi': '/dashboard/bildirimler',
  'Randevu Takvimi': '/dashboard/randevu',
}

/** Tüm anasayfa modüllerinin panelde karşılığı var mı */
export function attachPanelRoutes<T extends { id: string; panelHref?: string; platformOnly?: boolean }>(
  modules: T[],
): T[] {
  return modules.map(m => {
    const route = LANDING_PANEL_ROUTES[m.id]
    if (!route) return m
    return { ...m, panelHref: route.href, platformOnly: route.platformOnly }
  })
}

export function countVerifiedModules(moduleIds: string[]): { total: number; mapped: number } {
  const mapped = moduleIds.filter(id => Boolean(LANDING_PANEL_ROUTES[id])).length
  return { total: moduleIds.length, mapped }
}
