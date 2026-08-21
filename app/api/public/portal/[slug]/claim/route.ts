export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { enforcePublicRateLimit } from '@/lib/public-rate-limit'
import { verifyPortalSessionToken } from '@/lib/portal-session'
import { evaluateWarrantyClaim } from '@/lib/warranty-engine'
import { warrantyToStore } from '@/lib/db-mappers'

type RouteParams = { params: { slug: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const limited = await enforcePublicRateLimit(req, 'portal-claim', 10, 15 * 60 * 1000)
  if (limited) return limited

  let body: {
    session_token?: string
    warranty_id?: string
    issue_description?: string
    photo_url?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 })
  }

  const authHeader = req.headers.get('Authorization')
  const sessionToken = authHeader?.replace(/^Bearer\s+/i, '') || body.session_token

  if (!sessionToken) {
    return NextResponse.json({ error: 'Oturum tokenı gereklidir' }, { status: 401 })
  }

  if (!body.warranty_id) {
    return NextResponse.json({ error: 'Garanti seçimi zorunludur' }, { status: 400 })
  }

  if (!body.issue_description?.trim() || body.issue_description.trim().length < 5) {
    return NextResponse.json({ error: 'Lütfen arızayı açıklayınız (en az 5 karakter)' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  // 1. Verify session token
  const verified = verifyPortalSessionToken(sessionToken, tenant.id)
  if (!verified.ok || !verified.payload) {
    return NextResponse.json({ error: verified.error || 'Geçersiz veya süresi dolmuş oturum' }, { status: 401 })
  }

  // 2. Fetch warranty and verify ownership
  const { data: wData, error: wError } = await admin
    .from('warranties')
    .select('*')
    .eq('id', body.warranty_id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (wError || !wData) {
    return NextResponse.json({ error: 'Garanti kaydı bulunamadı' }, { status: 404 })
  }

  // Verify that the warranty belongs to this customer phone
  const wPhone = String(wData.customer_phone || '').replace(/\D/g, '').slice(-10)
  if (wPhone !== verified.payload.customerPhone) {
    return NextResponse.json({ error: 'Bu garanti kaydına erişim yetkiniz yok' }, { status: 403 })
  }

  // 3. Evaluate claim engine
  const warranty = warrantyToStore(wData)
  const evaluation = evaluateWarrantyClaim(warranty, body.issue_description.trim())

  // 4. Create claim record
  const { data: claimData, error: claimError } = await admin
    .from('warranty_claims')
    .insert({
      tenant_id: tenant.id,
      warranty_id: body.warranty_id,
      issue_description: body.issue_description.trim(),
      technician_notes: evaluation.reason || null,
      resolution: evaluation.resolution,
      status: 'open',
    })
    .select('id, created_at')
    .single()

  if (claimError) {
    return NextResponse.json({ error: 'Garanti talebi oluşturulamadı' }, { status: 500 })
  }

  // 5. Update warranty claim status
  await admin
    .from('warranties')
    .update({
      claim_status: 'beklemede',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', body.warranty_id)

  return NextResponse.json({
    ok: true,
    message: 'Garanti talebiniz başarıyla oluşturuldu. Teknik ekibimiz inceleyecektir.',
    claim_id: claimData.id,
  })
}
