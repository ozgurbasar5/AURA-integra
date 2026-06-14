import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { extendSubscriptionEnd, toDateString } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** GET — ödeme listesi | POST — yeni kayıt | PATCH — güncelle | PUT — gecikmiş senkron */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const status = request.nextUrl.searchParams.get('status')

    let q = admin
      .from('tenant_payments')
      .select('*, tenants(company_name, email), subscription_plans(name, price)')
      .order('due_date', { ascending: false })

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST — yeni ödeme kaydı | PATCH — ödendi işaretle + abonelik uzat */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const body = await request.json()
    const { tenant_id, plan_id, amount, due_date, notes } = body

    if (!tenant_id || amount === undefined || !due_date) {
      return NextResponse.json({ error: 'tenant_id, amount, due_date zorunlu' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('tenant_payments')
      .insert({
        tenant_id,
        plan_id: plan_id ?? null,
        amount: Number(amount),
        due_date,
        status: 'pending',
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const body = await request.json()
    const { id, action, extend_days } = body

    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    if (action === 'mark_paid') {
      const { data: payment, error: payErr } = await admin
        .from('tenant_payments')
        .select('*, tenants(subscription_end, plan_id)')
        .eq('id', id)
        .single()

      if (payErr || !payment) {
        return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 })
      }

      const now = new Date().toISOString()
      const periodDays = extend_days ?? 30

      const tenantRow = payment.tenants as { subscription_end?: string; plan_id?: string } | null
      const newEnd = extendSubscriptionEnd(tenantRow?.subscription_end, periodDays)

      const { error: updatePayErr } = await admin
        .from('tenant_payments')
        .update({ status: 'paid', paid_at: now })
        .eq('id', id)

      if (updatePayErr) {
        return NextResponse.json({ error: updatePayErr.message }, { status: 500 })
      }

      const { error: tenantErr } = await admin
        .from('tenants')
        .update({
          status: 'active',
          subscription_end: newEnd,
          plan_id: payment.plan_id ?? tenantRow?.plan_id ?? undefined,
          updated_at: now,
        })
        .eq('id', payment.tenant_id)

      if (tenantErr) {
        return NextResponse.json({ error: tenantErr.message }, { status: 500 })
      }

      // Diğer gecikmiş faturaları iptal et (opsiyonel temizlik)
      await admin
        .from('tenant_payments')
        .update({ status: 'cancelled', notes: 'Yeni ödeme ile kapatıldı' })
        .eq('tenant_id', payment.tenant_id)
        .in('status', ['pending', 'overdue'])
        .neq('id', id)

      return NextResponse.json({
        success: true,
        message: 'Ödeme alındı, abonelik uzatıldı',
        subscription_end: newEnd,
      })
    }

    if (action === 'mark_overdue') {
      const today = toDateString(new Date())
      const { error } = await admin
        .from('tenant_payments')
        .update({ status: 'overdue' })
        .eq('id', id)
        .lte('due_date', today)
        .in('status', ['pending'])

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel') {
      const { error } = await admin
        .from('tenant_payments')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Gecikmiş ödemeleri senkronize et */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const today = toDateString(new Date())

    const { data, error } = await admin
      .from('tenant_payments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lte('due_date', today)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, updated: data?.length ?? 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
