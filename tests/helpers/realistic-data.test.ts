import { describe, it, expect } from 'vitest'
import { RealisticData } from './realistic-data'

/**
 * Gerçekçi veri üreteci testleri.
 * Üretilen verilerin format, içerik ve benzersizlik (collision-free) doğruluğunu kontrol eder.
 */
describe('RealisticData — Türkçe test veri üreteci', () => {
  it('tam isim üretir (iki kelimeli)', () => {
    const name = RealisticData.fullName()
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2)
    expect(name.length).toBeGreaterThan(5)
  })

  it('telefon 05XX formatında ve benzersizdir', () => {
    const phone1 = RealisticData.phone()
    const phone2 = RealisticData.phone()
    expect(phone1).toMatch(/^0[5][0-9]{9}$/)
    expect(phone2).toMatch(/^0[5][0-9]{9}$/)
    expect(phone1).not.toBe(phone2)
  })

  it('e-posta @aura.test domain kullanır ve benzersizdir', () => {
    const email1 = RealisticData.email('Ahmet Yılmaz')
    const email2 = RealisticData.email('Ahmet Yılmaz')
    expect(email1).toMatch(/@aura\.test$/)
    expect(email1).not.toBe(email2)
  })

  it('IMEI 15 haneli üretilir ve benzersizdir', () => {
    const imei1 = RealisticData.imei()
    const imei2 = RealisticData.imei()
    expect(imei1).toMatch(/^\d{15}$/)
    expect(imei1.startsWith('35')).toBe(true)
    expect(imei1).not.toBe(imei2)
  })

  it('barkod 13 haneli üretilir (869 Türkiye prefix) ve benzersizdir', () => {
    const b1 = RealisticData.barcode()
    const b2 = RealisticData.barcode()
    expect(b1).toMatch(/^\d{13}$/)
    expect(b1.startsWith('869')).toBe(true)
    expect(b1).not.toBe(b2)
  })

  it('cihaz markası bilinen markalardan gelir', () => {
    const brand = RealisticData.deviceBrand()
    const knownBrands = [
      'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Roborock',
      'Dyson', '70mai', 'Realme', 'OnePlus', 'Vivo', 'Nothing',
    ]
    expect(knownBrands).toContain(brand)
  })

  it('cihaz modeli seçilen markaya uygun', () => {
    const model = RealisticData.deviceModel('Apple')
    expect(model).toBeTruthy()
    const applePatterns = ['iPhone', 'iPad', 'MacBook']
    expect(applePatterns.some(p => model.includes(p))).toBe(true)
  })

  it('servis ücreti pozitif ve makul aralıkta', () => {
    const fee = RealisticData.serviceFee()
    expect(fee).toBeGreaterThanOrEqual(200)
    expect(fee).toBeLessThanOrEqual(5000)
  })

  it('ödeme yöntemi bilinen değerlerden', () => {
    const method = RealisticData.paymentMethod()
    expect(['nakit', 'kredi_karti', 'havale', 'veresiye']).toContain(method)
  })

  it('şehir Türkiye şehirlerinden', () => {
    const city = RealisticData.city()
    expect(city.length).toBeGreaterThan(2)
  })

  it('adres formatı doğru', () => {
    const address = RealisticData.address('İstanbul')
    expect(address).toContain('İstanbul')
    expect(address).toContain('No:')
  })

  it('VKN 10 haneli ve benzersizdir', () => {
    const vkn1 = RealisticData.vkn()
    const vkn2 = RealisticData.vkn()
    expect(vkn1).toMatch(/^\d{10}$/)
    expect(vkn1).not.toBe(vkn2)
  })

  it('1000 telefon üretildiğinde 1000 tanesi de tam olarak benzersizdir (%0 çakışma)', () => {
    const phones = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      phones.add(RealisticData.phone())
    }
    expect(phones.size).toBe(1000)
  })
})
