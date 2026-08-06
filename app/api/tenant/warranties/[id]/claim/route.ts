export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { evaluateWarrantyClaim } from '@/lib/warranty-engine'
import { warrantyToStore } from '@/lib/db-mappers'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: { issue_description: string; technician_notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.issue_description?.trim()) {
    return NextResponse.json({ error: 'Sorun açıklaması zorunludur' }, { status: 400 })
  }

  // 1. Get warranty
  const { data: wData, error: wError } = await auth.supabase
    .from('warranties')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (wError || !wData) return NextResponse.json({ error: 'Garanti bulunamadı' }, { status: 404 })

  const warranty = warrantyToStore(wData)

  // 2. Evaluate claim
  const evaluation = evaluateWarrantyClaim(warranty, body.issue_description)

  // 3. Create claim record
  const { data: claimData, error: claimError } = await auth.supabase
    .from('warranty_claims')
    .insert({
      tenant_id: auth.tenantId,
      warranty_id: params.id,
      issue_description: body.issue_description.trim(),
      technician_notes: body.technician_notes || evaluation.reason || null,
      resolution: evaluation.resolution,
      status: 'open'
    })
    .select('*')
    .single()

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })

  // 4. Update warranty status to reflect claim is pending
  await auth.supabase
    .from('warranties')
    .update({ claim_status: 'beklemede', claimed_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, claim: claimData, evaluation })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('warranty_claims')
    .select('*')
    .eq('warranty_id', params.id)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, items: data })
}
