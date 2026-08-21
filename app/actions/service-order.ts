'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import type { ServiceOrderStatus } from '@/types/database'

export type CreateServiceOrderActionInput = {
  customer_name: string
  customer_phone: string
  device_brand: string
  device_model: string
  imei?: string
  fault_description?: string
  estimated_cost?: number
  status?: string
}

function normalizeStatus(raw?: string): ServiceOrderStatus {
  if (!raw) return 'alindi'
  const mapped = mapStoreStatusToDb(raw) as ServiceOrderStatus
  const allowed: ServiceOrderStatus[] = [
    'alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol', 'teslim', 'iptal',
  ]
  return allowed.includes(mapped) ? mapped : 'alindi'
}

async function resolveCustomerId(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  customerName: string,
  customerPhone: string,
): Promise<string | null> {
  const phone = customerPhone.replace(/\s/g, '')
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('customers')
    .insert({ tenant_id: tenantId, full_name: customerName.trim(), phone })
    .select('id')
    .single()

  if (error || !created) return null
  return created.id
}

export async function createServiceOrderAction(input: CreateServiceOrderActionInput) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return { ok: false as const, error: auth.message }
  }

  const { supabase, tenantId, userId } = auth
  const customer_id = await resolveCustomerId(
    supabase,
    tenantId,
    input.customer_name,
    input.customer_phone,
  )
  if (!customer_id) {
    return { ok: false as const, error: 'Müşteri kaydı oluşturulamadı' }
  }

  const { data: orderNo, error: orderNoErr } = await supabase.rpc('generate_order_no', {
    p_tenant_id: tenantId,
  })
  if (orderNoErr) {
    return { ok: false as const, error: orderNoErr.message }
  }

  const dbStatus = normalizeStatus(input.status)
  const faultDesc = input.fault_description?.trim() || 'Arıza bildirimi'

  const { data: newOrder, error: insertErr } = await supabase
    .from('service_orders')
    .insert({
      tenant_id: tenantId,
      order_no: orderNo as string,
      customer_id,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone.replace(/\s/g, ''),
      device_brand: input.device_brand.trim(),
      device_model: input.device_model.trim(),
      fault_description: faultDesc,
      status: dbStatus,
      received_at: new Date().toISOString(),
      imei: input.imei,
      estimated_cost: input.estimated_cost ?? 0,
    })
    .select('*')
    .single()

  if (insertErr || !newOrder) {
    return { ok: false as const, error: insertErr?.message || 'Kayıt oluşturulamadı' }
  }

  await supabase.from('service_status_history').insert({
    order_id: newOrder.id,
    tenant_id: tenantId,
    status: newOrder.status,
    note: 'Servis kaydı oluşturuldu.',
    created_by: userId,
  })

  revalidatePath('/dashboard/atolye')
  revalidatePath('/dashboard/kabul')

  return { ok: true as const, data: newOrder }
}
