import { describe, it, expect } from 'vitest'
import { trimAiHistory, estimateTokens, AI_MAX_HISTORY_TURNS } from '@/lib/ai-quota'

describe('ai-quota', () => {
  it('trims long history', () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }))
    const trimmed = trimAiHistory(msgs)
    expect(trimmed.length).toBeLessThanOrEqual(AI_MAX_HISTORY_TURNS * 2)
  })

  it('estimates tokens from text', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0)
  })
})
