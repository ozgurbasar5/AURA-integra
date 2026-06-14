export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

/** Bayi başvuruları — admin listesi & güncelleme */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data, error } = await admin
    .from('bayi_basvurulari')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

/** Bayi başvurusu güncelleme — RLS bypass */
export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { id?: string; status?: string; internal_note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const { data, error } = await admin
    .from('bayi_basvurulari')
    .update({
      ...(body.status ? { status: body.status } : {}),
      ...(body.internal_note !== undefined ? { internal_note: body.internal_note } : {}),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
