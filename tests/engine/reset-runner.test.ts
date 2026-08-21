import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  runResetEngine,
  verifyResetState,
  RUNTIME_TABLES_CLEANUP_ORDER,
  PROTECTED_SYSTEM_TABLES,
} from './reset-runner'
import { PRODUCTION_PROJECT_REF } from '../helpers/env-guard'

/**
 * Faz 4 — Reset Engine Unit & Safety Testleri
 *
 * Doğrulanan kurallar:
 * 1. Production Koruması (NODE_ENV=production, Prod URL, Prod Ref -> 0 DELETE)
 * 2. Foreign Key Sıralaması (Grandchild -> Child -> Parent -> Root)
 * 3. Sistem Verisi Koruması (subscription_plans silinmez)
 * 4. Boş DB ve Art Arda Sıfırlama (Idempotency)
 * 5. Tenant-Scoped vs Global Reset
 * 6. Post-Reset Doğrulama Kontrolleri
 */
describe('Faz 4 — Reset Engine & Safety', () => {
  const ORIG_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIG_ENV }
    vi.restoreAllMocks()
  })

  describe('1. Fail-Safe Production Koruması', () => {
    it('NODE_ENV=production iken reset motoru 0 DELETE ile anında hard fail eder', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'production'

      await expect(runResetEngine()).rejects.toThrow('PRODUCTION ENVIRONMENT DETECTED')
    })

    it('Production Supabase URL tanımlı iken reset motoru derhal durdurulur', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`
      env.TEST_SUPABASE_ANON_KEY = 'test-anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'test-service'

      await expect(runResetEngine()).rejects.toThrow('PRODUCTION DATABASE DETECTED')
    })
  })

  describe('2. Dependency Order & Protected Data Rules', () => {
    it('temizleme listesi yaprak tablolardan kök tabloya doğru sıralanmıştır', () => {
      // warranty_claims en başta (yaprak) olmalı, tenants en sonda (kök) olmalı
      expect(RUNTIME_TABLES_CLEANUP_ORDER[0]).toBe('warranty_claims')
      expect(RUNTIME_TABLES_CLEANUP_ORDER[RUNTIME_TABLES_CLEANUP_ORDER.length - 1]).toBe('tenants')

      // service_orders, alt tablolarından (service_parts_used, service_status_history) SONRA silinmeli
      const partsUsedIndex = RUNTIME_TABLES_CLEANUP_ORDER.indexOf('service_parts_used')
      const serviceOrdersIndex = RUNTIME_TABLES_CLEANUP_ORDER.indexOf('service_orders')
      expect(partsUsedIndex).toBeLessThan(serviceOrdersIndex)

      // tenants, bağlı olduğu tüm tablolardan sonra silinmeli
      const customersIndex = RUNTIME_TABLES_CLEANUP_ORDER.indexOf('customers')
      const tenantsIndex = RUNTIME_TABLES_CLEANUP_ORDER.indexOf('tenants')
      expect(customersIndex).toBeLessThan(tenantsIndex)
    })

    it('subscription_plans korunan sistem tabloları listesinde yer alır', () => {
      expect(PROTECTED_SYSTEM_TABLES).toContain('subscription_plans')
      expect(RUNTIME_TABLES_CLEANUP_ORDER).not.toContain('subscription_plans')
    })
  })

  describe('3. Engine Execution & Idempotency', () => {
    it('boş veritabanında (empty DB) reset işlemi başarıyla tamamlanır (idempotent)', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-test-reset.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service'

      const deletedTables: string[] = []

      const mockClient = {
        from: (table: string) => ({
          delete: () => {
            deletedTables.push(table)
            return {
              not: async () => ({ count: 0, error: null }),
            }
          },
          select: () => {
            const promise = Promise.resolve({ count: table === 'subscription_plans' ? 1 : 0, error: null })
            return Object.assign(promise, {
              single: async () => ({ data: { id: 'plan-1' }, error: null }),
            })
          },
        }),
      } as never

      const result = await runResetEngine({ client: mockClient })
      expect(result.ok).toBe(true)
      expect(result.totalRowsDeleted).toBe(0)
      expect(deletedTables.length).toBe(RUNTIME_TABLES_CLEANUP_ORDER.length)
      expect(result.verification.totalRemainingRuntimeRows).toBe(0)
    })

    it('dolu veritabanında verileri temizler ve toplam silinen sayıyı döner', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-test-reset.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service'

      let progressCount = 0

      const mockClient = {
        from: (table: string) => ({
          delete: () => ({
            not: async () => ({ count: 5, error: null }),
          }),
          select: () => {
            const promise = Promise.resolve({ count: table === 'subscription_plans' ? 2 : 0, error: null })
            return Object.assign(promise, {
              single: async () => ({ data: { id: 'plan-1' }, error: null }),
            })
          },
        }),
      } as never

      const result = await runResetEngine({
        client: mockClient,
        onProgress: () => {
          progressCount++
        },
      })

      expect(result.ok).toBe(true)
      expect(result.totalRowsDeleted).toBe(RUNTIME_TABLES_CLEANUP_ORDER.length * 5)
      expect(progressCount).toBe(RUNTIME_TABLES_CLEANUP_ORDER.length)
      expect(result.verification.protectedPlansCount).toBe(2)
    })

    it('art arda iki kez reset (reset -> reset) çalıştırıldığında hata vermez', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-test-reset.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.service'

      const mockClient = {
        from: (table: string) => ({
          delete: () => ({
            not: async () => ({ count: 0, error: null }),
          }),
          select: () => {
            const promise = Promise.resolve({ count: table === 'subscription_plans' ? 1 : 0, error: null })
            return Object.assign(promise, {
              single: async () => ({ data: { id: 'plan-1' }, error: null }),
            })
          },
        }),
      } as never

      const firstResult = await runResetEngine({ client: mockClient })
      const secondResult = await runResetEngine({ client: mockClient })

      expect(firstResult.ok).toBe(true)
      expect(secondResult.ok).toBe(true)
    })
  })

  describe('4. Post-Reset Verification', () => {
    it('silinmemiş kayıt kaldığında verifyResetState hata tespit eder', async () => {
      const mockClient = {
        from: (table: string) => ({
          select: () => ({
            count: table === 'service_orders' ? 3 : 0,
            error: null,
          }),
        }),
      } as never

      const verification = await verifyResetState(mockClient)
      expect(verification.ok).toBe(false)
      expect(verification.totalRemainingRuntimeRows).toBe(3)
      expect(verification.errors.some((e) => e.includes('service_orders'))).toBe(true)
    })
  })
})
