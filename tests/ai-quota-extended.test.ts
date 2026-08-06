import { describe, it, expect } from 'vitest'
import {
  AI_QUOTA_BY_PLAN,
  AI_MAX_HISTORY_TURNS,
  AI_MAX_INPUT_CHARS,
  AI_MAX_OUTPUT_TOKENS,
  estimateTokens,
  trimAiHistory,
  monthKey,
  estimateAiCostUsd,
} from '@/lib/ai-quota'

describe('AI_QUOTA_BY_PLAN', () => {
  it('seviye 1 → sıfır kota', () => {
    expect(AI_QUOTA_BY_PLAN[1].messages).toBe(0)
    expect(AI_QUOTA_BY_PLAN[1].tokens).toBe(0)
  })

  it('seviye 2 → ılımlı kota', () => {
    expect(AI_QUOTA_BY_PLAN[2].messages).toBeGreaterThan(0)
    expect(AI_QUOTA_BY_PLAN[2].tokens).toBeGreaterThan(0)
  })

  it('seviye 3 → en yüksek kota', () => {
    expect(AI_QUOTA_BY_PLAN[3].messages).toBeGreaterThan(AI_QUOTA_BY_PLAN[2].messages)
    expect(AI_QUOTA_BY_PLAN[3].tokens).toBeGreaterThan(AI_QUOTA_BY_PLAN[2].tokens)
  })
})

describe('estimateTokens', () => {
  it('boş metin → 0 token', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('kısa metin → pozitif token sayısı', () => {
    expect(estimateTokens('merhaba')).toBeGreaterThan(0)
  })

  it('uzun metin → daha fazla token', () => {
    const short = estimateTokens('kısa')
    const long = estimateTokens('bu çok daha uzun bir metin örneğidir')
    expect(long).toBeGreaterThan(short)
  })
})

describe('trimAiHistory', () => {
  it('kısa geçmiş değişmez', () => {
    const msgs = [
      { role: 'user', content: 'merhaba' },
      { role: 'assistant', content: 'merhaba!' },
    ]
    const trimmed = trimAiHistory(msgs)
    expect(trimmed.length).toBe(2)
  })

  it('çok uzun geçmiş → max turn sınırına indirilir', () => {
    const msgs = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `mesaj ${i}`,
    }))
    const trimmed = trimAiHistory(msgs)
    expect(trimmed.length).toBeLessThanOrEqual(AI_MAX_HISTORY_TURNS * 2)
  })

  it('toplam karakter AI_MAX_INPUT_CHARS\'ı aşmaz', () => {
    const msgs = Array.from({ length: 30 }, () => ({
      role: 'user',
      content: 'a'.repeat(5000),
    }))
    const trimmed = trimAiHistory(msgs)
    const total = trimmed.reduce((s, m) => s + m.content.length, 0)
    expect(total).toBeLessThanOrEqual(AI_MAX_INPUT_CHARS)
  })
})

describe('monthKey', () => {
  it('doğru YYYY-MM formatı üretir', () => {
    const key = monthKey(new Date('2026-08-15T00:00:00Z'))
    expect(key).toBe('2026-08')
  })

  it('tek haneli ay başına 0 eklenir', () => {
    const key = monthKey(new Date('2026-01-01T00:00:00Z'))
    expect(key).toBe('2026-01')
  })
})

describe('estimateAiCostUsd', () => {
  it('sıfır token → sıfır maliyet', () => {
    expect(estimateAiCostUsd(0, 0)).toBe(0)
  })

  it('1M input token maliyeti hesaplar', () => {
    const cost = estimateAiCostUsd(1_000_000, 0)
    expect(cost).toBeCloseTo(0.1, 3)
  })

  it('1M output token maliyeti hesaplar', () => {
    const cost = estimateAiCostUsd(0, 1_000_000)
    expect(cost).toBeCloseTo(0.4, 3)
  })

  it('combined maliyet', () => {
    const cost = estimateAiCostUsd(500_000, 500_000)
    expect(cost).toBeCloseTo(0.05 + 0.2, 5)
  })
})

describe('AI sabit değerleri', () => {
  it('makul sınırlar tanımlanmış', () => {
    expect(AI_MAX_HISTORY_TURNS).toBeGreaterThan(0)
    expect(AI_MAX_INPUT_CHARS).toBeGreaterThan(0)
    expect(AI_MAX_OUTPUT_TOKENS).toBeGreaterThan(0)
  })
})
