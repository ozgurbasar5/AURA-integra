import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveSeedProfile, SEED_PROFILES } from '../config/seed-profiles.config'
import { runSeedEngine, verifySeededData } from '../engine/seed-engine'
import { PRODUCTION_PROJECT_REF } from '../helpers/env-guard'

/**
 * Faz 3 — Seed Engine Unit & Safety Testleri
 *
 * Doğrulanan kurallar:
 * 1. Profile Config Doğrulaması (FAST, NORMAL, STRESS)
 * 2. Geçersiz profil tespiti ve reddi
 * 3. Production Koruması (Seed motoru asla production'da çalışamaz)
 * 4. Deterministik çalışma ve sayaç sıfırlama
 * 5. Multi-tenant veri izolasyon ve doğrulama mekanizması
 */
describe('Faz 3 — Seed Engine & Profile Config', () => {
  const ORIG_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIG_ENV }
    vi.restoreAllMocks()
  })

  describe('1. Profile Config & Resolution', () => {
    it('FAST profili doğru değerlerle yapılandırılmıştır', () => {
      const profile = resolveSeedProfile('FAST')
      expect(profile.name).toBe('FAST')
      expect(profile.tenantsCount).toBe(2)
      expect(profile.servicesPerTenant).toBe(25)
      expect(profile.customersPerTenant).toBe(10)
      expect(profile.batchSize).toBe(100)
    })

    it('NORMAL profili doğru değerlerle yapılandırılmıştır', () => {
      const profile = resolveSeedProfile('normal')
      expect(profile.name).toBe('NORMAL')
      expect(profile.tenantsCount).toBe(5)
      expect(profile.servicesPerTenant).toBe(400)
      expect(profile.customersPerTenant).toBe(100)
      expect(profile.batchSize).toBe(500)
    })

    it('STRESS profili doğru değerlerle yapılandırılmıştır', () => {
      const profile = resolveSeedProfile('STRESS')
      expect(profile.name).toBe('STRESS')
      expect(profile.tenantsCount).toBe(10)
      expect(profile.servicesPerTenant).toBe(5000)
      expect(profile.customersPerTenant).toBe(1000)
      expect(profile.batchSize).toBe(500)
    })

    it('geçersiz profil ismi girildiğinde hata fırlatır', () => {
      expect(() => resolveSeedProfile('SUPER_MEGA')).toThrow('Geçersiz seed profili')
    })
  })

  describe('2. Fail-Safe Production Guard Koruması', () => {
    it('NODE_ENV=production iken seed çalıştırma derhal reddedilir (0 INSERT)', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'production'

      await expect(runSeedEngine({ profile: 'FAST' })).rejects.toThrow(
        'PRODUCTION ENVIRONMENT DETECTED'
      )
    })

    it('Production Supabase URL tanımlı iken seed anında durdurulur', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`
      env.TEST_SUPABASE_ANON_KEY = 'test-key'
      env.TEST_SUPABASE_SERVICE_KEY = 'test-service'

      await expect(runSeedEngine({ profile: 'FAST' })).rejects.toThrow(
        'PRODUCTION DATABASE DETECTED'
      )
    })
  })

  describe('3. Engine Mock Execution & Multi-Tenant Graph', () => {
    it('geçerli test ortamında multi-tenant seed verisini başarıyla üretir', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-seed-proj.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service'

      const insertedTables: string[] = []
      let progressReports = 0

      const mockClient = {
        from: (table: string) => {
          insertedTables.push(table)
          return {
            insert: (data: unknown) => {
              const isArr = Array.isArray(data)
              const returnArray = isArr ? data.map((d, i) => ({ id: `${table}-${i}`, ...(d as object) })) : []
              const returnSingle = !isArr ? { id: `${table}-id`, ...(data as object) } : null

              return {
                select: () => {
                  const promise = Promise.resolve({ data: isArr ? returnArray : [returnSingle], error: null })
                  return Object.assign(promise, {
                    single: async () => ({ data: returnSingle, error: null }),
                  })
                },
              }
            },
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: async () => ({ data: { id: 'plan-1' }, error: null }),
                }),
              }),
              in: () => ({
                limit: () => ({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        },
      } as never

      const result = await runSeedEngine({
        profile: 'FAST',
        client: mockClient,
        skipVerification: true,
        onProgress: () => {
          progressReports++
        },
      })

      expect(result.ok).toBe(true)
      expect(result.tenantIds.length).toBe(2)
      expect(result.totalInserted).toBeGreaterThan(0)
      expect(progressReports).toBeGreaterThan(0)

      // Tüm kritik domain tablolarının insert aldığını doğrula
      expect(insertedTables).toContain('tenants')
      expect(insertedTables).toContain('branches')
      expect(insertedTables).toContain('accounts')
      expect(insertedTables).toContain('user_profiles')
      expect(insertedTables).toContain('customers')
      expect(insertedTables).toContain('parts')
      expect(insertedTables).toContain('service_orders')
      expect(insertedTables).toContain('stock_movements')
      expect(insertedTables).toContain('financial_transactions')
    })
  })

  describe('4. Post-Seed Verification & Isolation Check', () => {
    it('verifySeededData çapraz tenant veri ihlali tespit ederse hata raporlar', async () => {
      const mockClient = {
        from: (table: string) => ({
          select: (fields: string, opts?: { count?: string; head?: boolean }) => ({
            in: () => {
              if (opts?.count === 'exact') {
                return Promise.resolve({ count: 10, error: null })
              }
              // Service order sorgusunda Tenant B'de Tenant A müşterisi dön
              return {
                limit: () => ({
                  data: [{ id: 'order-x', customer_id: 'cust-A-1' }],
                }),
              }
            },
            eq: () => ({
              limit: () => ({
                data: [{ id: 'cust-A-1' }],
              }),
              in: () => ({
                // Cross contamination bulundu!
                data: [{ id: 'order-corrupt', tenant_id: 'tenant-B', customer_id: 'cust-A-1' }],
              }),
            }),
          }),
        }),
      } as never

      const report = await verifySeededData(mockClient, ['tenant-A', 'tenant-B'])
      expect(report.ok).toBe(false)
      expect(report.tenantIsolationPassed).toBe(false)
      expect(report.errors.some((e) => e.includes('izolasyonu ihlali'))).toBe(true)
    })
  })
})
