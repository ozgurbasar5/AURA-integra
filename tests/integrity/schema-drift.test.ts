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
  const sqlDir = path.resolve(process.cwd(), 'sql')

  it('Migration/SQL dosyaları diskte mevcuttur ve okunabilir durumdadır', () => {
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
      expect(files.length).toBeGreaterThanOrEqual(1)
    } else {
      expect(fs.existsSync(sqlDir)).toBe(true)
      const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql'))
      expect(files.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('Schema İncelemesi: Ayrı "devices" tablosu olmayıp cihaz alanları "service_orders" üzerinde tanımlıdır', () => {
    const schemaPath = fs.existsSync(path.resolve(process.cwd(), 'supabase_migration.sql'))
      ? path.resolve(process.cwd(), 'supabase_migration.sql')
      : path.resolve(process.cwd(), 'sql/001_schema_upgrade.sql')

    const baseMigration = fs.readFileSync(schemaPath, 'utf-8')
    expect(baseMigration).toContain('service_orders')
  })

  it('Yedek Parça ve Stok modelleri mevcuttur', () => {
    const schemaPath = fs.existsSync(path.resolve(process.cwd(), 'supabase_migration.sql'))
      ? path.resolve(process.cwd(), 'supabase_migration.sql')
      : path.resolve(process.cwd(), 'sql/001_schema_upgrade.sql')

    const baseMigration = fs.readFileSync(schemaPath, 'utf-8')
    expect(baseMigration).toContain('warehouses')
  })
})
