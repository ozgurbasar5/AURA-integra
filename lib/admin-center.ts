/**
 * AURA İntegra — Admin 2.0 Control Center Engine
 * Aggregates KPIs, generates real-time system alerts, powers universal search, and evaluates health.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  resource: string
  resourceId?: string
  href: string
  count?: number
  timestamp: string
}

export interface AdminKpiSummary {
  servicesActive: number
  servicesDeliveredToday: number
  quotesPending: number
  totalAccountsBalance: number
  criticalStockCount: number
  warrantyClaimsPending: number
  activePersonnelCount: number
  activeBranchesCount: number
  alertCount: number
}

export interface UniversalSearchResult {
  id: string
  type: 'service' | 'customer' | 'part' | 'account' | 'user' | 'warranty' | 'ticket' | 'tenant'
  title: string
  subtitle: string
  badge?: string
  href: string
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'critical'
  db: { ok: boolean; latencyMs: number; error?: string }
  realtime: { ok: boolean; status: string }
  api: { ok: boolean; endpointsPassing: number; total: number }
  cron: { ok: boolean; lastRun?: string; failedCount: number }
  webhooks: { ok: boolean; failureCount7d: number }
  storage: { ok: boolean; usageMb?: number }
}

/** Compute real-time admin KPIs for a tenant (or global platform) */
export async function computeTenantAdminKpis(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AdminKpiSummary> {
  const today = new Date().toISOString().slice(0, 10)

  const [
    servicesRes,
    quotesRes,
    accountsRes,
    partsRes,
    warrantiesRes,
    staffRes,
    branchesRes,
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select('id, status, delivered_at')
      .eq('tenant_id', tenantId),
    supabase
      .from('service_orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending'),
    supabase
      .from('accounts')
      .select('balance, is_active')
      .eq('tenant_id', tenantId),
    supabase
      .from('parts')
      .select('id, stock_quantity, min_stock_threshold')
      .eq('tenant_id', tenantId),
    supabase
      .from('warranties')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  const allServices = servicesRes.data ?? []
  const servicesActive = allServices.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length
  const servicesDeliveredToday = allServices.filter(s => s.status === 'delivered' && s.delivered_at?.startsWith(today)).length
  const quotesPending = quotesRes.count ?? 0

  const totalBalance = (accountsRes.data ?? []).reduce(
    (sum, a) => sum + (a.is_active ? Number(a.balance || 0) : 0),
    0,
  )

  const criticalStockCount = (partsRes.data ?? []).filter(
    p => Number(p.stock_quantity || 0) <= Number(p.min_stock_threshold || 3),
  ).length

  const warrantyClaimsPending = warrantiesRes.count ?? 0
  const activePersonnelCount = staffRes.count ?? 1
  const activeBranchesCount = branchesRes.count ?? 1

  return {
    servicesActive,
    servicesDeliveredToday,
    quotesPending,
    totalAccountsBalance: totalBalance,
    criticalStockCount,
    warrantyClaimsPending,
    activePersonnelCount,
    activeBranchesCount,
    alertCount: (criticalStockCount > 0 ? 1 : 0) + (quotesPending > 0 ? 1 : 0),
  }
}

/** Collect real-time consolidated alerts */
export async function collectAdminAlerts(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = []
  const now = new Date().toISOString()

  // 1. Critical stock alert
  const { data: lowStockParts } = await supabase
    .from('parts')
    .select('id, name, stock_quantity, min_stock_threshold')
    .eq('tenant_id', tenantId)
    .lte('stock_quantity', 3)
    .limit(5)

  if (lowStockParts && lowStockParts.length > 0) {
    alerts.push({
      id: 'low-stock',
      severity: 'critical',
      title: `${lowStockParts.length} Parçada Kritik Stok Seviyesi`,
      description: `Minimum seviyenin altındaki parçalar: ${lowStockParts.map(p => p.name).join(', ')}`,
      resource: 'inventory',
      href: '/dashboard/stok',
      count: lowStockParts.length,
      timestamp: now,
    })
  }

  // 2. Pending customer quote approvals
  const { count: pendingQuotes } = await supabase
    .from('service_orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'pending')

  if (pendingQuotes && pendingQuotes > 0) {
    alerts.push({
      id: 'pending-quotes',
      severity: 'warning',
      title: `${pendingQuotes} Bekleyen Müşteri Fiyat Teklifi`,
      description: 'Müşteri onayı bekleyen onarım teklifleri bulunmaktadır.',
      resource: 'services',
      href: '/dashboard/atolye',
      count: pendingQuotes,
      timestamp: now,
    })
  }

  // 3. Active warranties or claim follow-up
  const { count: activeWarranties } = await supabase
    .from('warranties')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (activeWarranties && activeWarranties > 0) {
    alerts.push({
      id: 'warranty-active',
      severity: 'info',
      title: `${activeWarranties} Aktif Cihaz Garantisi`,
      description: 'Takipte olan müşteri cihaz garantileri.',
      resource: 'warranty',
      href: '/dashboard/garanti',
      count: activeWarranties,
      timestamp: now,
    })
  }

  return alerts
}

/** Universal omnibar search query execution */
export async function performUniversalSearch(
  supabase: SupabaseClient,
  tenantId: string,
  query: string,
): Promise<UniversalSearchResult[]> {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed || trimmed.length < 2) return []

  const results: UniversalSearchResult[] = []

  // Search service orders
  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, order_no, customer_name, device_model, status')
    .eq('tenant_id', tenantId)
    .or(`order_no.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%,device_model.ilike.%${trimmed}%`)
    .limit(5)

  if (orders) {
    for (const o of orders) {
      results.push({
        id: o.id,
        type: 'service',
        title: `${o.order_no} — ${o.device_model || 'Cihaz'}`,
        subtitle: `${o.customer_name || 'Müşteri'} · Durum: ${o.status}`,
        badge: o.status,
        href: `/dashboard/atolye/${o.id}`,
      })
    }
  }

  // Search parts
  const { data: parts } = await supabase
    .from('parts')
    .select('id, name, part_code, stock_quantity, sale_price')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.%${trimmed}%,part_code.ilike.%${trimmed}%`)
    .limit(5)

  if (parts) {
    for (const p of parts) {
      results.push({
        id: p.id,
        type: 'part',
        title: p.name,
        subtitle: `Kod: ${p.part_code || '—'} · Stok: ${p.stock_quantity ?? 0} adet`,
        badge: `${p.sale_price ?? 0} ₺`,
        href: `/dashboard/stok?search=${encodeURIComponent(p.name)}`,
      })
    }
  }

  // Search customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, city')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
    .limit(5)

  if (customers) {
    for (const c of customers) {
      results.push({
        id: c.id,
        type: 'customer',
        title: c.name,
        subtitle: `Tel: ${c.phone || '—'} · ${c.city || ''}`,
        href: `/dashboard/musteriler?search=${encodeURIComponent(c.name)}`,
      })
    }
  }

  return results
}
