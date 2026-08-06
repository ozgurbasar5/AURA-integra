export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { parseDeviceImages } from '@/lib/device-images'
import { withApiHandler } from '@/lib/api-handler'
import { safeClientMessage } from '@/lib/api-error'
import { canWriteTenantData, roleGuardResponse } from '@/lib/api-role-guard'

type RouteContext = { params?: Record<string, string> }

const BUCKET = 'device-photos'
const MAX_PHOTOS = 8
const MAX_BYTES = 1_048_576

async function getOrderImages(tenantId: string, orderId: string) {
  const admin = getServiceClient()
  if (!admin) return null
  const { data } = await admin
    .from('service_orders')
    .select('device_images, tenant_id')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return data
}

export const POST = withApiHandler(async function POST(req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? ''
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    const denied = roleGuardResponse()
    return NextResponse.json({ error: denied.message }, { status: denied.status })
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  const order = await getOrderImages(auth.tenantId, id)
  if (!order) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Dosya çok büyük (max 1 MB)' }, { status: 400 })
  }

  const current = parseDeviceImages(order as Record<string, unknown>)
  if (current.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `En fazla ${MAX_PHOTOS} fotoğraf` }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
  const path = `${auth.tenantId}/${id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadErr) {
    return NextResponse.json({ error: safeClientMessage(uploadErr, 'Yükleme başarısız') }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl
  const nextImages = [...current, url]

  const { error: updateErr } = await admin
    .from('service_orders')
    .update({ device_images: nextImages, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)

  if (updateErr) {
    await admin.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: safeClientMessage(updateErr) }, { status: 500 })
  }

  return NextResponse.json({ url, images: nextImages })
}, 'service-orders/[id]/photos')

export const DELETE = withApiHandler(async function DELETE(req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? ''
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    const denied = roleGuardResponse()
    return NextResponse.json({ error: denied.message }, { status: denied.status })
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  if (!body.url) return NextResponse.json({ error: 'url gerekli' }, { status: 400 })

  const order = await getOrderImages(auth.tenantId, id)
  if (!order) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const current = parseDeviceImages(order as Record<string, unknown>)
  const nextImages = current.filter(u => u !== body.url)

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  if (body.url.includes(BUCKET)) {
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const idx = body.url.indexOf(marker)
    if (idx >= 0) {
      const storagePath = body.url.slice(idx + marker.length)
      await admin.storage.from(BUCKET).remove([storagePath])
    }
  }

  const { error: updateErr } = await admin
    .from('service_orders')
    .update({ device_images: nextImages, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)

  if (updateErr) {
    return NextResponse.json({ error: safeClientMessage(updateErr) }, { status: 500 })
  }
  return NextResponse.json({ images: nextImages })
}, 'service-orders/[id]/photos')
