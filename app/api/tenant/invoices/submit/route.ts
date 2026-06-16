export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'

/** e-Fatura GIB entegratörüne gönderim (stub — gerçek entegratör API'si buraya bağlanır) */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 })
  }

  const { data: tenant } = await auth.supabase
    .from('tenants')
    .select('feature_flags')
    .eq('id', auth.tenantId)
    .single()

  const flags = (tenant?.feature_flags as Record<string, boolean>) ?? {}
  if (flags.efatura === false) {
    return NextResponse.json({ error: 'e-Fatura özelliği bu bayi için kapalı' }, { status: 403 })
  }

  let body: { invoice_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.invoice_id) {
    return NextResponse.json({ error: 'invoice_id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: invoice, error } = await admin
    .from('invoices')
    .select('*')
    .eq('id', body.invoice_id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
  }

  const gibRef = `GIB-${Date.now()}-${invoice.invoice_no ?? invoice.id}`

  await admin
    .from('invoices')
    .update({
      status: 'submitted',
      gib_reference: gibRef,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', body.invoice_id)

  return NextResponse.json({
    ok: true,
    gib_reference: gibRef,
    message: 'Fatura GIB kuyruğuna alındı. Entegratör onayı bekleniyor.',
  })
}
