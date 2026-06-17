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

if (process.env.SKIP_ENV_VERIFY === '1') {
  console.log('SKIP_ENV_VERIFY=1 — env doğrulama atlandı (CI)')
  process.exit(0)
}

function parseEnvValue(raw) {
  const v = raw.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim()
  }
  return v
}

function loadDotEnvLocal() {
  const path = join(root, '.env.local')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = parseEnvValue(t.slice(i + 1))
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

const isVercelProd =
  process.env.VERCEL === '1' &&
  (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production')

if (isVercelProd) {
  const encKey = get('APP_ENCRYPTION_KEY')
  if (!encKey || encKey.length < 16) {
    console.error('❌ APP_ENCRYPTION_KEY eksik veya çok kısa (min 16 karakter)')
    console.error('   Vercel → Environment Variables → APP_ENCRYPTION_KEY')
    process.exit(1)
  }
  console.log('✓ APP_ENCRYPTION_KEY OK')
}
