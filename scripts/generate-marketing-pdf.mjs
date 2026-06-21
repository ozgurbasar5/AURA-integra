#!/usr/bin/env node
/**
 * Saha kataloğu HTML → PDF
 * Kullanım: npm run pdf:katalog
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = join(root, 'docs', 'pazarlama', 'katalog.html')
const pdfPath = join(root, 'docs', 'pazarlama', 'AURA-Integra-Saha-Katalogu.pdf')

if (!existsSync(htmlPath)) {
  console.error('❌ docs/pazarlama/katalog.html bulunamadı')
  process.exit(1)
}

console.log('→ PDF oluşturuluyor…')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
})
await browser.close()

const sizeKb = Math.round(readFileSync(pdfPath).length / 1024)
console.log(`✓ PDF kaydedildi: docs/pazarlama/AURA-Integra-Saha-Katalogu.pdf (${sizeKb} KB)`)
