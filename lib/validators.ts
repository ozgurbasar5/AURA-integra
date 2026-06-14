// lib/validators.ts — Türkiye'ye özgü validasyon fonksiyonları + Zod şemaları
import { z } from 'zod'

// ─── TC Kimlik No Validasyonu (11 hane, Luhn benzeri) ────────────────────────
export function validateTCKN(tc: string): boolean {
  if (!tc || tc.length !== 11 || tc[0] === '0') return false
  if (!/^\d{11}$/.test(tc)) return false

  const d = tc.split('').map(Number)
  let oddSum = 0, evenSum = 0
  for (let i = 0; i < 9; i += 2) oddSum += d[i]
  for (let i = 1; i < 8; i += 2) evenSum += d[i]

  const d10 = ((oddSum * 7) - evenSum) % 10
  const check10 = d10 < 0 ? d10 + 10 : d10
  if (check10 !== d[9]) return false

  let sum = 0
  for (let i = 0; i < 10; i++) sum += d[i]
  if (sum % 10 !== d[10]) return false

  return true
}

// ─── VKN Validasyonu (10 hane) ──────────────────────────────────────────────
export function validateVKN(vkn: string): boolean {
  if (!vkn || vkn.length !== 10 || !/^\d{10}$/.test(vkn)) return false
  const d = vkn.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let v = (d[i] + (9 - i)) % 10
    sum += (v * Math.pow(2, 9 - i)) % 9
    if (v === 0 && (9 - i) !== 0) sum += 9
  }
  return (10 - (sum % 10)) % 10 === d[9]
}

// ─── IMEI Validasyonu (15 hane Luhn) ────────────────────────────────────────
export function validateIMEI(imei: string): boolean {
  if (!imei || imei.length !== 15 || !/^\d{15}$/.test(imei)) return false
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i])
    if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

// ─── Türk Telefon Formatı ───────────────────────────────────────────────────
export function formatPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('90') && clean.length === 12) return `+${clean}`
  if (clean.startsWith('0') && clean.length === 11) return `+90${clean.slice(1)}`
  if (clean.length === 10) return `+90${clean}`
  return phone
}

export function validatePhoneNumber(phone: string): boolean {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('90')) return clean.length === 12 && clean[2] === '5'
  if (clean.startsWith('0')) return clean.length === 11 && clean[1] === '5'
  if (clean.length === 10) return clean[0] === '5'
  return false
}

export function formatPhoneDisplay(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  const num = clean.startsWith('90') ? clean.slice(2) : clean.startsWith('0') ? clean.slice(1) : clean
  if (num.length !== 10) return phone
  return `0${num.slice(0,3)} ${num.slice(3,6)} ${num.slice(6,8)} ${num.slice(8,10)}`
}

// ─── KDV Hesaplama ──────────────────────────────────────────────────────────
export const KDV_RATES = [1, 10, 20] as const
export type KDVRate = typeof KDV_RATES[number]

export function calculateKDV(amount: number, rate: KDVRate = 20) {
  const kdv = Math.round(amount * rate) / 100
  return { subtotal: amount, kdv, total: amount + kdv }
}

export function calculateKDVInverse(totalWithKdv: number, rate: KDVRate = 20) {
  const subtotal = Math.round(totalWithKdv * 100 / (100 + rate) * 100) / 100
  const kdv = Math.round((totalWithKdv - subtotal) * 100) / 100
  return { subtotal, kdv, total: totalWithKdv }
}

// ─── Para Formatı ───────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 2,
  }).format(amount)
}

export function formatCurrencyShort(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Tarih Formatları ───────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Az önce'
  if (m < 60) return `${m} dk önce`
  if (h < 24) return `${h} sa önce`
  if (d < 30) return `${d} gün önce`
  return formatDate(date)
}

// ─── Zod Şemaları ───────────────────────────────────────────────────────────

export const tcNoSchema = z.string().length(11, 'TC Kimlik No 11 haneli olmalı').refine(validateTCKN, 'Geçersiz TC Kimlik No')

export const vknSchema = z.string().length(10, 'VKN 10 haneli olmalı').refine(validateVKN, 'Geçersiz VKN')

export const phoneSchema = z.string().min(10, 'Telefon numarası gerekli').refine(validatePhoneNumber, 'Geçersiz telefon numarası')

export const imeiSchema = z.string().length(15, 'IMEI 15 haneli olmalı').refine(validateIMEI, 'Geçersiz IMEI numarası')

export const customerSchema = z.object({
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter'),
  phone: phoneSchema,
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  address: z.string().optional(),
  tc_no: z.string().optional().refine(v => !v || validateTCKN(v), 'Geçersiz TC'),
  vkn: z.string().optional().refine(v => !v || validateVKN(v), 'Geçersiz VKN'),
  customer_type: z.enum(['bireysel', 'kurumsal', 'bayi']).default('bireysel'),
  company_name: z.string().optional(),
  sms_allowed: z.boolean().default(false),
  email_allowed: z.boolean().default(false),
  kvkk_consent_date: z.string().optional(),
})

export const serviceOrderSchema = z.object({
  customer_id: z.string().uuid('Müşteri seçilmeli'),
  device_brand: z.string().min(1, 'Marka seçilmeli'),
  device_model: z.string().min(1, 'Model girilmeli'),
  imei: z.string().optional().refine(v => !v || validateIMEI(v), 'Geçersiz IMEI'),
  serial_no: z.string().optional(),
  device_color: z.string().optional(),
  lock_code: z.string().optional(),
  fault_description: z.string().min(5, 'Arıza açıklaması en az 5 karakter'),
  customer_statement: z.string().optional(),
  priority: z.enum(['normal', 'acil', 'garantili']).default('normal'),
  accessories: z.array(z.string()).default([]),
  estimated_cost: z.number().min(0).optional(),
  estimated_delivery: z.string().optional(),
  technician_id: z.string().uuid().optional(),
  kdv_rate: z.number().default(20),
})

export const partSchema = z.object({
  name: z.string().min(2, 'Parça adı gerekli'),
  category: z.string().min(1, 'Kategori seçilmeli'),
  barcode: z.string().optional(),
  stock_qty: z.number().int().min(0).default(0),
  min_stock_qty: z.number().int().min(0).default(5),
  purchase_price: z.number().min(0, 'Alış fiyatı gerekli'),
  sale_price: z.number().min(0, 'Satış fiyatı gerekli'),
  kdv_rate: z.number().default(20),
  compatible_brands: z.array(z.string()).default([]),
  compatible_models: z.array(z.string()).default([]),
  supplier_id: z.string().uuid().optional(),
})

export const invoiceSchema = z.object({
  customer_id: z.string().uuid('Müşteri seçilmeli'),
  invoice_type: z.enum(['efatura', 'earsiv', 'irsaliye']),
  invoice_date: z.string(),
  items: z.array(z.object({
    item_type: z.enum(['hizmet', 'parca', 'urun']),
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unit_price: z.number().min(0),
    kdv_rate: z.number().default(20),
  })).min(1, 'En az 1 kalem eklenmeli'),
})
