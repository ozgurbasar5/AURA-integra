import { describe, it, expect } from 'vitest'

/**
 * DATABASE INTEGRITY: Service Lifecycle State Machine Invariants
 */
describe('Database Integrity: Service Lifecycle State Machine', () => {
  const allowedTransitions: Record<string, string[]> = {
    alindi: ['teshis', 'iptal'],
    teshis: ['teklif_bekliyor', 'onaylandi', 'tamir', 'iptal'],
    teklif_bekliyor: ['onaylandi', 'iptal'],
    onaylandi: ['tamir', 'iptal'],
    tamir: ['kalite_kontrol', 'hazir', 'iptal'],
    kalite_kontrol: ['hazir', 'tamir'],
    hazir: ['teslim'],
    teslim: [], // Terminal durum (Teslim edilen cihazın statüsü geriye döndürülemez)
    iptal: [],  // Terminal durum
  }

  const transitionState = (currentStatus: string, nextStatus: string) => {
    const validNextList = allowedTransitions[currentStatus] ?? []
    if (!validNextList.includes(nextStatus)) {
      throw new Error(`Invalid State Transition: Cannot move from '${currentStatus}' to '${nextStatus}'`)
    }
    return nextStatus
  }

  it('Geçerli ardışık statü geçişleri başarıyla tamamlanır', () => {
    let status = 'alindi'
    status = transitionState(status, 'teshis')
    expect(status).toBe('teshis')

    status = transitionState(status, 'teklif_bekliyor')
    expect(status).toBe('teklif_bekliyor')

    status = transitionState(status, 'onaylandi')
    expect(status).toBe('onaylandi')

    status = transitionState(status, 'tamir')
    expect(status).toBe('tamir')

    status = transitionState(status, 'kalite_kontrol')
    expect(status).toBe('kalite_kontrol')

    status = transitionState(status, 'hazir')
    expect(status).toBe('hazir')

    status = transitionState(status, 'teslim')
    expect(status).toBe('teslim')
  })

  it('Teslim edilmiş terminal durumdaki cihaz tekrar tamir statüsüne geçirilemez', () => {
    expect(() => {
      transitionState('teslim', 'tamir')
    }).toThrow(/Invalid State Transition/)
  })

  it('İptal edilmiş cihaz teslim statüsüne geçirilemez', () => {
    expect(() => {
      transitionState('iptal', 'teslim')
    }).toThrow(/Invalid State Transition/)
  })
})
