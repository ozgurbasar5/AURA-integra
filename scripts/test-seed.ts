#!/usr/bin/env tsx
/**
 * AURA İntegra — CLI Test Database Seed Runner
 *
 * Kullanım:
 *   npx tsx scripts/test-seed.ts [fast|normal|stress] [--seed=12345] [--skip-verify]
 *   npm run test:seed:fast
 *   npm run test:seed:normal
 *   npm run test:seed:stress
 */

import { guardOrExit } from '../tests/helpers/env-guard'
import { resolveSeedProfile } from '../tests/config/seed-profiles.config'
import { runSeedEngine } from '../tests/engine/seed-engine'

async function main() {
  console.log('\n' + '='.repeat(76))
  console.log('  AURA İntegra — Test Database Seed Engine')
  console.log('='.repeat(76))

  // ── 1. FAIL-SAFE PRODUCTION KORUMASI ──────────────────────────────────────
  const env = guardOrExit()
  console.log(`  Proje Ref   : ${env.projectRef ?? 'custom'}`)
  console.log(`  Supabase URL: ${env.testSupabaseUrl}`)

  // ── 2. ARGÜMANLARIN AYRIŞTIRILMASI ─────────────────────────────────────────
  const args = process.argv.slice(2)
  const profileArg = args.find((a) => !a.startsWith('--')) ?? 'FAST'
  const seedArg = args.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? process.env.SEED
  const skipVerify = args.includes('--skip-verify')

  const profile = resolveSeedProfile(profileArg)
  const seedNumber = seedArg ? parseInt(seedArg, 10) : undefined

  console.log(`  Profil      : ${profile.name} (${profile.description})`)
  if (seedNumber !== undefined) {
    console.log(`  Seed Değeri : ${seedNumber} (Deterministik mod)`)
  }
  console.log('='.repeat(76) + '\n')

  const startTime = Date.now()

  // ── 3. SEED MOTORUNU ÇALIŞTIR ─────────────────────────────────────────────
  try {
    const result = await runSeedEngine({
      profile,
      seedNumber,
      skipVerification: skipVerify,
      onProgress: (p) => {
        const barLength = 20
        const filled = Math.round((p.percentage / 100) * barLength)
        const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLength - filled))
        process.stdout.write(`\r  [${bar}] ${p.percentage.toString().padStart(3)}% | ${p.step.padEnd(12)} : ${p.message.slice(0, 45)}`)
      },
    })

    console.log('\n\n' + '='.repeat(76))
    console.log('  SEED İŞLEMİ TAMAMLANDI — SONUÇ RAPORU')
    console.log('='.repeat(76))
    console.log(`  Profil              : ${result.profileName}`)
    console.log(`  Toplam Kayıt        : ${result.totalInserted.toLocaleString()} adet`)
    console.log(`  Süre                : ${(result.durationMs / 1000).toFixed(2)} saniye`)
    console.log(`  Hız                 : ${result.rowsPerSec.toLocaleString()} kayıt/saniye`)
    console.log(`  Bellek Artışı       : ${result.memoryUsageMB} MB`)
    console.log('-'.repeat(76))
    console.log('  DOĞRULANAN VERİTABANI SAYILARI:')
    console.log(`    Tenants (Bayiler) : ${result.verification.counts.tenants}`)
    console.log(`    Branches (Şubeler): ${result.verification.counts.branches}`)
    console.log(`    Accounts (Hesaplar): ${result.verification.counts.accounts}`)
    console.log(`    Personel / Tech   : ${result.verification.counts.technicians}`)
    console.log(`    Customers (Müşteri): ${result.verification.counts.customers}`)
    console.log(`    Parts (Yedek Parça): ${result.verification.counts.parts}`)
    console.log(`    Products (Ürünler): ${result.verification.counts.products}`)
    console.log(`    Service Orders    : ${result.verification.counts.services}`)
    console.log(`    Stock Movements   : ${result.verification.counts.stockMovements}`)
    console.log(`    Transactions (Fin): ${result.verification.counts.transactions}`)
    console.log(`    Warranties        : ${result.verification.counts.warranties}`)
    console.log(`    Warranty Claims   : ${result.verification.counts.warrantyClaims}`)
    console.log('-'.repeat(76))
    console.log(`  Tenant İzolasyonu   : ${result.verification.tenantIsolationPassed ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`)
    console.log(`  Orphan Kayıt Kontrol: ${result.verification.orphanCheckPassed ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`)
    console.log(`  Doğrulama Sonucu    : ${result.verification.ok ? '✅ TÜM KONTROLLER BAŞARILI' : '❌ HATALAR MEVCUT'}`)

    if (result.verification.errors.length > 0) {
      console.log('\n  ❌ Tespit Edilen Hatalar:')
      result.verification.errors.forEach((err) => console.log(`     - ${err}`))
      process.exit(1)
    }

    console.log('='.repeat(76) + '\n')
    process.exit(0)
  } catch (err) {
    console.error('\n\n❌ Seed işlemi sırasında hata oluştu:\n', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
