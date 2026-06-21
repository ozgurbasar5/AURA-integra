export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'
import { getPlanLevel } from '@/lib/plan-tiers'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase/service'
import {
  AI_QUOTA_BY_PLAN,
  AI_MAX_OUTPUT_TOKENS,
  estimateTokens,
  trimAiHistory,
  monthKey,
  estimateAiCostUsd,
} from '@/lib/ai-quota'

const GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'] as const

function isLikelyInvalidGeminiKey(key: string): boolean {
  return key.startsWith('AQ.') || (!key.startsWith('AIza') && key.length < 30)
}

async function generateWithGemini(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  lastUserContent: string,
) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const systemPrompt = `Sen AURA İntegra ERP asistanısın. Türkçe yanıt ver.
Teknik servis, stok, satış ve kasa konularında kısa, pratik öneriler sun.
Telefon/tablet/bilgisayar tamir atölyeleri için uzman gibi davran.`

  const trimmed = trimAiHistory(messages)
  const history = trimmed.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }))

  let lastError = 'Model yanıt vermedi'

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: AI_MAX_OUTPUT_TOKENS },
      })
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Anladım, AURA İntegra asistanı olarak yardımcı olacağım.' }] },
          ...history,
        ],
      })
      const result = await chat.sendMessage(lastUserContent)
      return { text: result.response.text(), model: modelName }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(lastError)
}

async function checkAndIncrementQuota(
  tenantId: string,
  userId: string,
  planLevel: 1 | 2 | 3,
  inputTokens: number,
  outputTokens: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const quota = AI_QUOTA_BY_PLAN[planLevel]
  if (quota.messages <= 0) {
    return { ok: false, message: 'AI asistan Teknik Servis paketi gerektirir.' }
  }

  const admin = getServiceClient()
  if (!admin) return { ok: true }

  const mk = monthKey()
  const { data: row } = await admin
    .from('tenant_ai_quotas')
    .select('messages_used, tokens_used')
    .eq('tenant_id', tenantId)
    .eq('month_key', mk)
    .maybeSingle()

  const messagesUsed = Number(row?.messages_used ?? 0)
  const tokensUsed = Number(row?.tokens_used ?? 0)
  const totalTokens = inputTokens + outputTokens

  if (messagesUsed >= quota.messages) {
    return { ok: false, message: `Aylık AI mesaj kotası doldu (${quota.messages}). Ek paket için destek@aurabilisim.net` }
  }
  if (tokensUsed + totalTokens > quota.tokens) {
    return { ok: false, message: `Aylık AI token kotası doldu (${quota.tokens.toLocaleString('tr-TR')}).` }
  }

  await admin.from('tenant_ai_quotas').upsert({
    tenant_id: tenantId,
    month_key: mk,
    messages_used: messagesUsed + 1,
    tokens_used: tokensUsed + totalTokens,
  }, { onConflict: 'tenant_id,month_key' })

  return { ok: true }
}

export async function POST(req: Request) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 2)
  if (!plan.ok) {
    return NextResponse.json({ error: 'AI asistan Teknik Servis paketi ve üzeri gerektirir.' }, { status: 403 })
  }

  const { data: sub } = await auth.supabase
    .from('tenants')
    .select('subscription_plans(name)')
    .eq('id', auth.tenantId)
    .single()
  const planName = (sub as { subscription_plans?: { name?: string } })?.subscription_plans?.name
  const planLevel = getPlanLevel(planName)
  const quota = AI_QUOTA_BY_PLAN[planLevel]

  const rl = await checkRateLimit(
    `ai:${auth.tenantId}:${auth.userId}`,
    quota.ratePer15Min,
    15 * 60 * 1000,
  )
  if (!rl.ok) {
    return NextResponse.json({ error: 'Çok fazla istek — lütfen bekleyin.' }, { status: 429 })
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'GEMINI_API_KEY ortam değişkeni eksik (.env.local veya Vercel)',
      configured: false,
    }, { status: 503 })
  }

  if (isLikelyInvalidGeminiKey(apiKey)) {
    return NextResponse.json({
      error: 'API anahtarı formatı hatalı. Google AI Studio\'dan AIza... ile başlayan anahtar kullanın.',
      configured: false,
    }, { status: 400 })
  }

  let body: { messages?: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const messages = body.messages ?? []
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUser?.content?.trim()) {
    return NextResponse.json({ error: 'Mesaj gerekli' }, { status: 400 })
  }

  const inputText = messages.map(m => m.content).join('\n') + lastUser.content
  const inputTokens = estimateTokens(inputText) + 80

  const quotaCheck = await checkAndIncrementQuota(auth.tenantId, auth.userId, planLevel, inputTokens, 300)
  if (!quotaCheck.ok) {
    return NextResponse.json({ error: quotaCheck.message }, { status: 429 })
  }

  try {
    const { text, model } = await generateWithGemini(apiKey, messages, lastUser.content)
    const outputTokens = estimateTokens(text)

    const admin = getServiceClient()
    if (admin) {
      try {
        await admin.from('ai_usage_logs').insert({
          tenant_id: auth.tenantId,
          user_id: auth.userId,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        })
      } catch { /* tablo yoksa sessiz */ }
    }

    return NextResponse.json({
      content: text,
      result: text,
      configured: true,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: estimateAiCostUsd(inputTokens, outputTokens),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI hatası'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
