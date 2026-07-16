import { describe, it, expect } from 'vitest'
import {
  MODULE_MATURITY,
  maturitySummary,
  maturityBadgeColor,
  coreApiFirstReady,
} from '@/lib/module-maturity'

describe('module-maturity', () => {
  it('has entries for core modules', () => {
    const ids = MODULE_MATURITY.map(m => m.id)
    expect(ids).toContain('kabul')
    expect(ids).toContain('atolye')
    expect(ids).toContain('ai')
  })

  it('summary counts match total', () => {
    const s = maturitySummary()
    expect(s.green + s.amber + s.red).toBe(s.total)
  })

  it('api-first modules are green', () => {
    const kabul = MODULE_MATURITY.find(m => m.id === 'kabul')!
    expect(maturityBadgeColor(kabul)).toBe('green')
  })

  it('core ERP (excl. efatura + bildirimler) is 100% API-first', () => {
    expect(coreApiFirstReady()).toBe(true)
    const core = MODULE_MATURITY.filter(m => m.id !== 'fatura' && m.id !== 'bildirimler')
    expect(core.length).toBeGreaterThanOrEqual(14)
    for (const m of core) {
      expect(m.dataSource).toBe('api')
      expect(m.apiCoverage).toBe(100)
    }
  })

  it('includes randevu/garanti/komisyon/transfer maturity', () => {
    const ids = MODULE_MATURITY.map(m => m.id)
    expect(ids).toContain('randevu')
    expect(ids).toContain('garanti')
    expect(ids).toContain('komisyon')
    expect(ids).toContain('transfer')
    expect(ids).toContain('musteriler')
  })
})
