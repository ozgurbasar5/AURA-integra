export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'] as const

function isLikelyInvalidGeminiKey(key: string): boolean {
  return key.startsWith('AQ.') || (!key.startsWith('AIza') && key.length < 30)
}

async function generateWithGemini(apiKey: string, messages: Array<{ role: string; content: string }>, lastUserContent: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const systemPrompt = `Sen AURA İntegra ERP asistanısın. Türkçe yanıt ver.
Teknik servis, stok, satış ve kasa konularında kısa, pratik öneriler sun.
Telefon/tablet/bilgisayar tamir atölyeleri için uzman gibi davran.`

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }))

  let lastError = 'Model yanıt vermedi'

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Anladım, AURA İntegra asistanı olarak yardımcı olacağım.' }] },
          ...history,
        ],
      })
      const result = await chat.sendMessage(lastUserContent)
      return result.response.text()
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(lastError)
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

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'GEMINI_API_KEY ortam değişkeni eksik (.env.local veya Vercel)',
      configured: false,
    }, { status: 503 })
  }

  if (isLikelyInvalidGeminiKey(apiKey)) {
    return NextResponse.json({
      error: 'API anahtarı formatı hatalı. Google AI Studio\'dan AIza... ile başlayan anahtar kullanın (aistudio.google.com/apikey).',
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

  try {
    const text = await generateWithGemini(apiKey, messages, lastUser.content)
    return NextResponse.json({ content: text, result: text, configured: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI hatası'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
