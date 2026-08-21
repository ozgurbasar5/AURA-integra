/**
 * AURA İntegra — Reset Engine
 *
 * Test veritabanını tek komutla sıfırlar.
 *
 * Güvenlik:
 * - `assertTestEnvironment()` ilk satırda çalışır.
 * - Production ortamında (URL, ref, NODE_ENV) 0 DELETE / 0 mutation ile derhal hard fail eder.
 *
 * Bütünlük & Bağımlılık (FK Dependency Order):
 * - Yaprak tablolardan (Grandchild/Child) kök tablolara (Parent/Tenants) doğru sıralı temizlik yapar.
 * - Sistem tanımları (subscription_plans, RLS, triggers, functions, views) korunur.
 * - Idempotent'tir (boş DB'de veya art arda çalıştırıldığında hata vermez).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { assertTestEnvironment } from '../helpers/env-guard'

/**
 * Foreign Key bağımlılık sırasına göre runtime temizleme listesi.
 * (Grandchild → Child → Parent → Root)
 */
export const RUNTIME_TABLES_CLEANUP_ORDER: string[] = [
  // 1. Grandchild Tablolar (En alt bağımlılıklar)
  'warranty_claims',
  'service_expenses',
  'service_parts_used',
  'service_status_history',
  'branch_part_stock',
  'stock_transfers',

  // 2. Child Tablolar (Servis, Garanti, Stok, Finans, İletişim)
  'warranties',
  'stock_movements',
  'financial_transactions',
  'notification_logs',
  'sms_logs',
  'audit_logs',
  'efatura_queue',
  'invoices',
  'sales',
  'appointments',
  'service_orders',
  'supplier_orders',
  'customer_orders',
  'showcase_devices',
  'foreign_devices',
  'deals',
  'campaigns',
  'assets',
  'store_products',
  'second_hand_purchases',
  'purchases',
  'todos',
  'stolen_imeis',
  'cash_shifts',
  'device_requests',
  'dealer_invoices',
  'dealer_orders',
  'field_orders',
  'tenant_settings',
  'tenant_stock_summary',
  'tenant_ai_quotas',
  'ai_usage_logs',
  'support_tickets',

  // 3. Parent Tablolar (Müşteri, Parça, Ürün, Tedarikçi, Bayi)
  'products',
  'parts',
  'suppliers',
  'customers',
  'personnel_profiles',
  'dealers',
  'accounts',
  'branches',
  'user_profiles',
  'tenant_payments',

  // 4. Root Tablo
  'tenants',
]

/**
 * Korunan sistem tabloları (Asla silinmemeli).
 */
export const PROTECTED_SYSTEM_TABLES: string[] = [
  'subscription_plans',
]

export interface ResetOptions {
  client?: SupabaseClient
  targetTenantId?: string
  keepSubscriptionPlans?: boolean
  onProgress?: (tableName: string, index: number, total: number, percentage: number) => void
}

export interface ResetTableReport {
  tableName: string
  deletedCount: number
  status: 'ok' | 'skipped' | 'failed'
  error?: string
}

export interface ResetVerificationReport {
  ok: boolean
  totalRemainingRuntimeRows: number
  remainingByTable: Record<string, number>
  protectedPlansCount: number
  errors: string[]
}

export interface ResetExecutionResult {
  ok: boolean
  isGlobalReset: boolean
  targetTenantId?: string
  tablesProcessedCount: number
  totalRowsDeleted: number
  durationMs: number
  tableReports: ResetTableReport[]
  verification: ResetVerificationReport
  message: string
}

/**
 * Test Veritabanı Sıfırlama Motoru.
 */
