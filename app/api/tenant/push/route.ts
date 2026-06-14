export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { stockToPart, customerToDb, txToDb, saleToDb, appointmentToDb, warrantyToDb, invoiceToDb, notificationLogToDb, supportTicketToDb, cashShiftToDb, supplierOrderToDb, personnelToDb, foreignDeviceToDb, serviceOrderToDb } from '@/lib/db-mappers'
import type { StoreData } from '@/lib/store'

type PushBody = {
  module: keyof StoreData | 'notificationSettings' | 'kasaBalance'
  items?: unknown[]
  settings?: Record<string, unknown>
  balance?: number
}

async function upsertRows(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  table: string,
  rows: Record<string, unknown>[]
) {
  if (!rows.length) return { error: null }
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  return { error }
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId, userId } = auth

  let body: PushBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  try {
    if (body.module === 'kasaBalance' && body.balance != null) {
      const balance = Number(body.balance)
      const { data: existing } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('type', 'kasa')
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase.from('accounts').update({ balance }).eq('id', existing.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { error } = await supabase.from('accounts').insert({
          tenant_id: tenantId,
          name: 'Kasa',
          type: 'kasa',
          balance,
          currency: 'TRY',
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (body.module === 'notificationSettings' && body.settings) {
      const { error } = await supabase.from('tenant_settings').upsert({
        tenant_id: tenantId,
        settings: body.settings,
        updated_at: new Date().toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    const items = body.items ?? []
    if (!items.length) return NextResponse.json({ ok: true, skipped: true })

    switch (body.module) {
      case 'stock': {
        const rows = (items as StoreData['stock']).map(s => {
          const row = stockToPart(s, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'parts', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'customers': {
        const rows = (items as StoreData['customers']).map(c => {
          const row = customerToDb(c, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'customers', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'transactions': {
        const rows = (items as StoreData['transactions']).map(t => {
          const row = txToDb(t, tenantId, userId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'financial_transactions', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'sales': {
        const rows = (items as StoreData['sales']).map(s => {
          const row = saleToDb(s, tenantId, userId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'sales', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'purchases': {
        const rows = (items as StoreData['purchases']).map(p => ({
          ...(isUuid(p.id) ? { id: p.id } : {}),
          tenant_id: tenantId,
          supplier_name: p.supplier_name,
          supplier_phone: p.supplier_phone,
          device_brand: p.device_brand,
          device_model: p.device_model,
          imei: p.imei,
          category: p.category,
          quality: p.quality,
          quantity: p.quantity,
          buy_price: p.buy_price,
          total_cost: p.total_cost,
          payment_method: p.payment_method,
          invoice_no: p.invoice_no,
          notes: p.notes,
          created_by: userId,
        }))
        const { error } = await upsertRows(supabase, 'purchases', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'todos': {
        const rows = (items as StoreData['todos']).map(t => ({
          ...(isUuid(t.id) ? { id: t.id } : {}),
          tenant_id: tenantId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
          due_date: t.due_date,
          completed: t.completed,
          created_by: userId,
        }))
        const { error } = await upsertRows(supabase, 'todos', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'customerOrders': {
        const rows = (items as StoreData['customerOrders']).map(o => ({
          ...(isUuid(o.id) ? { id: o.id } : {}),
          tenant_id: tenantId,
          order_no: o.order_no,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          items: o.items,
          total: o.total,
          status: o.status,
          payment_status: o.payment_status,
          payment_method: o.payment_method,
          notes: o.notes,
        }))
        const { error } = await upsertRows(supabase, 'customer_orders', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'storeProducts': {
        const rows = (items as StoreData['storeProducts']).map(p => ({
          ...(isUuid(p.id) ? { id: p.id } : {}),
          tenant_id: tenantId,
          name: p.name,
          category: p.category,
          brand: p.brand,
          model: p.model,
          price: p.price,
          cost_price: p.cost_price,
          stock_count: p.stock_count,
          imei: p.imei,
          quality: p.quality,
          is_active: p.is_active,
          image_url: p.image_url,
          description: p.description,
        }))
        const { error } = await upsertRows(supabase, 'store_products', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'assets': {
        const rows = (items as StoreData['assets']).map(a => ({
          ...(isUuid(a.id) ? { id: a.id } : {}),
          tenant_id: tenantId,
          name: a.name,
          category: a.category,
          serial_no: a.serial_no,
          barcode: a.barcode,
          purchase_date: a.purchase_date,
          purchase_price: a.purchase_price,
          current_value: a.current_value,
          assigned_to: a.assigned_to,
          location: a.location,
          status: a.status,
          next_maintenance: a.next_maintenance,
          notes: a.notes,
        }))
        const { error } = await upsertRows(supabase, 'assets', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'campaigns': {
        const rows = (items as StoreData['campaigns']).map(c => ({
          ...(isUuid(c.id) ? { id: c.id } : {}),
          tenant_id: tenantId,
          name: c.name,
          description: c.description,
          type: c.type,
          discount_percent: c.discount_percent,
          discount_amount: c.discount_amount,
          target_categories: c.target_categories,
          start_date: c.start_date,
          end_date: c.end_date,
          is_active: c.is_active,
          usage_count: c.usage_count,
          max_usage: c.max_usage,
        }))
        const { error } = await upsertRows(supabase, 'campaigns', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'deals': {
        const rows = (items as StoreData['deals']).map(d => ({
          ...(isUuid(d.id) ? { id: d.id } : {}),
          tenant_id: tenantId,
          title: d.title,
          product_name: d.product_name,
          original_price: d.original_price,
          deal_price: d.deal_price,
          stock_count: d.stock_count,
          sold_count: d.sold_count,
          category: d.category,
          is_active: d.is_active,
          end_date: d.end_date,
          description: d.description,
        }))
        const { error } = await upsertRows(supabase, 'deals', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'secondHandDevices': {
        const rows = (items as StoreData['secondHandDevices']).map(d => ({
          ...(isUuid(d.id) ? { id: d.id } : {}),
          tenant_id: tenantId,
          brand: d.brand,
          model: d.model,
          imei: d.imei,
          barcode: d.barcode,
          condition: d.condition,
          cosmetic_score: d.cosmetic_score,
          battery_health: d.battery_health,
          color: d.color,
          storage: d.storage,
          buy_price: d.buy_price,
          sell_price: d.sell_price,
          status: d.status === 'satildi' ? 'satildi' : 'satilik',
          showcase: d.showcase,
          notes: d.notes,
          sold_at: d.sold_at,
        }))
        const { error } = await upsertRows(supabase, 'showcase_devices', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'stolenIMEIs': {
        const rows = (items as StoreData['stolenIMEIs']).map(s => ({
          ...(isUuid(s.id) ? { id: s.id } : {}),
          tenant_id: tenantId,
          imei: s.imei,
          device_brand: s.device_brand,
          device_model: s.device_model,
          reporter_name: s.reporter_name,
          reporter_phone: s.reporter_phone,
          report_date: s.report_date,
          source: s.source,
          status: s.status,
          notes: s.notes,
        }))
        const { error } = await upsertRows(supabase, 'stolen_imeis', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'branches': {
        const rows = (items as StoreData['branches']).map(b => ({
          ...(isUuid(b.id) ? { id: b.id } : {}),
          tenant_id: tenantId,
          name: b.name,
          address: b.address,
          phone: b.phone,
          is_active: true,
        }))
        const { error } = await upsertRows(supabase, 'branches', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'appointments': {
        const rows = (items as StoreData['appointments']).map(a => {
          const row = appointmentToDb(a, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'appointments', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'warranties': {
        const rows = (items as StoreData['warranties']).map(w => {
          const row = warrantyToDb(w, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'warranties', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'invoices': {
        const rows = (items as StoreData['invoices']).map(inv => {
          const row = invoiceToDb(inv, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'invoices', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'notificationLogs': {
        const rows = (items as StoreData['notificationLogs']).map(n => {
          const row = notificationLogToDb(n, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'notification_logs', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'supportTickets': {
        const rows = (items as StoreData['supportTickets']).map(t => {
          const row = supportTicketToDb(t, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'support_tickets', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'cashShifts': {
        const rows = (items as StoreData['cashShifts']).map(c => {
          const row = cashShiftToDb(c, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'cash_shifts', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'supplierOrders': {
        const rows = (items as StoreData['supplierOrders']).map(o => {
          const row = supplierOrderToDb(o, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'supplier_orders', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'personnel': {
        const rows = (items as StoreData['personnel']).map(p => {
          const row = personnelToDb(p, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'personnel_profiles', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'serviceOrders': {
        const rows = (items as StoreData['serviceOrders']).map(o => {
          const row = serviceOrderToDb(o, tenantId, userId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'service_orders', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      case 'foreignDevices': {
        const rows = (items as StoreData['foreignDevices']).map(d => {
          const row = foreignDeviceToDb(d, tenantId) as Record<string, unknown>
          if (!isUuid(String(row.id ?? ''))) delete row.id
          return row
        })
        const { error } = await upsertRows(supabase, 'foreign_devices', rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }
      default:
        return NextResponse.json({ ok: true, skipped: true, module: body.module })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Push hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
