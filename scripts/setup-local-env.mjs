#!/usr/bin/env node
/**
 * .env.example → .env.local (lokal dev için güvenli varsayılanlar).
 * Vercel pull boş/eksik gelirse: node scripts/setup-local-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const examplePath = join(root, '.env.example')
const localPath = join(root, '.env.local')

if (!existsSync(examplePath)) {
  console.error('❌ .env.example bulunamadı')
  process.exit(1)
}

const lines = readFileSync(examplePath, 'utf8').split('\n')
const out = [
  '# Lokal geliştirme — scripts/setup-local-env.mjs ile oluşturuldu',
  '# Vercel: aura-integra-912o → npm run env:pull (production)',
  '',
]

for (const line of lines) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  if (!t.includes('=')) continue
  const key = t.slice(0, t.indexOf('=')).trim()
  const val = t.slice(t.indexOf('=') + 1).trim()
  if (!val) continue
  out.push(`${key}=${val}`)
}

writeFileSync(localPath, out.join('\n') + '\n', 'utf8')
console.log('✓ .env.local oluşturuldu (.env.example değerleri)')
console.log('  Vercel: aura-integra-912o → npm run env:pull (production)')
console.log('  ÖNEMLİ: Vercel Development ortamına da Supabase key ekleyin (boşsa env pull siler)')
console.log('  Sonra: npm run dev')
