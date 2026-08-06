export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { buildWarrantyCertificateHtml } from '@/lib/warranty-engine'
import { warrantyToStore } from '@/lib/db-mappers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  // 1. Get warranty
  const { data: wData, error: wError } = await auth.supabase
    .from('warranties')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (wError || !wData) return new NextResponse('Garanti bulunamadı', { status: 404 })

  // 2. Get shop name (from tenant settings)
  const { data: tenantData } = await auth.supabase
    .from('tenants')
    .select('name')
    .eq('id', auth.tenantId)
    .single()

  const shopName = tenantData?.name || 'AURA Teknik Servis'
  const warranty = warrantyToStore(wData)
  
  // 3. Generate HTML
  const html = buildWarrantyCertificateHtml(warranty, shopName)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
