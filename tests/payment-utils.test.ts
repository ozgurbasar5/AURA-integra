import { describe, it, expect } from 'vitest'
import {
  normalizePaymentMethod,
} from '@/lib/payment-method'
import { parseLocaleNumber } from '@/lib/parse-locale-number'

describe('normalizePaymentMethod', () => {
  it('nakit olduğu gibi döner', () => {
    expect(normalizePaymentMethod('nakit')).toBe('nakit')
  })

  it('kredi_karti normalize edilir', () => {
    expect(normalizePaymentMethod('kredi_karti')).toBe('kredi_karti')
    expect(normalizePaymentMethod('kart')).toBe('kredi_karti')
    expect(normalizePaymentMethod('kredi')).toBe('kredi_karti')
    expect(normalizePaymentMethod('pos')).toBe('kredi_karti')
  })

  it('havale normalize edilir', () => {
    expect(normalizePaymentMethod('havale')).toBe('havale')
    expect(normalizePaymentMethod('eft')).toBe('havale')
    expect(normalizePaymentMethod('banka')).toBe('havale')
    expect(normalizePaymentMethod('transfer')).toBe('havale')
    expect(normalizePaymentMethod('banka_havalesi')).toBe('havale')
  })

  it('veresiye olduğu gibi döner', () => {
    expect(normalizePaymentMethod('veresiye')).toBe('veresiye')
  })

  it('çek ve senet geçerli', () => {
    expect(normalizePaymentMethod('cek')).toBe('cek')
    expect(normalizePaymentMethod('senet')).toBe('senet')
  })

  it('bilinmeyen değer → nakit', () => {
    expect(normalizePaymentMethod('bitcoin')).toBe('nakit')
    expect(normalizePaymentMethod('xyz')).toBe('nakit')
  })

  it('null/undefined → nakit', () => {
    expect(normalizePaymentMethod(null)).toBe('nakit')
    expect(normalizePaymentMethod(undefined)).toBe('nakit')
  })

  it('büyük harf girdisi normalize edilir', () => {
    expect(normalizePaymentMethod('NAKIT')).toBe('nakit')
    expect(normalizePaymentMethod('Kredi Karti')).toBe('kredi_karti')
  })
})

describe('parseLocaleNumber', () => {
  it('noktalı Türkçe formatı parse eder (1.234,56)', () => {
    expect(parseLocaleNumber('1.234,56')).toBeCloseTo(1234.56, 2)
  })

  it('virgüllü ondalık parse eder (123,45)', () => {
    expect(parseLocaleNumber('123,45')).toBeCloseTo(123.45, 2)
  })

  it('normal sayıyı parse eder', () => {
    expect(parseLocaleNumber('1500')).toBe(1500)
  })

  it('ondalık noktalı parse eder (123.45)', () => {
    expect(parseLocaleNumber('123.45')).toBeCloseTo(123.45, 2)
  })

  it('boş string → NaN', () => {
    expect(parseLocaleNumber('')).toBeNaN()
    expect(parseLocaleNumber('   ')).toBeNaN()
  })

  it('harf içeren → NaN', () => {
    expect(parseLocaleNumber('abc')).toBeNaN()
  })
})
