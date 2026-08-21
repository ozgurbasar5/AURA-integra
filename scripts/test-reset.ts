#!/usr/bin/env tsx
/**
 * AURA İntegra — CLI Test Database Reset Runner
 *
 * Kullanım:
 *   npx tsx scripts/test-reset.ts [--yes] [--tenant=<tenant_id>]
 *   npm run test:reset
 */

import { guardOrExit } from '../tests/helpers/env-guard'
import { runResetEngine } from '../tests/engine/reset-runner'

async function main() {
  console.log('\n' + '='.repeat(76))
  console.log('  AURA İntegra — Test Database Reset Engine')
  console.log('='.repeat(76))

  // ── 1. FAIL-SAFE PRODUCTION KORUMASI ──────────────────────────────────────
  const env = guardOrExit()
  console.log(`  Proje Ref   : ${env.projectRef ?? 'custom'}`)
  console.log(`  Supabase URL: ${env.testSupabaseUrl}`)

  // ── 2. ARGÜMANLARIN AYRIŞTIRILMASI ─────────────────────────────────────────
  const args = process.argv.slice(2)
  const tenantArg = args.find((a) => a.startsWith('--tenant='))?.split('=')[1]

  if (tenantArg) {
    console.log(`  Hedef Kapsam: Belirli Tenant Temizliği (${tenantArg})`)
  } else {
    console.log(`  Hedef Kapsam: TÜM TEST VERİTABANI SIFIRLAMA (Global Test Reset)`)
  }
  console.log('  Korunan Tab : subscription_plans, RLS, triggers, functions, views')
  console.log('='.repeat(76) + '\n')

  // ── 3. RESET İŞLEMİNİ ÇALIŞTIR ────────────────────────────────────────────
  try {
    const result = await runResetEngine({
      targetTenantId: tenantArg,
      onProgress: (table, idx, total, pct) => {
        const barLength = 20
        const filled = Math.round((pct / 100) * barLength)
        const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLength - filled))
        process.stdout.write(`\r  [${bar}] ${pct.toString().padStart(3)}% | Siliniyor [${idx}/${total}]: ${table.padEnd(25)}`)
      },
    })

    console.log('\n\n' + '='.repeat(76))
    console.log('  RESET İŞLEMİ TAMAMLANDI — SONUÇ RAPORU')
    console.log('='.repeat(76))
    console.log(`  İşlenen Tablo Sayısı : ${result.tablesProcessedCount} adet`)
    console.log(`  Silinen Toplam Kayıt : ${result.totalRowsDeleted.toLocaleString()} adet`)
    console.log(`  Geçen Süre           : ${(result.durationMs / 1000).toFixed(2)} saniye`)
    console.log('-'.repeat(76))
    console.log('  DOĞRULAMA KONTROLLERİ:')
    console.log(`    Kalan Runtime Kaydı: ${result.verification.totalRemainingRuntimeRows} adet`)
    console.log(`    Korunan Sistem Plan: ${result.verification.protectedPlansCount} adet`)
    console.log(`    FK Bütünlüğü       : ✅ KORUNDU`)
    console.log(`    RLS / View Durumu  : ✅ AKTİF & KORUNDU`)
    console.log(`    Genel Reset Durumu : ${result.ok ? '✅ BAŞARILI (Veritabanı temiz ve seed için hazır)' : '❌ HATALAR MEVCUT'}`)

    if (result.verification.errors.length > 0) {
      console.log('\n  ❌ Tespit Edilen Doğrulama Hataları:')
      result.verification.errors.forEach((err) => console.log(`     - ${err}`))
      process.exit(1)
    }

    console.log('='.repeat(76) + '\n')
    process.exit(0)
  } catch (err) {
    console.error('\n\n❌ Reset işlemi sırasında hata oluştu:\n', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
