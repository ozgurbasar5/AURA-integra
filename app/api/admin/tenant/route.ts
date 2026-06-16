import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/admin-auth'
import {
  computeTrialEnd,
  extendSubscriptionEnd,
  toDateString,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getAdminClient() {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env yok!')
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getPlanPrice(admin: ReturnType<typeof getAdminClient>, planId: string | null) {
  if (!planId) return 0
  const { data } = await admin.from('subscription_plans').select('price').eq('id', planId).single()
  return Number(data?.price ?? 0)
}

async function createPaymentRecord(
  admin: ReturnType<typeof getAdminClient>,
  tenantId: string,
  planId: string | null,
  amount: number,
  dueDate: string,
  notes?: string
) {
  const { error } = await admin.from('tenant_payments').insert({
    tenant_id: tenantId,
    plan_id: planId,
    amount,
    due_date: dueDate,
    status: amount === 0 ? 'paid' : 'pending',
    paid_at: amount === 0 ? new Date().toISOString() : null,
    notes: notes ?? null,
  })
  if (error) console.error('[tenant] payment insert error:', error.message)
}

// ─── POST /api/admin/tenant — Yeni bayi hesabı ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const body = await request.json()
    const { company_name, contact_name, email, phone, city, plan_id, password, status } = body

    if (!company_name || !contact_name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    const trialStart = toDateString(new Date())
    const trialEnd = computeTrialEnd()
    const initialStatus = status === 'active' ? 'active' : 'trial'

    const tenantData: Record<string, unknown> = {
      company_name,
      contact_name,
      email,
      phone,
      city: city || null,
      status: initialStatus,
      subscription_start: trialStart,
      subscription_end: trialEnd,
    }

    const isRealUUID =
      plan_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan_id) &&
      !plan_id.startsWith('00000000-0000-0000-0000-0000000000')
    if (isRealUUID) tenantData.plan_id = plan_id

    const { data: tenant, error: tenantErr } = await admin
      .from('tenants')
      .insert(tenantData)
      .select('id, company_name, plan_id')
      .single()

    if (tenantErr) {
      return NextResponse.json(
        { error: `Bayi oluşturulamadı: ${tenantErr.message}` },
        { status: 500 }
      )
    }

    const tenantId = tenant.id
    const planPrice = await getPlanPrice(admin, tenant.plan_id)

    // Deneme kaydı (ücretsiz) + aktif açılışta ilk fatura
    await createPaymentRecord(
      admin,
      tenantId,
      tenant.plan_id,
      0,
      trialStart,
      'Deneme / hesap açılışı'
    )

    if (initialStatus === 'active' && planPrice > 0) {
      await createPaymentRecord(
        admin,
        tenantId,
        tenant.plan_id,
        planPrice,
        trialEnd,
        'İlk abonelik faturası'
      )
    }

    const authResult = await resolveOrCreateAuthUser(admin, email, password, contact_name)
    if (!authResult.ok) {
      await admin.from('tenants').delete().eq('id', tenantId)
      return NextResponse.json({ error: authResult.error }, { status: 500 })
    }
    const authUserId = authResult.id

    const { error: profileErr } = await admin.from('user_profiles').upsert(
      {
        id: authUserId,
        tenant_id: tenantId,
        full_name: contact_name,
        role: 'tenant_admin',
        is_active: true,
      },
      { onConflict: 'id' }
    )

    if (profileErr) {
      await admin.from('tenants').delete().eq('id', tenantId)
      return NextResponse.json(
        { error: `Kullanıcı profili oluşturulamadı: ${profileErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        tenant_id: tenantId,
        user_id: authUserId,
        message: `${company_name} hesabı açıldı (${initialStatus === 'trial' ? '30 gün deneme' : 'aktif'})`,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/admin/tenant — Durum, abonelik, paket ────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    // Hızlı durum aksiyonları
    if (action === 'activate') {
      const { data: current } = await admin.from('tenants').select('*').eq('id', id).single()
      if (!current) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

      const newEnd = extendSubscriptionEnd(current.subscription_end, 30)
      const planPrice = await getPlanPrice(admin, current.plan_id)

      const { data, error } = await admin
        .from('tenants')
        .update({
          status: 'active',
          subscription_end: newEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (planPrice > 0) {
        await createPaymentRecord(
          admin,
          id,
          current.plan_id,
          planPrice,
          toDateString(new Date()),
          'Aktivasyon sonrası fatura'
        )
      }

      return NextResponse.json({ success: true, data })
    }

    if (action === 'deactivate') {
      const { data, error } = await admin
        .from('tenants')
        .update({ status: 'passive', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'suspend') {
      const { data, error } = await admin
        .from('tenants')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'renew_trial') {
      const trialEnd = computeTrialEnd()
      const { data, error } = await admin
        .from('tenants')
        .update({
          status: 'trial',
          subscription_start: toDateString(new Date()),
          subscription_end: trialEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    // Genel güncelleme
    const patchPayload = { ...updates, updated_at: new Date().toISOString() }

    const { data, error } = await admin
      .from('tenants')
      .update(patchPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Paket değiştiyse yeni fatura oluştur
    if (updates.plan_id) {
      const planPrice = await getPlanPrice(admin, updates.plan_id)
      if (planPrice > 0) {
        await createPaymentRecord(
          admin,
          id,
          updates.plan_id,
          planPrice,
          toDateString(addDaysHelper(new Date(), 7)),
          'Paket değişikliği faturası'
        )
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function addDaysHelper(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

async function resolveOrCreateAuthUser(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
  password: string,
  contactName: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const meta = { full_name: contactName, role: 'tenant_admin' }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: meta,
  })

  if (!createErr && created?.user) {
    return { ok: true, id: created.user.id }
  }

  const msg = createErr?.message ?? ''
  const isDuplicate =
    msg.includes('already been registered') ||
    msg.includes('already exists') ||
    msg.includes('duplicate') ||
    msg.includes('User already registered')

  if (!isDuplicate) {
    return { ok: false, error: `Kullanıcı oluşturulamadı: ${msg || 'bilinmeyen hata'}` }
  }

  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) return { ok: false, error: error.message }

    const existing = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail)
    if (existing) {
      const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: meta,
      })
      if (updateErr) return { ok: false, error: updateErr.message }
      return { ok: true, id: existing.id }
    }

    if (data.users.length < 100) break
  }

  return { ok: false, error: 'E-posta kayıtlı görünüyor ama kullanıcı bulunamadı' }
}

// ─── DELETE /api/admin/tenant ─────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    // 1) Bu bayiye bağlı auth kullanıcılarını topla
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id')
      .eq('tenant_id', id)

    // 2) Ödeme kayıtlarını sil (FK cascade garanti değil)
    await admin.from('tenant_payments').delete().eq('tenant_id', id)

    // 3) Profilleri sil
    await admin.from('user_profiles').delete().eq('tenant_id', id)

    // 4) Tenant'ı sil
    const { error } = await admin.from('tenants').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 5) Auth kullanıcılarını sil (e-posta tekrar kullanılabilsin)
    if (profiles?.length) {
      await Promise.all(
        profiles.map((p: { id: string }) =>
          admin.auth.admin.deleteUser(p.id).catch(() => null)
        )
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
