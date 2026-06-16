#!/usr/bin/env node
/**
 * Push / deploy öncesi env kontrolü.
 * Kullanım: node scripts/verify-env.mjs
 * Lokal: .env.local okunmaz (Next.js runtime okur); bu script sadece process.env'e bakar.
 * Vercel: dashboard'daki değerler build sırasında enjekte edilir.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadDotEnvLocal() {
  const path = join(root, '.env.local')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const local = loadDotEnvLocal()
const get = (k) => process.env[k] || local[k] || ''

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((k) => !get(k))
const placeholder = required.filter((k) => {
  const v = get(k)
  return v.includes('placeholder') || v.includes('YOUR_PROJECT') || v.includes('your-anon') || v.includes('your-service')
})

if (missing.length) {
  console.error('❌ Eksik env:', missing.join(', '))
  console.error('   Lokal: .env.local oluşturun (.env.example şablonu)')
  console.error('   Vercel: Settings → Environment Variables')
  process.exit(1)
}

if (placeholder.length) {
  console.error('❌ Placeholder değerler:', placeholder.join(', '))
  console.error('   Supabase Dashboard → Settings → API → gerçek URL ve key yapıştırın')
  process.exit(1)
}

console.log('✓ Supabase env OK (URL + anon + service role)')
