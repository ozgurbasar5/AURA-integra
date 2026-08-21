/**
 * AURA İntegra — Test Environment Guard
 *
 * Production veritabanına test sırasında erişimi kesinlikle engeller.
 * Tüm seed/reset/integration scriptleri bu guard'ı ilk satırda çağırmalıdır.
 *
 * Güvenlik katmanları:
 * 1. NODE_ENV === 'production' → HARD FAIL
 * 2. SUPABASE_URL production projesi ref'ine veya domainine eşitse → HARD FAIL
 * 3. JWT anon_key / service_key production ref içeriyorsa → HARD FAIL
 * 4. Explicit TEST_SUPABASE_URL veya test env değişkenleri eksikse → HARD FAIL
 * 5. TEST_SUPABASE_PROJECT_REF production ref ile eşleşiyorsa → HARD FAIL
 */

/** Production Supabase projesinin ref'i (validate-env.ts ile tutarlı) */
export const PRODUCTION_PROJECT_REF = 'dipyrdidkvljojkyaqmd'

/** Bilinen production URL pattern'leri */
export const PRODUCTION_URL_PATTERNS = [
  PRODUCTION_PROJECT_REF,
  'integra.aurabilisim',
  'aurabilisim.net',
]

export function extractProjectRef(url: string | undefined | null): string | null {
  if (!url) return null
  const m = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i)
  return m?.[1] ?? null
}

export function extractJwtProjectRef(jwt: string | undefined | null): string | null {
  if (!jwt) return null
  try {
    const parts = jwt.split('.')
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      ) as { ref?: string }
      return payload.ref ?? null
    }
  } catch {
    // JWT parse hatası durumunda null dön
  }
  return null
}

export function isProductionUrl(url: string | undefined | null): boolean {
  if (!url) return false
  const lower = url.toLowerCase()

  // Pattern eşleşmesi
  if (PRODUCTION_URL_PATTERNS.some(p => lower.includes(p.toLowerCase()))) {
    return true
  }

  // Proje ref karşılaştırması
  const ref = extractProjectRef(url)
  if (ref && ref === PRODUCTION_PROJECT_REF) {
    return true
  }

  return false
}

export interface EnvGuardResult {
  ok: boolean
  testSupabaseUrl: string
  testSupabaseAnonKey: string
  testSupabaseServiceKey: string
  projectRef: string | null
  message: string
}

/**
 * Belirli bir URL ve Key kümesinin production olmadığını doğrular.
 */
export function assertNotProduction(
  url: string,
  anonKey?: string,
  serviceKey?: string,
): void {
  if (isProductionUrl(url)) {
    throw new Error(
      '🛑 PRODUCTION DATABASE DETECTED — ABORTING.\n' +
      `URL: ${url}\n` +
      `Production ref: ${PRODUCTION_PROJECT_REF}\n\n` +
      'Test scriptleri production veritabanına BAĞLANAMAZ.\n' +
      'Ayrı bir Supabase test projesi oluşturun ve .env.test dosyasını güncelleyin.'
    )
  }

  const urlRef = extractProjectRef(url)
  if (urlRef && urlRef === PRODUCTION_PROJECT_REF) {
    throw new Error(
      '🛑 PRODUCTION PROJECT REF DETECTED — ABORTING.\n' +
      `Ref: ${urlRef}\n` +
      'Test scriptleri production veritabanında çalıştırılamaz.'
    )
  }

  if (anonKey) {
    const anonRef = extractJwtProjectRef(anonKey)
    if (anonRef && anonRef === PRODUCTION_PROJECT_REF) {
      throw new Error(
        '🛑 PRODUCTION ANON KEY DETECTED — ABORTING.\n' +
        `Anon key ref: ${anonRef}\n` +
        'Test anon key production projesine ait.'
      )
    }
  }

  if (serviceKey) {
    const serviceRef = extractJwtProjectRef(serviceKey)
    if (serviceRef && serviceRef === PRODUCTION_PROJECT_REF) {
      throw new Error(
        '🛑 PRODUCTION SERVICE KEY DETECTED — ABORTING.\n' +
        `Service key ref: ${serviceRef}\n` +
        'Test service key production projesine ait. Ayrı test projesi key\'i kullanın.'
      )
    }
  }
}

/**
 * Test ortamı doğrulaması. Başarısızsa anlamlı hata fırlatır.
 * Production veritabanına bağlanmayı kesinlikle engeller.
 */
export function assertTestEnvironment(): EnvGuardResult {
  // ── 1. NODE_ENV kontrolü ──────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '🛑 PRODUCTION ENVIRONMENT DETECTED — TEST ÇALIŞTIRMASI DURDU.\n' +
      'Test scriptleri production ortamında çalıştırılamaz.\n' +
      'NODE_ENV=test olarak ayarlayın.'
    )
  }

  // ── 2. Explicit Proje Ref kontrolü (env üzerinden verilmişse) ─────────────
  const explicitRef = (process.env.TEST_SUPABASE_PROJECT_REF ?? '').trim()
  if (explicitRef && explicitRef === PRODUCTION_PROJECT_REF) {
    throw new Error(
      '🛑 TEST_SUPABASE_PROJECT_REF PRODUCTION İLE EŞLEŞİYOR — ABORTING.\n' +
      `Tanımlı Ref: ${explicitRef}\n` +
      `Production Ref: ${PRODUCTION_PROJECT_REF}\n` +
      'Test için ayrı bir Supabase projesi tanımlanmalıdır.'
    )
  }

  // ── 3. Test Supabase URL'si zorunluluğu ────────────────────────────────────
  const testUrl = (
    process.env.TEST_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim()

  const testAnonKey = (
    process.env.TEST_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim()

  const testServiceKey = (
    process.env.TEST_SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''
  ).trim()

  if (!testUrl) {
    throw new Error(
      '🛑 TEST SUPABASE URL BULUNAMADI.\n' +
      'Test çalıştırmak için .env.test dosyasında TEST_SUPABASE_URL tanımlayın.\n' +
      'Ayrı bir Supabase test projesi oluşturun — production projesi KULLANILAMAZ.'
    )
  }

  if (!testAnonKey) {
    throw new Error(
      '🛑 TEST SUPABASE ANON KEY BULUNAMADI.\n' +
      '.env.test dosyasında TEST_SUPABASE_ANON_KEY tanımlayın.'
    )
  }

  if (!testServiceKey) {
    throw new Error(
      '🛑 TEST SUPABASE SERVICE ROLE KEY BULUNAMADI.\n' +
      '.env.test dosyasında TEST_SUPABASE_SERVICE_KEY tanımlayın.\n' +
      'Service role key olmadan factory/seed scriptleri çalıştırılamaz.'
    )
  }

  // ── 4. Production koruması ────────────────────────────────────────────────
  assertNotProduction(testUrl, testAnonKey, testServiceKey)

  const urlRef = extractProjectRef(testUrl)

  return {
    ok: true,
    testSupabaseUrl: testUrl,
    testSupabaseAnonKey: testAnonKey,
    testSupabaseServiceKey: testServiceKey,
    projectRef: urlRef,
    message: `✅ Test environment OK (proje: ${urlRef ?? 'custom'})`,
  }
}

/**
 * Basit kontrol — seed/reset scriptlerinin başlangıcında kullanım için.
 * Production tespit edilirse process.exit(1) ile çıkar.
 */
export function guardOrExit(): EnvGuardResult {
  try {
    const result = assertTestEnvironment()
    console.log(result.message)
    return result
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}

