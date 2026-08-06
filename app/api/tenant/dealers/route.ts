export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { dealerToStore, dealerToDb } from '@/lib/db-mappers'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  let query = auth.supabase
    .from('dealers')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('company_name', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(dealerToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.company_name?.trim()) {
    return NextResponse.json({ error: 'Firma adı zorunludur' }, { status: 400 })
  }

  const newDealer = {
    id: crypto.randomUUID(),
    company_name: body.company_name.trim(),
    contact_name: body.contact_name?.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    address: body.address?.trim() || null,
    tax_no: body.tax_no?.trim() || null,
    status: body.status || 'pending',
    discount_rate: Number(body.discount_rate) || 0,
    credit_limit: Number(body.credit_limit) || 0,
    payment_terms: Number(body.payment_terms) || 30,
    notes: body.notes?.trim() || null,
  }

  const { data, error } = await auth.supabase
    .from('dealers')
    .insert(dealerToDb(newDealer as any, auth.tenantId))
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505' && error.message.includes('email')) {
      return NextResponse.json({ error: 'Bu e-posta adresi ile zaten bir bayi kayıtlı.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, item: dealerToStore(data) }, { status: 201 })
}
