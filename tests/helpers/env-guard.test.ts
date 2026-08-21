import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  assertTestEnvironment,
  assertNotProduction,
  guardOrExit,
  extractProjectRef,
  extractJwtProjectRef,
  isProductionUrl,
  PRODUCTION_PROJECT_REF,
} from './env-guard'
import { cleanupTestTenant } from './test-db'

/**
 * Faz 1 — Test Environment & Production Lock Güvenlik Testleri
 *
 * Doğrulanan kurallar:
 * 1. CASE 1: Production URL → HARD FAIL
 * 2. CASE 2: Production project ref (URL + JWT payload) → HARD FAIL
 * 3. CASE 3: NODE_ENV=production → HARD FAIL
 * 4. CASE 4: Test env eksik (URL, anon_key, service_key) → HARD FAIL
 * 5. CASE 5: Production/test ref collision → HARD FAIL
 * 6. CASE 6: Geçerli test ortamı → PASS
 * 7. Cleanup fail-safe: Production ortamında cleanup çağrısı → HARD FAIL
 * 8. CLI guardOrExit: Hata durumunda process.exit(1)
 */
describe('Faz 1 — Environment Guard & Production Lock', () => {
  const ORIG_ENV = { ...process.env }

  afterEach(() => {
    // Her test sonrası env'i orijinal haline getir
    process.env = { ...ORIG_ENV }
    vi.restoreAllMocks()
  })

  describe('1. CASE 1 & CASE 2: Production URL & Ref Koruması', () => {
    it('production project ref içeren Supabase URL engellenir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-service'

      expect(() => assertTestEnvironment()).toThrow('PRODUCTION DATABASE DETECTED')
    })

    it('production domain ("aurabilisim.net", "integra.aurabilisim") içeren URL engellenir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://integra.aurabilisim.net'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-service'

      expect(() => assertTestEnvironment()).toThrow('PRODUCTION DATABASE DETECTED')
    })

    it('JWT payload içinde production ref taşıyan service key engellenir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://validtestproject.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-anon'
      // JWT payload with production ref
      const prodPayload = Buffer.from(JSON.stringify({ ref: PRODUCTION_PROJECT_REF })).toString('base64url')
      env.TEST_SUPABASE_SERVICE_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${prodPayload}.signature`

      expect(() => assertTestEnvironment()).toThrow('PRODUCTION SERVICE KEY DETECTED')
    })

    it('JWT payload içinde production ref taşıyan anon key engellenir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://validtestproject.supabase.co'
      const prodPayload = Buffer.from(JSON.stringify({ ref: PRODUCTION_PROJECT_REF })).toString('base64url')
      env.TEST_SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${prodPayload}.signature`
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-service'

      expect(() => assertTestEnvironment()).toThrow('PRODUCTION ANON KEY DETECTED')
    })
  })

  describe('2. CASE 3: NODE_ENV Koruması', () => {
    it('NODE_ENV=production ise anında hata fırlatır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'production'
      env.TEST_SUPABASE_URL = 'https://validtestproject.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'test-key'
      env.TEST_SUPABASE_SERVICE_KEY = 'test-service'

      expect(() => assertTestEnvironment()).toThrow('PRODUCTION ENVIRONMENT DETECTED')
    })
  })

  describe('3. CASE 4: Eksik Environment Değişkenleri', () => {
    it('TEST_SUPABASE_URL yoksa hata fırlatır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      delete env.TEST_SUPABASE_URL
      delete env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => assertTestEnvironment()).toThrow('TEST SUPABASE URL BULUNAMADI')
    })

    it('TEST_SUPABASE_ANON_KEY yoksa hata fırlatır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://testproject123.supabase.co'
      delete env.TEST_SUPABASE_ANON_KEY
      delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      env.TEST_SUPABASE_SERVICE_KEY = 'test-service-key'

      expect(() => assertTestEnvironment()).toThrow('TEST SUPABASE ANON KEY BULUNAMADI')
    })

    it('TEST_SUPABASE_SERVICE_KEY yoksa hata fırlatır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://testproject123.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'test-anon-key'
      delete env.TEST_SUPABASE_SERVICE_KEY
      delete env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => assertTestEnvironment()).toThrow('TEST SUPABASE SERVICE ROLE KEY BULUNAMADI')
    })
  })

  describe('4. CASE 5: Production Ref Collision & TEST_SUPABASE_PROJECT_REF', () => {
    it('TEST_SUPABASE_PROJECT_REF production ref ile eşleşiyorsa engellenir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://testproject123.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'test-anon'
      env.TEST_SUPABASE_SERVICE_KEY = 'test-service'
      env.TEST_SUPABASE_PROJECT_REF = PRODUCTION_PROJECT_REF

      expect(() => assertTestEnvironment()).toThrow('TEST_SUPABASE_PROJECT_REF PRODUCTION İLE EŞLEŞİYOR')
    })
  })

  describe('5. CASE 6: Geçerli Test Ortamı Doğrulaması', () => {
    it('ayrı bir test projesi URL ve Keyleri ile başarılı doğrulanır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-test-proj.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-anon-valid'
      env.TEST_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiJ9.test-service-valid'

      const res = assertTestEnvironment()
      expect(res.ok).toBe(true)
      expect(res.testSupabaseUrl).toBe('https://isolated-test-proj.supabase.co')
      expect(res.projectRef).toBe('isolated-test-proj')
      expect(res.message).toContain('Test environment OK')
    })

    it('NEXT_PUBLIC_SUPABASE_URL fallback olarak güvenli test URL ise kabul edilir', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      delete env.TEST_SUPABASE_URL
      env.NEXT_PUBLIC_SUPABASE_URL = 'https://mytestproj.supabase.co'
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-fallback'
      env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-fallback'

      const res = assertTestEnvironment()
      expect(res.ok).toBe(true)
      expect(res.testSupabaseUrl).toBe('https://mytestproj.supabase.co')
    })
  })

  describe('6. Fail-Safe Helpers & Cleanup Koruması', () => {
    it('assertNotProduction helper fonksiyonu production parametrelerinde fırlatır', () => {
      expect(() =>
        assertNotProduction(`https://${PRODUCTION_PROJECT_REF}.supabase.co`)
      ).toThrow('PRODUCTION DATABASE DETECTED')

      expect(() =>
        assertNotProduction('https://validtest.supabase.co', undefined, undefined)
      ).not.toThrow()
    })

    it('guardOrExit hata durumunda process.exit(1) çağırır', () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'production'

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)
      guardOrExit()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('cleanupTestTenant production ortamında çağrılırsa hard fail eder', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'production'

      const mockClient = { from: vi.fn() } as never
      await expect(cleanupTestTenant(mockClient, 'tenant-test-id')).rejects.toThrow(
        'PRODUCTION ENVIRONMENT DETECTED'
      )
    })

    it('cleanupTestTenant boş tenantId ile çağrılırsa hata fırlatır', async () => {
      const env = process.env as Record<string, string | undefined>
      env.NODE_ENV = 'test'
      env.TEST_SUPABASE_URL = 'https://isolated-test-proj.supabase.co'
      env.TEST_SUPABASE_ANON_KEY = 'key'
      env.TEST_SUPABASE_SERVICE_KEY = 'key'

      const mockClient = { from: vi.fn() } as never
      await expect(cleanupTestTenant(mockClient, '')).rejects.toThrow('Geçerli bir tenantId zorunludur')
    })
  })

  describe('7. Helper Fonksiyonlar', () => {
    it('extractProjectRef URL den ref i çıkarır', () => {
      expect(extractProjectRef('https://abc123xyz.supabase.co')).toBe('abc123xyz')
      expect(extractProjectRef('https://integra.aurabilisim.net')).toBeNull()
      expect(extractProjectRef(null)).toBeNull()
    })

    it('extractJwtProjectRef JWT payload tan ref i çıkarır', () => {
      const payload = Buffer.from(JSON.stringify({ ref: 'my-proj-ref' })).toString('base64url')
      const token = `header.${payload}.sig`
      expect(extractJwtProjectRef(token)).toBe('my-proj-ref')
      expect(extractJwtProjectRef('invalid-token')).toBeNull()
    })

    it('isProductionUrl production pattern lerini tespit eder', () => {
      expect(isProductionUrl(`https://${PRODUCTION_PROJECT_REF}.supabase.co`)).toBe(true)
      expect(isProductionUrl('https://aurabilisim.net')).toBe(true)
      expect(isProductionUrl('https://test-isolated.supabase.co')).toBe(false)
    })
  })
})

