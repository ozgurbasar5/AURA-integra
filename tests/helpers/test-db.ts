/**
 * AURA İntegra — Test Database Client
 *
 * Test ortamı için izole Supabase client oluşturur.
 * Production veritabanına kesinlikle bağlanmaz (env-guard ile korunur).
 *
 * Kullanım:
 *   const { serviceClient, cleanup } = createTestDbClient()
 *   // ... test işlemleri
 *   // serviceClient RLS'yi bypass eder (service_role)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertTestEnvironment } from './env-guard'

export interface TestDbClient {
  /** RLS'yi bypass eden service role client (factory/seed için) */
  serviceClient: SupabaseClient
  /** Test Supabase URL'si */
  url: string
  /** Test sonrası temizlik */
  cleanup: () => void
}

/**
 * Test ortamı için Supabase service client oluşturur.
 * İlk çağrıda env guard çalışır — production tespit edilirse hata fırlatır.
 */
export function createTestDbClient(): TestDbClient {
  const env = assertTestEnvironment()

  const serviceClient = createClient(
    env.testSupabaseUrl,
    env.testSupabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return {
    serviceClient,
    url: env.testSupabaseUrl,
    cleanup: () => {
      // Supabase JS client'ın explicit dispose'u yok,
      // ama gelecekte gerekirse burada temizlik yapılabilir.
    },
  }
}

/**
 * Belirli bir tenant için test-scoped veri temizliği.
 * Sadece test veritabanında çalışır (env guard korumalı).
 *
 * FK sırasını dikkate alarak yaprak tablolardan kök tablolara doğru temizler.
 */
export async function cleanupTestTenant(
  client: SupabaseClient,
  tenantId: string,
): Promise<void> {
  // ── Fail-safe: Asla production üzerinde çalışamaz ──
  assertTestEnvironment()

  if (!tenantId || tenantId.trim() === '') {
    throw new Error('cleanupTestTenant: Geçerli bir tenantId zorunludur.')
  }

  // FK bağımlılık sırasına göre (yaprak tablolardan köke doğru)
  const tablesInOrder = [
    'warranty_claims',
    'warranties',
    'service_expenses',
    'service_parts_used',
    'service_status_history',
    'stock_movements',
    'stock_transfers',
    'branch_part_stock',
    'financial_transactions',
    'notification_logs',
    'sms_logs',
    'audit_logs',
    'efatura_queue',
    'invoices',
    'sales',
    'service_orders',
    'appointments',
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
    'products',
    'parts',
    'suppliers',
    'customers',
    'cash_shifts',
    'personnel_profiles',
    'device_requests',
    'dealer_invoices',
    'dealer_orders',
    'dealers',
    'field_orders',
    'tenant_settings',
    'tenant_stock_summary',
    'tenant_ai_quotas',
    'ai_usage_logs',
    'support_tickets',
    'accounts',
    'branches',
    'user_profiles',
    'tenant_payments',
    'tenants',
  ]

  for (const table of tablesInOrder) {
    try {
      if (table === 'tenants') {
        await client.from(table).delete().eq('id', tenantId)
      } else {
        await client.from(table).delete().eq('tenant_id', tenantId)
      }
    } catch {
      // Tablo yoksa veya migration seviyesine göre farklıysa sessizce devam et
    }
  }
}

/**
 * Test veritabanı bağlantısını doğrular.
 * Hem bağlantıyı hem de temel tablo yapısını kontrol eder.
 */
export async function verifyTestDbConnection(): Promise<{
  ok: boolean
  tables: string[]
  message: string
}> {
  try {
    const { serviceClient } = createTestDbClient()

    // Basit bağlantı testi — subscription_plans public okuma
    const { data, error } = await serviceClient
      .from('subscription_plans')
      .select('id, name')
      .limit(1)

    if (error) {
      return {
        ok: false,
        tables: [],
        message: `❌ DB bağlantı hatası: ${error.message}`,
      }
    }

    // Kritik tabloların varlığını kontrol et
    const criticalTables = [
      'tenants',
      'user_profiles',
      'customers',
      'service_orders',
      'parts',
      'financial_transactions',
      'accounts',
    ]

    const existingTables: string[] = []
    for (const table of criticalTables) {
      const { error: tableErr } = await serviceClient
        .from(table)
        .select('id')
        .limit(0)

      if (!tableErr) {
        existingTables.push(table)
      }
    }

    const missingTables = criticalTables.filter(t => !existingTables.includes(t))
    if (missingTables.length > 0) {
      return {
        ok: false,
        tables: existingTables,
        message:
          `⚠️ Eksik tablolar: ${missingTables.join(', ')}\n` +
          'Test veritabanında migration çalıştırmanız gerekiyor.\n' +
          'supabase_migration.sql dosyasını test projesinin SQL Editor\'ünde çalıştırın.',
      }
    }

    return {
      ok: true,
      tables: existingTables,
      message: `✅ Test DB OK — ${existingTables.length} kritik tablo doğrulandı (plans: ${data?.length ?? 0} kayıt)`,
    }
  } catch (e) {
    return {
      ok: false,
      tables: [],
      message: `❌ ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
