export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'
import { getPlanLevel } from '@/lib/plan-tiers'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  AI_QUOTA_BY_PLAN,
  estimateTokens,
  estimateAiCostUsd,
} from '@/lib/ai-quota'
import { getServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  // ── Auth ──
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  // ── Plan kontrolü (Paket 2+) ──
  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 2)
  if (!plan.ok) {
    return NextResponse.json(
      { error: 'AI arıza teşhis Teknik Servis paketi ve üzeri gerektirir.' },
      { status: 403 }
    )
  }

  // ── Rate limit ──
  const { data: sub } = await auth.supabase
    .from('tenants')
    .select('subscription_plans(name)')
    .eq('id', auth.tenantId)
    .single()
  const planName = (sub as { subscription_plans?: { name?: string } })?.subscription_plans?.name
  const planLevel = getPlanLevel(planName)
  const quota = AI_QUOTA_BY_PLAN[planLevel]

  const rl = await checkRateLimit(
    `ai-diagnose:${auth.tenantId}:${auth.userId}`,
    quota.ratePer15Min,
    15 * 60 * 1000,
  )
  if (!rl.ok) {
    return NextResponse.json({ error: 'Çok fazla istek — lütfen bekleyin.' }, { status: 429 })
  }

  // ── API Key ──
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'GEMINI_API_KEY bulunamadı. Lütfen .env.local yapılandırmasını kontrol edin.',
    }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { device_brand, device_model, symptoms, customer_notes } = body

    if (!symptoms) {
      return NextResponse.json({ error: 'Cihaz arıza belirtileri (symptoms) gereklidir.' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Sen uzman bir elektronik ve cep telefonu/bilgisayar tamir teknisyenisin.
Cihaz Marka: ${device_brand || 'Belirtilmedi'}
Cihaz Model: ${device_model || 'Belirtilmedi'}
Arıza Semptomları: ${symptoms}
Müşteri Notu: ${customer_notes || 'Yok'}

Aşağıdaki JSON formatında yanıt ver (JSON dışında hiçbir metin veya markdown tırnağı yazma):
{
  "possible_causes": ["Olası neden 1", "Olası neden 2"],
  "recommended_parts": ["Değişmesi muhtemel parça 1", "Değişmesi muhtemel parça 2"],
  "estimated_repair_time": "Örn: 1-2 Saat",
  "difficulty_level": "Kolay | Orta | Zor",
  "estimated_cost_range_tl": "Örn: 800 TL - 1200 TL",
  "technician_advice": "Teknisyen için pratik ön kontrol önerisi"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Clean potential markdown wrap
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const jsonResult = JSON.parse(cleanedText)

    const inputTokens = estimateTokens(prompt) + 40
    const outputTokens = estimateTokens(text)

    // ── Kullanım logla ──
    const admin = getServiceClient()
    if (admin) {
      try {
        await admin.from('ai_usage_logs').insert({
          tenant_id: auth.tenantId,
          user_id: auth.userId,
          model: 'gemini-2.5-flash',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        })
      } catch { /* tablo yoksa sessiz */ }
    }

    return NextResponse.json({
      ok: true,
      diagnosis: jsonResult,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: estimateAiCostUsd(inputTokens, outputTokens),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Arıza teşhis analizi başarısız.'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