export async function runResetEngine(
  options: ResetOptions = {},
): Promise<ResetExecutionResult> {
  // ── 1. FAIL-SAFE PRODUCTION GUARD ──────────────────────────────────────────
  assertTestEnvironment()

  const startTime = Date.now()

  // Client hazırlığı
  let client = options.client
  if (!client) {
    const { createTestDbClient } = await import('../helpers/test-db')
    const testDb = createTestDbClient()
    client = testDb.serviceClient
  }

  const isGlobal = !options.targetTenantId
  const tables = [...RUNTIME_TABLES_CLEANUP_ORDER]
  const tableReports: ResetTableReport[] = []
  let totalRowsDeleted = 0

  // ── 2. BAĞIMLILIK SIRASINA GÖRE SİLME ──────────────────────────────────────
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    const percentage = Math.round(((i + 1) / tables.length) * 100)

    if (options.onProgress) {
      options.onProgress(table, i + 1, tables.length, percentage)
    }

    try {
      let query = client.from(table)

      if (isGlobal) {
        // Global reset: Tablodaki tüm test verilerini sil
        // Supabase JS client delete() koşul gerektirir, id null olmayan veya non-empty koşul verilir
        const { error, count } = await query
          .delete({ count: 'exact' })
          .not('id', 'is', null)

        if (error) {
          // Tablo mevcut olmayabilir veya RLS/migration farkı olabilir
          tableReports.push({
            tableName: table,
            deletedCount: 0,
            status: error.code === '42P01' ? 'skipped' : 'failed', // 42P01: undefined table
            error: error.message,
          })
        } else {
          const deleted = count ?? 0
          totalRowsDeleted += deleted
          tableReports.push({
            tableName: table,
            deletedCount: deleted,
            status: 'ok',
          })
        }
      } else {
        // Belirli bir tenant'ın verilerini sil
        const tenantId = options.targetTenantId!
        const filterCol = table === 'tenants' ? 'id' : 'tenant_id'
        const { error, count } = await query
          .delete({ count: 'exact' })
          .eq(filterCol, tenantId)

        if (error) {
          tableReports.push({
            tableName: table,
            deletedCount: 0,
            status: error.code === '42P01' ? 'skipped' : 'failed',
            error: error.message,
          })
        } else {
          const deleted = count ?? 0
          totalRowsDeleted += deleted
          tableReports.push({
            tableName: table,
            deletedCount: deleted,
            status: 'ok',
          })
        }
      }
    } catch (err) {
      tableReports.push({
        tableName: table,
        deletedCount: 0,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const durationMs = Date.now() - startTime

  // ── 3. POST-RESET DOĞRULAMA ────────────────────────────────────────────────
  const verification = await verifyResetState(client, options)

  const ok = verification.ok && !tableReports.some((r) => r.status === 'failed')

  return {
    ok,
    isGlobalReset: isGlobal,
    targetTenantId: options.targetTenantId,
    tablesProcessedCount: tables.length,
    totalRowsDeleted,
    durationMs,
    tableReports,
    verification,
    message: ok
      ? `✅ Reset başarıyla tamamlandı: ${tables.length} tablo işlendi, ${totalRowsDeleted} kayıt silindi (${(durationMs / 1000).toFixed(2)}s)`
      : `❌ Reset tamamlandı ancak bazı tablolarda doğrulama hatası tespit edildi.`,
  }
}

/**
 * Sıfırlama sonrası veritabanı durumunu doğrular.
 */
export async function verifyResetState(
  client: SupabaseClient,
  options: ResetOptions = {},
): Promise<ResetVerificationReport> {
  const errors: string[] = []
  const remainingByTable: Record<string, number> = {}
  let totalRemainingRuntimeRows = 0

  // 1. Kritik runtime tablolarında kalan veri kontrolü
  const checkTables = [
    'tenants',
    'branches',
    'accounts',
    'user_profiles',
    'customers',
    'parts',
    'products',
    'service_orders',
    'stock_movements',
    'financial_transactions',
    'warranties',
    'warranty_claims',
  ]

  for (const table of checkTables) {
    try {
      let query = client.from(table).select('*', { count: 'exact', head: true })

      if (options.targetTenantId) {
        const col = table === 'tenants' ? 'id' : 'tenant_id'
        query = query.eq(col, options.targetTenantId)
      }

      const { count, error } = await query
      if (error) {
        // Tablo henüz mevcut değilse yok say
        if (error.code !== '42P01') {
          errors.push(`Tablo [${table}] sayım hatası: ${error.message}`)
        }
      } else {
        const c = count ?? 0
        remainingByTable[table] = c
        totalRemainingRuntimeRows += c
        if (c > 0) {
          errors.push(`Tablo [${table}] içinde sıfırlanmamış ${c} adet kayıt kaldı.`)
        }
      }
    } catch {
      // Hata yakalama
    }
  }

  // 2. Korunan sistem tabloları kontrolü (subscription_plans)
  let protectedPlansCount = 0
  try {
    const { count: plansCount } = await client
      .from('subscription_plans')
      .select('*', { count: 'exact', head: true })

    protectedPlansCount = plansCount ?? 0
    if (protectedPlansCount === 0) {
      // Plan tablosu boş ise (opsiyonel uyarı, seed kendisi oluşturabilir)
    }
  } catch {
    // Plans tablosu yoksa
  }

  const ok = errors.length === 0 && totalRemainingRuntimeRows === 0

  return {
    ok,
    totalRemainingRuntimeRows,
    remainingByTable,
    protectedPlansCount,
    errors,
  }
}
