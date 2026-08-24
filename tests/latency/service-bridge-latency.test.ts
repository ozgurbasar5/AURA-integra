import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServiceOrderRemote } from '@/lib/service-order-bridge'
import { upsertServiceOrder, getServiceOrders, type StoreServiceOrder } from '@/lib/store'

describe('Production Latency & Retry Invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('400 bad request hatasında ASLA retry yapmaz (tam olarak 1 istek)', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return new Response(JSON.stringify({ error: 'Geçersiz veri' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await createServiceOrderRemote({
      customer_name: 'Test',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    })

    expect(callCount).toBe(1)
    expect(result.synced).toBe(false)
    expect(result.error).toContain('Geçersiz veri')
  })

  it('401 unauthorized hatasında ASLA retry yapmaz (tam olarak 1 istek)', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return new Response(JSON.stringify({ error: 'Oturum bulunamadı' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await createServiceOrderRemote({
      customer_name: 'Test',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    })

    expect(callCount).toBe(1)
    expect(result.synced).toBe(false)
    expect(result.error).toContain('Oturum süresi doldu')
  })

  it('403 forbidden yetki hatasında ASLA retry yapmaz (tam olarak 1 istek)', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await createServiceOrderRemote({
      customer_name: 'Test',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    })

    expect(callCount).toBe(1)
    expect(result.synced).toBe(false)
    expect(result.error).toContain('yetkiniz bulunmamaktadır')
  })

  it('409 duplicate hatasında ASLA retry yapmaz (tam olarak 1 istek)', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return new Response(JSON.stringify({ error: 'Kayıt zaten var' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await createServiceOrderRemote({
      customer_name: 'Test',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    })

    expect(callCount).toBe(1)
    expect(result.synced).toBe(false)
    expect(result.error).toContain('Kayıt zaten')
  })

  it('500 server hatasında maksimum 1 kontrollü retry yapar (toplam 2 istek)', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      return new Response(JSON.stringify({ error: 'İç hata' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const start = performance.now()
    const result = await createServiceOrderRemote({
      customer_name: 'Test',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    })
    const duration = performance.now() - start

    expect(callCount).toBe(2) // 1 initial + 1 retry
    expect(duration).toBeLessThan(1500) // Toplam bekleme < 1.5s
    expect(result.synced).toBe(false)
  })

  it('upsertServiceOrder: Realtime + POST + Refetch çakışmasında kaydı asla duplicate etmez', () => {
    const order1: StoreServiceOrder = {
      id: 'ord_123',
      job_no: 'SRV-001',
      customer_name: 'Ahmet Yılmaz',
      customer_phone: '05551234567',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
      imei: '123456789012345',
      status: 'in_repair',
      technician: 'Mert',
      eta: null,
      estimated_cost: 1500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 1. Optimistic / POST response
    upsertServiceOrder(order1)
    expect(getServiceOrders().filter(o => o.id === 'ord_123')).toHaveLength(1)

    // 2. Realtime event arrives with same ID
    upsertServiceOrder({ ...order1, status: 'repair_complete' })
    expect(getServiceOrders().filter(o => o.id === 'ord_123')).toHaveLength(1)
    expect(getServiceOrders().find(o => o.id === 'ord_123')?.status).toBe('repair_complete')

    // 3. Manual refetch arrives with same job_no
    upsertServiceOrder({ ...order1, id: 'ord_123', status: 'ready_for_pickup' })
    expect(getServiceOrders().filter(o => o.job_no === 'SRV-001')).toHaveLength(1)
  })
})
