export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { warrantyToStore } from '@/lib/db-mappers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('warranties')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Garanti bulunamadı' }, { status: 404 })
  
  return NextResponse.json({ ok: true, item: warrantyToStore(data) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  // Soft delete by setting status to 'iptal'
  const { error } = await auth.supabase
    .from('warranties')
    .update({ status: 'iptal', voided_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
