export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: {
    basvuru_id?: string
    plan_id?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { basvuru_id, plan_id, password } = body
  if (!basvuru_id || !plan_id || !password) {
    return NextResponse.json({ error: 'basvuru_id, plan_id, password gerekli' }, { status: 400 })
  }

  const { data: basvuru, error: bErr } = await admin
    .from('bayi_basvurulari')
    .select('*')
    .eq('id', basvuru_id)
    .single()

  if (bErr || !basvuru) return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 })

  const tenantPayload = {
    company_name: basvuru.company_name,
    contact_name: basvuru.contact_name,
    email: basvuru.email,
    phone: basvuru.phone,
    city: basvuru.city ?? 'İstanbul',
    plan_id,
    status: 'trial',
    subscription_start: new Date().toISOString().slice(0, 10),
    subscription_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  }

  const createRes = await fetch(new URL('/api/admin/tenant', request.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ ...tenantPayload, password }),
  })

  const createJson = await createRes.json()
  if (!createRes.ok) {
    return NextResponse.json({ error: createJson.error ?? 'Bayi oluşturulamadı' }, { status: createRes.status })
  }

  await admin.from('bayi_basvurulari').update({
    status: 'onaylandi',
    internal_note: `Bayi oluşturuldu: ${new Date().toISOString()}`,
  }).eq('id', basvuru_id)

  await writeAuditLog({
    actorId: auth.userId,
    action: 'provision_from_basvuru',
    targetType: 'tenant',
    targetId: createJson.tenant?.id ?? createJson.data?.id,
    metadata: { basvuru_id, email: basvuru.email },
  })

  return NextResponse.json({ ok: true, ...createJson })
}
