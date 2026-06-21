import { describe, it, expect } from 'vitest'
import { MODULE_MATURITY, maturitySummary, maturityBadgeColor } from '@/lib/module-maturity'

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
})
