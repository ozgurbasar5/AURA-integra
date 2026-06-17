export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { hashApiKey } from '@/lib/secrets-crypto'

/** Public API v1 — X-API-Key header ile tenant servis siparişleri */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'X-API-Key header gerekli' }, { status: 401 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const apiKeyHash = hashApiKey(apiKey)

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, company_name')
    .eq('api_key_hash', apiKeyHash)
    .maybeSingle()

  if (!tenant) {
    return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 403 })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 100)
  const status = req.nextUrl.searchParams.get('status')

  let query = admin
    .from('service_orders')
    .select('id, order_no, status, device_brand, device_model, created_at, customers(full_name, phone)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    tenant: tenant.company_name,
    orders: data,
  })
}
