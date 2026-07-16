export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData, canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { partToStock, stockToPart } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import type { StockItem } from '@/lib/store'

/**
 * Tedarik "Teslim Alındı" → stok girişi (rakip ERP kalıbı)
 * Body: { order_id, items?: [{ name, qty, unit_price, stock_id? }], supplier_name?, post_finance? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Tedarik yetkisi yok' }, { status: 403 })
  }

  let body: {
    order_id?: string
    items?: Array<{ name: string; qty: number; unit_price: number; stock_id?: string }>
    supplier_name?: string
    post_finance?: boolean
    payment_method?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.order_id) {
    return NextResponse.json({ error: 'order_id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let orderRow: Record<string, unknown> | null = null
  if (isUuid(body.order_id)) {
    const { data } = await admin
      .from('supplier_orders')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.order_id)
      .maybeSingle()
    orderRow = data as Record<string, unknown> | null
  }

  const items = body.items?.length
    ? body.items
    : Array.isArray(orderRow?.items)
      ? (orderRow!.items as Array<{ name: string; qty: number; unit_price: number; stock_id?: string }>)
      : []

  if (!items.length) {
    return NextResponse.json({ error: 'Sipariş kalemi yok' }, { status: 400 })
  }

  if (orderRow?.status === 'received') {
    return NextResponse.json({ error: 'Bu sipariş zaten teslim alınmış' }, { status: 409 })
  }

  // Çift stok koruması: aynı order_id ile daha önce stok hareketi varsa reddet
  if (isUuid(body.order_id)) {
    const { data: priorMove } = await admin
      .from('stock_movements')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('reference_id', body.order_id)
      .eq('movement_type', 'giris')
      .limit(1)
      .maybeSingle()
    if (priorMove) {
      return NextResponse.json({
        error: 'Bu tedarik siparişi için stok zaten girilmiş (çift kayıt engellendi). Alış modülünden tekrar girmeyin.',
        code: 'DUPLICATE_RECEIVE',
      }, { status: 409 })
    }
  }

  const supplierName = body.supplier_name || String(orderRow?.supplier_name ?? 'Tedarikçi')
  const stockItems: StockItem[] = []
  let totalCost = 0

  for (const line of items) {
    const qty = Number(line.qty) || 0
    const unit = Number(line.unit_price) || 0
    if (!line.name?.trim() || qty <= 0) continue
    totalCost += qty * unit

    let partId = line.stock_id && isUuid(line.stock_id) ? line.stock_id : null
    let partRow: Record<string, unknown> | null = null

    if (partId) {
      const { data } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('id', partId)
        .maybeSingle()
      partRow = data as Record<string, unknown> | null
    }

    if (!partRow) {
      const { data } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .ilike('name', line.name.trim())
        .limit(1)
        .maybeSingle()
      partRow = data as Record<string, unknown> | null
      if (partRow) partId = String(partRow.id)
    }

    if (partRow && partId) {
      const newQty = (Number(partRow.stock_qty) || 0) + qty
      const { data: updated, error } = await admin
        .from('parts')
        .update({
          stock_qty: newQty,
          purchase_price: unit || Number(partRow.purchase_price) || 0,
          supplier: supplierName,
        })
        .eq('tenant_id', auth.tenantId)
        .eq('id', partId)
        .select('*')
        .single()
      if (error || !updated) {
        return NextResponse.json({ error: error?.message || 'Stok güncellenemedi' }, { status: 500 })
      }
      stockItems.push(partToStock(updated as Record<string, unknown>))
    } else {
      partId = crypto.randomUUID()
      const newItem: StockItem = {
        id: partId,
        name: line.name.trim(),
        barcode: '',
        category: 'Yedek Parça',
        compatible_brands: [],
        stock_qty: qty,
        min_stock: 5,
        buy_price: unit,
        sell_price: Math.round(unit * 1.25) || unit,
        supplier: supplierName,
      }
      const row = stockToPart(newItem, auth.tenantId)
      row.id = partId
      const { data: created, error } = await admin.from('parts').insert(row).select('*').single()
      if (error || !created) {
        return NextResponse.json({ error: error?.message || 'Parça oluşturulamadı' }, { status: 500 })
      }
      stockItems.push(partToStock(created as Record<string, unknown>))
    }

    await admin.from('stock_movements').insert({
      tenant_id: auth.tenantId,
      part_id: partId,
      movement_type: 'giris',
      quantity: qty,
      notes: `Tedarik teslim — ${supplierName}`,
      reference_id: isUuid(body.order_id) ? body.order_id : null,
      created_by: auth.userId,
    })
  }

  if (orderRow && isUuid(body.order_id)) {
    await admin
      .from('supplier_orders')
      .update({ status: 'received' })
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.order_id)
  }

  let kasaBalance: number | undefined
  if (body.post_finance !== false && totalCost > 0 && canPushFinance(auth.role)) {
    const paymentMethod = normalizePaymentMethod(body.payment_method || 'havale')
    await admin.from('financial_transactions').insert({
      tenant_id: auth.tenantId,
      type: 'gider',
      description: `Tedarik teslim — ${supplierName}`,
      category: 'Tedarikçi',
      amount: totalCost,
      payment_method: paymentMethod,
      transaction_date: new Date().toISOString(),
      created_by: auth.userId,
      reference_id: isUuid(body.order_id) ? body.order_id : null,
    })
    // Havale varsayılan; nakit kasa yalnızca nakit ödemede düşer
    if (paymentMethod === 'nakit') {
      const { data: bal } = await admin.rpc('adjust_kasa_balance', {
        p_tenant_id: auth.tenantId,
        p_delta: -totalCost,
      })
      if (bal != null) kasaBalance = Number(bal)
    }
  }

  return NextResponse.json({
    ok: true,
    stock_items: stockItems,
    total_cost: totalCost,
    kasa_balance: kasaBalance,
  })
}
