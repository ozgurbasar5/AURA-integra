#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dir = path.join(root, 'supabase', 'migrations')

if (!fs.existsSync(dir)) {
  console.error('supabase/migrations klasörü bulunamadı')
  process.exit(1)
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
if (files.length === 0) {
  console.error('Migration dosyası yok')
  process.exit(1)
}

const bad = files.filter(f => !/^\d{8}_[a-z0-9_]+\.sql$/i.test(f))
if (bad.length) {
  console.error('Geçersiz migration adları:', bad.join(', '))
  process.exit(1)
}

console.log(`OK: ${files.length} migration dosyası (${files[files.length - 1]})`)
