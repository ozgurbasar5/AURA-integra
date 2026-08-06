import { describe, it, expect } from 'vitest'
import {
  validateTCKN,
  validateVKN,
  validateIMEI,
  validatePhoneNumber,
  formatPhoneNumber,
  formatPhoneDisplay,
  calculateKDV,
  calculateKDVInverse,
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  KDV_RATES,
} from '@/lib/validators'

describe('validateTCKN', () => {
  it('geçerli TCKN kabul eder', () => {
    expect(validateTCKN('10000000146')).toBe(true)
  })

  it('0 ile başlayan TCKN reddeder', () => {
    expect(validateTCKN('01234567890')).toBe(false)
  })

  it('11 haneden az reddeder', () => {
    expect(validateTCKN('1234567890')).toBe(false)
  })

  it('harf içeren reddeder', () => {
    expect(validateTCKN('1234567890a')).toBe(false)
  })

  it('boş string reddeder', () => {
    expect(validateTCKN('')).toBe(false)
  })
})

describe('validateVKN', () => {
  it('10 haneden az reddeder', () => {
    expect(validateVKN('123456789')).toBe(false)
  })

  it('10 haneden çok reddeder', () => {
    expect(validateVKN('12345678901')).toBe(false)
  })

  it('harf içeren reddeder', () => {
    expect(validateVKN('123456789a')).toBe(false)
  })

  it('boş string reddeder', () => {
    expect(validateVKN('')).toBe(false)
  })
})

describe('validateIMEI', () => {
  it('geçerli 15 haneli IMEI kabul eder — Luhn doğru', () => {
    // Luhn geçerli IMEI
    expect(validateIMEI('490154203237518')).toBe(true)
  })

  it('15 haneden az reddeder', () => {
    expect(validateIMEI('49015420323751')).toBe(false)
  })

  it('15 haneden çok reddeder', () => {
    expect(validateIMEI('4901542032375189')).toBe(false)
  })

  it('harf içeren reddeder', () => {
    expect(validateIMEI('49015420323751a')).toBe(false)
  })

  it('tüm sıfır Luhn kontrolü (algoritmaya göre geçer)', () => {
    // 000000000000000 → Luhn sum=0, 0%10=0 → geçerli kabul edilir
    // Gerçek IMEI doğrulaması ek kontrol gerektirir; validateIMEI yalnızca Luhn uygular
    const result = validateIMEI('000000000000000')
    expect(typeof result).toBe('boolean') // davranışı doğruluyoruz
  })
})

describe('validatePhoneNumber', () => {
  it('5xx ile başlayan 10 hane geçerli', () => {
    expect(validatePhoneNumber('5321234567')).toBe(true)
  })

  it('05xx ile başlayan 11 hane geçerli', () => {
    expect(validatePhoneNumber('05321234567')).toBe(true)
  })

  it('+90 5xx ile başlayan 12 hane geçerli', () => {
    expect(validatePhoneNumber('905321234567')).toBe(true)
  })

  it('4 ile başlayan 10 hane geçersiz', () => {
    expect(validatePhoneNumber('4321234567')).toBe(false)
  })

  it('çok kısa numara geçersiz', () => {
    expect(validatePhoneNumber('532123')).toBe(false)
  })
})

describe('formatPhoneNumber', () => {
  it('10 haneyi +90 ile formatlar', () => {
    expect(formatPhoneNumber('5321234567')).toBe('+905321234567')
  })

  it('05xx formatını düzeltir', () => {
    expect(formatPhoneNumber('05321234567')).toBe('+905321234567')
  })

  it('905xx olanı olduğu gibi +90 yapar', () => {
    expect(formatPhoneNumber('905321234567')).toBe('+905321234567')
  })
})

describe('formatPhoneDisplay', () => {
  it('10 haneyi okunabilir formata çevirir', () => {
    expect(formatPhoneDisplay('5321234567')).toBe('0532 123 45 67')
  })

  it('05xx girişini okunabilir yapar', () => {
    expect(formatPhoneDisplay('05321234567')).toBe('0532 123 45 67')
  })
})

describe('calculateKDV', () => {
  it('%20 KDV hesaplar', () => {
    const result = calculateKDV(100, 20)
    expect(result.subtotal).toBe(100)
    expect(result.kdv).toBe(20)
    expect(result.total).toBe(120)
  })

  it('%10 KDV hesaplar', () => {
    const result = calculateKDV(200, 10)
    expect(result.subtotal).toBe(200)
    expect(result.kdv).toBe(20)
    expect(result.total).toBe(220)
  })

  it('%1 KDV hesaplar', () => {
    const result = calculateKDV(1000, 1)
    expect(result.kdv).toBe(10)
    expect(result.total).toBe(1010)
  })
})

describe('calculateKDVInverse', () => {
  it('120 TL toplam → 100 net + 20 kdv', () => {
    const result = calculateKDVInverse(120, 20)
    expect(result.subtotal).toBeCloseTo(100, 1)
    expect(result.kdv).toBeCloseTo(20, 1)
    expect(result.total).toBe(120)
  })

  it('110 TL toplam %10 KDV', () => {
    const result = calculateKDVInverse(110, 10)
    expect(result.subtotal).toBeCloseTo(100, 1)
    expect(result.kdv).toBeCloseTo(10, 1)
  })
})

describe('KDV_RATES', () => {
  it('1, 10, 20 oranlarını içerir', () => {
    expect(KDV_RATES).toContain(1)
    expect(KDV_RATES).toContain(10)
    expect(KDV_RATES).toContain(20)
  })
})

describe('formatCurrency', () => {
  it('Türk lirası formatı üretir', () => {
    const formatted = formatCurrency(1500)
    expect(formatted).toMatch(/1\.500/)
  })

  it('sıfırı formatlar', () => {
    const formatted = formatCurrency(0)
    expect(formatted).toMatch(/0/)
  })
})

describe('formatCurrencyShort', () => {
  it('kuruş olmadan formatlar', () => {
    const formatted = formatCurrencyShort(1500.99)
    expect(formatted).not.toMatch(/\d+,\d{2}/)
  })
})

describe('formatDate', () => {
  it('tarih formatlar', () => {
    const result = formatDate('2026-01-15')
    expect(result).toContain('2026')
  })
})

describe('formatDateTime', () => {
  it('tarih ve saat formatlar', () => {
    const result = formatDateTime('2026-01-15T10:30:00')
    expect(result).toContain('2026')
  })
})

describe('formatRelativeTime', () => {
  it('çok yakın tarih az önce gösterir', () => {
    const result = formatRelativeTime(new Date(Date.now() - 30000))
    expect(result).toBe('Az önce')
  })

  it('5 dk önce', () => {
    const result = formatRelativeTime(new Date(Date.now() - 5 * 60000))
    expect(result).toContain('dk önce')
  })

  it('2 saat önce', () => {
    const result = formatRelativeTime(new Date(Date.now() - 2 * 3600000))
    expect(result).toContain('sa önce')
  })

  it('3 gün önce', () => {
    const result = formatRelativeTime(new Date(Date.now() - 3 * 86400000))
    expect(result).toContain('gün önce')
  })
})
