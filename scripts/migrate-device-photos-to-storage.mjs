#!/usr/bin/env node
/**
 * Mevcut base64 device_images → Supabase Storage URL migrasyonu.
 * Kullanım: node scripts/migrate-device-photos-to-storage.mjs [--dry-run]
 * Gereksinim: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli')
  process.exit(1)
}

const supabase = createClient(url, key)
const BUCKET = 'device-photos'

function isDataUrl(s) {
  return typeof s === 'string' && s.startsWith('data:image/')
}

async function main() {
  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, tenant_id, device_images')
    .not('device_images', 'eq', '[]')

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  let migrated = 0
  let skipped = 0

  for (const order of orders ?? []) {
    const images = Array.isArray(order.device_images) ? order.device_images : []
    const dataUrls = images.filter(isDataUrl)
    if (!dataUrls.length) {
      skipped++
      continue
    }

    const newUrls = images.filter(img => !isDataUrl(img))

    for (let i = 0; i < dataUrls.length; i++) {
      const dataUrl = dataUrls[i]
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) continue

      const mime = match[1]
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
      const buffer = Buffer.from(match[2], 'base64')
      const path = `${order.tenant_id}/${order.id}/migrated-${Date.now()}-${i}.${ext}`

      if (dryRun) {
        console.log(`[dry-run] ${order.id} → ${path} (${buffer.length} bytes)`)
        newUrls.push(`https://example.com/${path}`)
        continue
      }

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: mime, upsert: true })

      if (upErr) {
        console.error(`Upload failed ${order.id}:`, upErr.message)
        newUrls.push(dataUrl)
        continue
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      newUrls.push(pub.publicUrl)
    }

    if (!dryRun) {
      await supabase
        .from('service_orders')
        .update({ device_images: newUrls })
        .eq('id', order.id)
    }
    migrated++
    console.log(`✓ ${order.id}: ${dataUrls.length} fotoğraf migrasyon`)
  }

  console.log(`\nTamamlandı: ${migrated} kayıt migrasyon, ${skipped} atlandı${dryRun ? ' (dry-run)' : ''}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
