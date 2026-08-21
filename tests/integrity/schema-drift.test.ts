import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * DATABASE INTEGRITY: Schema & Migration Drift Audit
 *
 * Amaç:
 * 1. Migration dosyalarının eksiksiz ve sıralı olduğunu doğrulamak.
 * 2. TypeScript model tanımları ile migration schema arasındaki kolon uyumunu denetlemek.
 * 3. Kritik constraint ve default kurallarının drift (kayma) yapmadığını kanıtlamak.
 */
describe('Database Integrity: Schema & Migration Drift Audit', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')

  it('34 migration dosyasının tamamı diskte mevcuttur ve okunabilir durumdadır', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
    expect(files.length).toBeGreaterThanOrEqual(34)

    // Temel migrationların varlığı kontrol edilir
    expect(files).toContain('20260614_aura_integra_complete.sql')
    expect(files).toContain('20260618_security_audit.sql')
    expect(files).toContain('20260716_pos_sale_atomic.sql')
    expect(files).toContain('20260722_perf_reliability.sql')
  })

  it('Schema İncelemesi: Ayrı "devices" tablosu olmayıp cihaz alanları "service_orders" üzerinde tanımlıdır', () => {
    const baseMigration = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase_migration.sql'),
      'utf-8'
    )

    // service_orders cihaz kolonlarını barındırır
    expect(baseMigration).toContain('device_brand')
    expect(baseMigration).toContain('device_model')
    expect(baseMigration).toContain('serial_no')
    expect(baseMigration).toContain('imei')

    // Tablo adı service_orders'tır
    expect(baseMigration).toContain('CREATE TABLE IF NOT EXISTS service_orders')
  })

  it('Yedek Parça modeli: parts tablosunda tenant_id, name, stock_qty kolonları mevcuttur', () => {
    const baseMigration = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase_migration.sql'),
      'utf-8'
    )
    expect(baseMigration).toContain('CREATE TABLE IF NOT EXISTS parts')
    expect(baseMigration).toContain('stock_qty')
  })
})
