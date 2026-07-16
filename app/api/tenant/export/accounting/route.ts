export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canSeeFinance } from '@/lib/role-access'

/** Hazır muhasebe CSV export — Mikro / Logo dosya içe aktarımı (canlı REST yok) */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canSeeFinance(auth.role)) {
    return NextResponse.json({ error: 'Finans yetkisi gerekli' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [txRes, salesRes, invRes] = await Promise.all([
    auth.supabase
      .from('financial_transactions')
      .select('transaction_date, type, category, amount, description, payment_method')
      .eq('tenant_id', auth.tenantId)
      .gte('transaction_date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('transaction_date'),
    auth.supabase
      .from('sales')
      .select('created_at, total, payment_method, customer_name')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at'),
    auth.supabase
      .from('invoices')
      .select('invoice_no, invoice_date, customer_name, total, tax_amount, type')
      .eq('tenant_id', auth.tenantId)
      .gte('invoice_date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('invoice_date'),
  ])

  const lines = [
    'Tarih,Tür,Kategori,Açıklama,Tutar,Ödeme Yöntemi',
    ...(txRes.data ?? []).map(r =>
      [r.transaction_date, r.type, r.category, `"${String(r.description ?? '').replace(/"/g, '""')}"`, r.amount, r.payment_method].join(',')
    ),
    '',
    'Satış Tarihi,Müşteri,Tutar,Ödeme',
    ...(salesRes.data ?? []).map(r =>
      [r.created_at?.slice(0, 10), `"${r.customer_name ?? ''}"`, r.total, r.payment_method].join(',')
    ),
    '',
    'Fatura No,Tarih,Müşteri,Toplam,KDV,Tür',
    ...(invRes.data ?? []).map(r =>
      [r.invoice_no, r.invoice_date, `"${r.customer_name ?? ''}"`, r.total, r.tax_amount, r.type].join(',')
    ),
  ]

  const csv = lines.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aura-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
