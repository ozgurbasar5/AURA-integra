export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'

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
      content: 'AI asistan yapılandırılmamış. GEMINI_API_KEY ortam değişkenini ekleyin.',
      result: 'AI asistan yapılandırılmamış.',
    })
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
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const systemPrompt = `Sen AURA İntegra ERP asistanısın. Türkçe yanıt ver. 
Teknik servis, stok, satış ve kasa konularında kısa, pratik öneriler sun.
Telefon/tablet/bilgisayar tamir atölyeleri için uzman gibi davran.`

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Anladım, AURA İntegra asistanı olarak yardımcı olacağım.' }] },
        ...history,
      ],
    })

    const result = await chat.sendMessage(lastUser.content)
    const text = result.response.text()

    return NextResponse.json({ content: text, result: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI hatası'
    return NextResponse.json({ content: `Üzgünüm, şu an yanıt veremiyorum: ${msg}`, result: msg }, { status: 500 })
  }
}
