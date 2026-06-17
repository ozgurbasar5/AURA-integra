#!/usr/bin/env node
/**
 * Supabase tablo durumu — sync hatalarını teşhis eder.
 * node scripts/check-sync-tables.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const path = join(root, '.env.local')
  if (!existsSync(path)) return process.env
  const out = { ...process.env }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[t.slice(0, i).trim()] = v
  }
  return out
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const TABLES = ['tenant_settings', 'showcase_devices', 'service_expenses', 'appointments']

console.log('Proje:', url.replace('https://', '').split('.')[0])
console.log('---')

  for (const table of TABLES) {
  const { data, error } = await admin.from(table).select('*').limit(1)

  if (error) {
    const hint = error.code === '42501' ? ' → 20260623_grant_erp_tables.sql çalıştırın' : ''
    console.log(`❌ ${table}: ${error.message} (code: ${error.code ?? 'n/a'})${hint}`)
  } else {
    const cols = data?.[0] ? Object.keys(data[0]).join(', ') : '(boş tablo)'
    console.log(`✓ ${table}: ok — kolonlar: ${cols}`)
  }
}

// RPC / fonksiyon kontrolü
const { error: fnErr } = await admin.rpc('get_current_tenant_id')
if (fnErr) {
  console.log(`\n⚠ get_current_tenant_id(): ${fnErr.message}`)
  console.log('   → 20260619_fix_rls_recursion.sql çalıştırın')
} else {
  console.log('\n✓ get_current_tenant_id() fonksiyonu mevcut')
}

const { data: tenants } = await admin.from('tenants').select('id, company_name').limit(3)
console.log('\nÖrnek tenant:', tenants?.map(t => `${t.company_name} (${t.id})`).join(', ') || 'yok')

if (tenants?.[0]) {
  const tid = tenants[0].id
  const { error: tsErr } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', tid)
    .maybeSingle()
  console.log(`tenant_settings[${tid.slice(0, 8)}…]:`, tsErr ? `❌ ${tsErr.message}` : '✓ ok (satır olmayabilir — normal)')
}
