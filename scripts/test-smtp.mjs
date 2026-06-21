#!/usr/bin/env node
/** SMTP bağlantı testi — node scripts/test-smtp.mjs [alici@email.com] */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('❌ .env.local bulunamadı')
    process.exit(1)
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const host = process.env.SMTP_HOST || 'smtp.gmail.com'
const port = Number(process.env.SMTP_PORT || 587)
const user = process.env.SMTP_EMAIL?.trim()
const pass = process.env.SMTP_PASSWORD?.trim()
const to = process.argv[2]?.trim() || user

if (!user || !pass) {
  console.error('❌ SMTP_EMAIL / SMTP_PASSWORD eksik (.env.local)')
  process.exit(1)
}

console.log(`→ ${host}:${port} kullanıcı=${user} alıcı=${to}`)

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: { minVersion: 'TLSv1.2' },
})

try {
  await transporter.verify()
  console.log('✓ SMTP bağlantısı OK')
  const info = await transporter.sendMail({
    from: `"AURA İntegra Test" <${user}>`,
    to,
    subject: 'AURA İntegra SMTP test',
    text: 'SMTP yapılandırması çalışıyor.',
    html: '<p>SMTP yapılandırması <strong>çalışıyor</strong>.</p>',
  })
  console.log('✓ Test maili gönderildi:', info.messageId)
} catch (e) {
  console.error('❌ SMTP hatası:', e instanceof Error ? e.message : e)
  process.exit(1)
}
