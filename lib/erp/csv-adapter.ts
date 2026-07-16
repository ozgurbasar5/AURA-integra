import type { ErpConnector, ErpExportResult } from './types'

/** Mevcut muhasebe CSV export'unu ERP adapter olarak sarar */
export const csvErpAdapter: ErpConnector = {
  id: 'csv',
  label: 'CSV dışa aktarım (Mikro / Logo uyumlu)',
  async test() {
    return { ok: true, message: 'CSV export hazır — GET /api/tenant/export/accounting' }
  },
  async exportJournal(): Promise<ErpExportResult> {
    return {
      ok: true,
      format: 'csv',
      filename: `muhasebe-export-${new Date().toISOString().slice(0, 10)}.csv`,
      downloadUrl: '/api/tenant/export/accounting',
      message: 'Hazır CSV — Mikro/Logo dosya içe aktarımı için GET /api/tenant/export/accounting',
    }
  },
}

/** İleride REST — şimdilik CSV'ye düşer */
export const mikroErpAdapter: ErpConnector = {
  ...csvErpAdapter,
  id: 'mikro',
  label: 'Mikro Muhasebe (CSV)',
}

export const logoErpAdapter: ErpConnector = {
  ...csvErpAdapter,
  id: 'logo',
  label: 'Logo Tiger (CSV)',
}

export function getErpConnector(id?: string): ErpConnector {
  const key = (id || 'csv').toLowerCase()
  if (key === 'mikro') return mikroErpAdapter
  if (key === 'logo') return logoErpAdapter
  return csvErpAdapter
}
