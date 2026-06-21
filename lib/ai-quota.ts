/**
 * AI kota ve maliyet yardımcıları
 */

import type { PlanLevel } from './plan-tiers'

export const AI_QUOTA_BY_PLAN: Record<PlanLevel, { messages: number; tokens: number; ratePer15Min: number }> = {
  1: { messages: 0, tokens: 0, ratePer15Min: 0 },
  2: { messages: 500, tokens: 250_000, ratePer15Min: 30 },
  3: { messages: 2_000, tokens: 1_000_000, ratePer15Min: 60 },
}

export const AI_MAX_OUTPUT_TOKENS = 512
export const AI_MAX_HISTORY_TURNS = 12
export const AI_MAX_INPUT_CHARS = 32_000

/** Kabaca token tahmini (Türkçe ~1.3 char/token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 1.35)
}

export function trimAiHistory(messages: Array<{ role: string; content: string }>) {
  const trimmed = messages.slice(-AI_MAX_HISTORY_TURNS * 2)
  let totalChars = trimmed.reduce((s, m) => s + m.content.length, 0)
  while (totalChars > AI_MAX_INPUT_CHARS && trimmed.length > 2) {
    trimmed.shift()
    totalChars = trimmed.reduce((s, m) => s + m.content.length, 0)
  }
  return trimmed
}

export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** USD maliyet tahmini — Gemini 2.5 Flash-Lite fiyatları */
export function estimateAiCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 0.10 + (outputTokens / 1_000_000) * 0.40
}
