export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance, canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { partToStock, purchaseToStore, stockToPart } from '@/lib/db-mappers'
import type { Purchase, StockItem } from '@/lib/store'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('purchases')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    ok: true,
    items: (data ?? []).map(r => purchaseToStore(r as Record<string, unknown>)),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) && !canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Alış yetkisi yok' }, { status: 403 })
  }

  let body: Omit<Purchase, 'id' | 'created_at' | 'total_cost'> & {
    part_id?: string
    create_stock?: boolean
    /** Tedarik siparişinden geldiyse — stok zaten receive ile girdiyse tekrar girme */
    supplier_order_id?: string
    skip_stock?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.supplier_name?.trim() || !body.category || !body.quantity || body.buy_price == null) {
    return NextResponse.json({ error: 'supplier_name, category, quantity, buy_price gerekli' }, { status: 400 })
  }

  const qty = Number(body.quantity)
  const buyPrice = Number(body.buy_price)
  if (qty <= 0 || buyPrice < 0) {
    return NextResponse.json({ error: 'quantity ve buy_price geçersiz' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const totalCost = qty * buyPrice
  const paymentMethod = normalizePaymentMethod(body.payment_method)
  const purchaseId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const stockName = body.category === 'telefon'
    ? `${body.device_brand ?? ''} ${body.device_model ?? ''}`.trim() || 'Telefon'
    : body.category === 'yedek_parca' ? (body.device_model || body.device_brand || 'Yedek Parça')
    : body.category === 'aksesuar' ? (body.device_model || 'Aksesuar')
    : `${body.category} alış`

  let stockItem: StockItem | null = null
  const stockCategories = ['yedek_parca', 'aksesuar', 'telefon', 'ikinci_el']

  // Tedarik receive → alış zincirinde çift stok engeli
  let skipStock = body.skip_stock === true || body.create_stock === false
  if (!skipStock && body.supplier_order_id && isUuid(body.supplier_order_id)) {
    const { data: priorMove } = await admin
      .from('stock_movements')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('reference_id', body.supplier_order_id)
      .eq('movement_type', 'giris')
      .limit(1)
      .maybeSingle()
    if (priorMove) {
      skipStock = true
    }
  }

  if (!skipStock && stockCategories.includes(body.category)) {
    let partId = body.part_id && isUuid(body.part_id) ? body.part_id : null

    if (partId) {
      const { data: existing } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('id', partId)
        .maybeSingle()

      if (!existing) {
        return NextResponse.json({ error: 'part_id bulunamadı' }, { status: 404 })
      }

      const newQty = Number(existing.stock_qty) + qty
      const { data: updated, error: updErr } = await admin
        .from('parts')
        .update({
          stock_qty: newQty,
          purchase_price: buyPrice,
          supplier: body.supplier_name,
        })
        .eq('tenant_id', auth.tenantId)
        .eq('id', partId)
        .select('*')
        .single()

      if (updErr || !updated) {
        return NextResponse.json({ error: updErr?.message || 'Stok güncellenemedi' }, { status: 500 })
      }
      stockItem = partToStock(updated as Record<string, unknown>)
    } else {
      const { data: byName } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .ilike('name', stockName)
        .limit(1)
        .maybeSingle()

      if (byName) {
        const newQty = Number(byName.stock_qty) + qty
        const { data: updated, error: updErr } = await admin
          .from('parts')
          .update({
            stock_qty: newQty,
            purchase_price: buyPrice,
            supplier: body.supplier_name,
          })
          .eq('tenant_id', auth.tenantId)
          .eq('id', byName.id)
          .select('*')
          .single()
        if (updErr || !updated) {
          return NextResponse.json({ error: updErr?.message || 'Stok güncellenemedi' }, { status: 500 })
        }
        stockItem = partToStock(updated as Record<string, unknown>)
        partId = String(byName.id)
      } else {
        partId = crypto.randomUUID()
        const categoryLabel = body.category === 'telefon' ? 'Telefon'
          : body.category === 'yedek_parca' ? 'Yedek Parça'
          : 'Aksesuar'
        const newItem: StockItem = {
          id: partId,
          name: stockName,
          barcode: body.imei || '',
          category: categoryLabel,
          compatible_brands: body.device_brand ? [body.device_brand] : [],
          stock_qty: qty,
          min_stock: 5,
          buy_price: buyPrice,
          sell_price: Math.round(buyPrice * 1.25),
          supplier: body.supplier_name,
        }
        const row = stockToPart(newItem, auth.tenantId)
        row.id = partId
        const { data: created, error: createErr } = await admin
          .from('parts')
          .insert(row)
          .select('*')
          .single()
        if (createErr || !created) {
          return NextResponse.json({ error: createErr?.message || 'Parça oluşturulamadı' }, { status: 500 })
        }
        stockItem = partToStock(created as Record<string, unknown>)
      }
    }

    if (partId) {
      await admin.from('stock_movements').insert({
        tenant_id: auth.tenantId,
        part_id: partId,
        movement_type: 'giris',
        quantity: qty,
        notes: `Alış — ${body.supplier_name}`,
        reference_id: purchaseId,
        created_by: auth.userId,
      })
    }
  }

  const { data: purchaseRow, error: purchaseErr } = await admin
    .from('purchases')
    .insert({
      id: purchaseId,
      tenant_id: auth.tenantId,
      supplier_name: body.supplier_name.trim(),
      supplier_phone: body.supplier_phone || null,
      device_brand: body.device_brand || null,
      device_model: body.device_model || null,
      imei: body.imei || null,
      category: body.category,
      quality: body.quality || null,
      quantity: qty,
      buy_price: buyPrice,
      total_cost: totalCost,
      payment_method: paymentMethod,
      invoice_no: body.invoice_no || null,
      notes: body.notes || null,
      created_by: auth.userId,
      created_at: createdAt,
    })
    .select('*')
    .single()

  if (purchaseErr || !purchaseRow) {
    return NextResponse.json({ error: purchaseErr?.message || 'Alış kaydı oluşmadı' }, { status: 500 })
  }

  const { error: txErr } = await admin.from('financial_transactions').insert({
    tenant_id: auth.tenantId,
    type: 'gider',
    description: `Alış — ${stockName} (${body.supplier_name})`,
    category: 'Alış',
    amount: totalCost,
    payment_method: paymentMethod,
    transaction_date: createdAt,
    created_by: auth.userId,
    reference_id: purchaseId,
  })
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  let kasaBalance: number | undefined
  if (paymentMethod === 'nakit') {
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: -totalCost,
    })
    if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })
    kasaBalance = Number(bal)
  }

  return NextResponse.json({
    ok: true,
    purchase: purchaseToStore(purchaseRow as Record<string, unknown>),
    stock_item: stockItem,
    kasa_balance: kasaBalance,
  }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Alış yetkisi yok' }, { status: 403 })
  }

  let body: Partial<Purchase> & { id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id || !isUuid(body.id)) {
    return NextResponse.json({ error: 'Geçerli id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: existing } = await admin
    .from('purchases')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Alış kaydı bulunamadı' }, { status: 404 })

  const oldQty = Number(existing.quantity) || 0
  const oldCost = Number(existing.total_cost) || 0
  const oldPm = normalizePaymentMethod(String(existing.payment_method || 'nakit'))

  const patch: Record<string, unknown> = {}
  if (body.supplier_name != null) patch.supplier_name = body.supplier_name
  if (body.supplier_phone !== undefined) patch.supplier_phone = body.supplier_phone || null
  if (body.category != null) patch.category = body.category
  if (body.quality != null) patch.quality = body.quality
  if (body.device_brand !== undefined) patch.device_brand = body.device_brand || null
  if (body.device_model !== undefined) patch.device_model = body.device_model || null
  if (body.imei !== undefined) patch.imei = body.imei || null
  if (body.quantity != null) patch.quantity = body.quantity
  if (body.buy_price != null) patch.buy_price = body.buy_price
  const newQty = body.quantity != null ? Number(body.quantity) : oldQty
  const newBuy = body.buy_price != null ? Number(body.buy_price) : Number(existing.buy_price) || 0
  if (body.quantity != null || body.buy_price != null) {
    patch.total_cost = newQty * newBuy
  } else if (body.total_cost != null) {
    patch.total_cost = body.total_cost
  }
  if (body.payment_method != null) patch.payment_method = normalizePaymentMethod(body.payment_method)
  if (body.invoice_no !== undefined) patch.invoice_no = body.invoice_no || null
  if (body.notes !== undefined) patch.notes = body.notes || null

  const newCost = Number(patch.total_cost ?? oldCost)
  const newPm = normalizePaymentMethod(String(patch.payment_method ?? oldPm))

  // Stok miktar farkını uygula
  let stockItem: StockItem | null = null
  const qtyDelta = newQty - oldQty
  if (qtyDelta !== 0) {
    const { data: entryMovement } = await admin
      .from('stock_movements')
      .select('part_id')
      .eq('tenant_id', auth.tenantId)
      .eq('reference_id', body.id)
      .eq('movement_type', 'giris')
      .maybeSingle()

    if (entryMovement?.part_id) {
      const { data: part } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('id', entryMovement.part_id)
        .maybeSingle()

      if (part) {
        const nextQty = Math.max(0, (Number(part.stock_qty) || 0) + qtyDelta)
        const { data: updated } = await admin
          .from('parts')
          .update({ stock_qty: nextQty, purchase_price: newBuy })
          .eq('tenant_id', auth.tenantId)
          .eq('id', entryMovement.part_id)
          .select('*')
          .single()
        if (updated) stockItem = partToStock(updated as Record<string, unknown>)
        await admin.from('stock_movements').insert({
          tenant_id: auth.tenantId,
          part_id: entryMovement.part_id,
          movement_type: qtyDelta > 0 ? 'giris' : 'cikis',
          quantity: Math.abs(qtyDelta),
          notes: `Alış düzeltme — ${existing.supplier_name}`,
          reference_id: body.id,
          created_by: auth.userId,
        })
      }
    }
  }

  // Alış finans kaydını güncelle
  if (newCost !== oldCost || newPm !== oldPm || body.supplier_name != null) {
    await admin
      .from('financial_transactions')
      .update({
        amount: newCost,
        payment_method: newPm,
        description: `Alış — ${body.supplier_name ?? existing.supplier_name}`,
      })
      .eq('tenant_id', auth.tenantId)
      .eq('reference_id', body.id)
      .eq('category', 'Alış')
  }

  // Nakit kasa: eski nakit etkiyi geri al, yeni nakit etkiyi uygula
  let kasaBalance: number | undefined
  const oldCashDelta = oldPm === 'nakit' ? -oldCost : 0
  const newCashDelta = newPm === 'nakit' ? -newCost : 0
  const kasaDelta = newCashDelta - oldCashDelta
  if (kasaDelta !== 0) {
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: kasaDelta,
    })
    if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })
    kasaBalance = Number(bal)
  }

  const { data, error } = await admin
    .from('purchases')
    .update(patch)
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Güncelleme başarısız' }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    purchase: purchaseToStore(data as Record<string, unknown>),
    stock_item: stockItem,
    kasa_balance: kasaBalance,
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) && !canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Alış silme yetkisi yok' }, { status: 403 })
  }

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id || !isUuid(body.id)) {
    return NextResponse.json({ error: 'Geçerli id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: purchase } = await admin
    .from('purchases')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)
    .maybeSingle()

  if (!purchase) return NextResponse.json({ error: 'Alış kaydı bulunamadı' }, { status: 404 })

  // Alışla oluşan stok girişini geri al (giriş hareketinden part_id bulunur)
  let stockItem: StockItem | null = null
  const { data: entryMovement } = await admin
    .from('stock_movements')
    .select('part_id, quantity')
    .eq('tenant_id', auth.tenantId)
    .eq('reference_id', body.id)
    .eq('movement_type', 'giris')
    .maybeSingle()

  if (entryMovement?.part_id) {
    const { data: part } = await admin
      .from('parts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('id', entryMovement.part_id)
      .maybeSingle()

    if (part) {
      const revertQty = Number(entryMovement.quantity) || 0
      const newQty = Math.max(0, (Number(part.stock_qty) || 0) - revertQty)
      const { data: updated } = await admin
        .from('parts')
        .update({ stock_qty: newQty })
        .eq('tenant_id', auth.tenantId)
        .eq('id', entryMovement.part_id)
        .select('*')
        .single()

      if (updated) stockItem = partToStock(updated as Record<string, unknown>)

      await admin.from('stock_movements').insert({
        tenant_id: auth.tenantId,
        part_id: entryMovement.part_id,
        movement_type: 'cikis',
        quantity: revertQty,
        notes: `Alış silindi — ${purchase.supplier_name}`,
        reference_id: body.id,
        created_by: auth.userId,
      })
    }
  }

  // Alışla oluşan gider kaydını sil
  await admin
    .from('financial_transactions')
    .delete()
    .eq('tenant_id', auth.tenantId)
    .eq('reference_id', body.id)
    .eq('category', 'Alış')

  // Nakit alışta kasadan düşülen tutarı iade et
  let kasaBalance: number | undefined
  if (purchase.payment_method === 'nakit') {
    const { data: bal } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: Number(purchase.total_cost) || 0,
    })
    if (bal != null) kasaBalance = Number(bal)
  }

  const { error } = await admin
    .from('purchases')
    .delete()
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, stock_item: stockItem, kasa_balance: kasaBalance })
}

