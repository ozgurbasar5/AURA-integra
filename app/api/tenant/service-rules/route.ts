export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

export interface ServiceRulesConfig {
  default_service_fee: number
  warranty_months_default: number
  auto_require_qc: boolean
  approval_threshold_amount: number
  numbering_prefixes: {
    service: string
    customer: string
    warranty: string
    invoice: string
  }
  status_transitions: {
    allow_skip_diagnosis: boolean
    require_quote_before_repair: boolean
    auto_notify_on_ready: boolean
  }
}

export const DEFAULT_SERVICE_RULES: ServiceRulesConfig = {
  default_service_fee: 250,
  warranty_months_default: 3,
  auto_require_qc: true,
  approval_threshold_amount: 1000,
  numbering_prefixes: {
    service: 'SRV-',
    customer: 'CUST-',
    warranty: 'WAR-',
    invoice: 'FAT-',
  },
  status_transitions: {
    allow_skip_diagnosis: false,
    require_quote_before_repair: true,
    auto_notify_on_ready: true,
  },
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { supabase, tenantId } = auth

  const { data } = await supabase
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const settings = (data?.settings as Record<string, unknown>) ?? {}
  const rules = (settings.service_rules as ServiceRulesConfig) ?? DEFAULT_SERVICE_RULES

  return NextResponse.json({
    ok: true,
    rules: {
      ...DEFAULT_SERVICE_RULES,
      ...rules,
      numbering_prefixes: {
        ...DEFAULT_SERVICE_RULES.numbering_prefixes,
        ...(rules.numbering_prefixes ?? {}),
      },
      status_transitions: {
        ...DEFAULT_SERVICE_RULES.status_transitions,
        ...(rules.status_transitions ?? {}),
      },
    },
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Yönetici yetkisi gereklidir' }, { status: 403 })
  }

  let body: Partial<ServiceRulesConfig>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { supabase, tenantId } = auth

  const { data: existing } = await supabase
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const prevSettings = (existing?.settings as Record<string, unknown>) ?? {}

  const mergedRules: ServiceRulesConfig = {
    ...DEFAULT_SERVICE_RULES,
    ...((prevSettings.service_rules as Partial<ServiceRulesConfig>) ?? {}),
    ...body,
  }

  const { error } = await supabase
    .from('tenant_settings')
    .upsert({
      tenant_id: tenantId,
      settings: {
        ...prevSettings,
        service_rules: mergedRules,
      },
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeTenantAuditLog({
    tenantId,
    userId: auth.userId,
    action: 'update',
    entityType: 'service_rules',
    newData: mergedRules as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true, rules: mergedRules })
}
