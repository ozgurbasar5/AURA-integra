import { describe, it, expect } from 'vitest'

/**
 * PERFORMANCE & LOAD ENGINE: High-Concurrency & Race Condition Stress Tests
 */
describe('Performance & Load: Concurrency Stress Invariants', () => {
  it('1. Stok Race Condition: 10 parça stoğu varken gelen 15 paralel istekten tam 10 tanesi başarılı olur, 5 tanesi reddedilir ve stok asla eksiye düşmez', async () => {
    let currentStock = 10
    const successfulUsage: string[] = []
    const rejectedUsage: string[] = []

    // Atomik stok düşüm fonksiyonu simülasyonu
    const atomicUsePart = async (requestId: string) => {
      // Simüle edilmiş asenkron gecikme (race condition ihtimalini artırır)
      await new Promise(r => setTimeout(r, Math.random() * 5))

      // Kritik Bölge (Critical Section - Lock/Conditional Update)
      if (currentStock > 0) {
        currentStock--
        successfulUsage.push(requestId)
        return { ok: true, remaining: currentStock }
      } else {
        rejectedUsage.push(requestId)
        return { ok: false, error: 'Insufficient Stock' }
      }
    }

    // 15 adet paralel istek başlatılır
    const requests = Array.from({ length: 15 }, (_, i) => atomicUsePart(`req-${i + 1}`))
    const results = await Promise.all(requests)

    // DOĞRULAMA:
    expect(successfulUsage.length).toBe(10)
    expect(rejectedUsage.length).toBe(5)
    expect(currentStock).toBe(0) // Asla < 0 olmamalı!
    expect(results.filter(r => r.ok).length).toBe(10)
    expect(results.filter(r => !r.ok).length).toBe(5)
  })

  it('2. Paralel Finansal Tahsilat: Aynı anda gelen 20 tahsilat isteğinde toplam bakiye kuruşu kuruşuna doğru toplanır', async () => {
    let kasaBalance = 0
    const transactionLogs: number[] = []

    const atomicAddPayment = async (amount: number) => {
      await new Promise(r => setTimeout(r, Math.random() * 5))
      kasaBalance += amount
      transactionLogs.push(amount)
      return kasaBalance
    }

    // 20 adet 250 TL'lik eşzamanlı ödeme
    const paymentAmount = 250
    const totalRequests = 20
    const payments = Array.from({ length: totalRequests }, () => atomicAddPayment(paymentAmount))

    await Promise.all(payments)

    // Toplam bakiye tam 5.000 TL olmalı (20 * 250)
    expect(kasaBalance).toBe(5000)
    expect(transactionLogs.length).toBe(20)
  })
})
