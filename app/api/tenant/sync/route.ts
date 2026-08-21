export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { tenantQuery, sinceQuery } from '@/lib/supabase/query-helpers'
import { withApiHandler } from '@/lib/api-handler'
import {
  partToStock,
  customerToStore,
  txToStore,
  saleToStore,
  serviceOrderToStore,
  purchaseToStore,
  todoToStore,
  stolenToStore,
  customerOrderToStore,
  storeProductToStore,
  assetToStore,
  campaignToStore,
  dealToStore,
  showcaseToSecondHand,
  branchToStore,
  defaultNotificationSettings,
  appointmentToStore,
  warrantyToStore,
  invoiceToStore,
  notificationLogToStore,
  supportTicketToStore,
  cashShiftToStore,
  supplierOrderToStore,
  personnelToStore,
  foreignDeviceToStore,
  serviceExpenseToStore,
  statusHistoryToStore,
} from '@/lib/db-mappers'
import type { StoreData } from '@/lib/store'
import type { ServiceDelivery } from '@/lib/store'

export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth
  const tid = tenantId
  const since = req.nextUrl.searchParams.get('since')
  const incremental = Boolean(since)

  const partsQ = sinceQuery(
      tenantQuery(supabase.from('parts').select('*'), tid).order('name'),
      since,
    )
    const customersQ = sinceQuery(
      tenantQuery(supabase.from('customers').select('*'), tid).order('full_name'),
      since,
    )
    const txQ = tenantQuery(
      supabase.from('financial_transactions').select('*'), tid,
    ).order('transaction_date', { ascending: false })
    const txFiltered = since
      ? txQ.or(`updated_at.gte.${since},created_at.gte.${since}`)
      : txQ.limit(500)
    const salesQ = sinceQuery(
      tenantQuery(supabase.from('sales').select('*'), tid)
        .order('created_at', { ascending: false }),
      since,
    )
    const ordersQ = sinceQuery(
      tenantQuery(
        supabase.from('service_orders').select('*, technician:user_profiles!technician_id(full_name)'),
        tid,
      ).order('created_at', { ascending: false }),
      since,
    )

    const [
      partsRes,
      customersRes,
      txRes,
      salesRes,
      ordersRes,
      purchasesRes,
      todosRes,
      stolenRes,
      custOrdersRes,
      productsRes,
      assetsRes,
      campaignsRes,
      dealsRes,
      showcaseRes,
      branchesRes,
      tenantRes,
      settingsRes,
      accountsRes,
    ] = await Promise.all([
      partsQ,
      customersQ,
      txFiltered,
      salesQ.limit(200),
      ordersQ.limit(300),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('purchases').select('*'), tid).order('created_at', { ascending: false }).limit(200),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('todos').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('stolen_imeis').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('customer_orders').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('store_products').select('*'), tid).order('name'),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('assets').select('*'), tid).order('name'),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('campaigns').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('deals').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('showcase_devices').select('*'), tid).order('created_at', { ascending: false }),
      incremental
        ? Promise.resolve({ data: [], error: null })
        : tenantQuery(supabase.from('branches').select('*'), tid).order('name'),
      supabase.from('tenants').select('company_name, phone, address, shop_name, shop_logo, portal_slug').eq('id', tid).maybeSingle(),
      tenantQuery(supabase.from('tenant_settings').select('settings, updated_at'), tid).maybeSingle(),
      tenantQuery(supabase.from('accounts').select('balance'), tid).eq('type', 'kasa').limit(1),
    ])

    const queryErrors: { table: string; err: string }[] = [
      { table: 'parts', err: partsRes.error?.message },
      { table: 'showcase_devices', err: showcaseRes.error?.message },
      { table: 'tenant_settings', err: settingsRes.error?.message },
      { table: 'service_orders', err: ordersRes.error?.message },
      { table: 'tenants', err: tenantRes.error?.message },
    ].filter((e): e is { table: string; err: string } => Boolean(e.err))

    const [
      appointmentsRes,
      warrantiesRes,
      invoicesRes,
      notifLogsRes,
      supportRes,
      cashShiftsRes,
      supplierRes,
      personnelRes,
      foreignDevicesRes,
    ] = incremental
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ]
      : await Promise.all([
      tenantQuery(supabase.from('appointments').select('*'), tid).order('appointment_date', { ascending: false }),
      tenantQuery(supabase.from('warranties').select('*'), tid).order('created_at', { ascending: false }),
      tenantQuery(supabase.from('invoices').select('*'), tid).order('created_at', { ascending: false }),
      tenantQuery(supabase.from('notification_logs').select('*'), tid).order('created_at', { ascending: false }).limit(200),
      tenantQuery(supabase.from('support_tickets').select('*'), tid).order('created_at', { ascending: false }),
      tenantQuery(supabase.from('cash_shifts').select('*'), tid).order('opened_at', { ascending: false }),
      tenantQuery(supabase.from('supplier_orders').select('*'), tid).order('created_at', { ascending: false }),
      tenantQuery(supabase.from('personnel_profiles').select('*'), tid).order('full_name'),
      tenantQuery(supabase.from('foreign_devices').select('*'), tid).order('created_at', { ascending: false }),
    ])

    const tenant = tenantRes.data as Record<string, unknown> | null
    const settingsJson = (settingsRes.data?.settings as Record<string, unknown>) ?? {}

    const serviceOrders = (ordersRes.data ?? []).map(r => serviceOrderToStore(r as Record<string, unknown>))
    const orderIds = serviceOrders.map(o => o.id).filter(Boolean)

    let serviceExpensesRes: { data: Record<string, unknown>[] | null; error: { message: string } | null } = {
      data: [],
      error: null,
    }
    if (orderIds.length > 0 && !incremental) {
      const byTenant = await supabase
        .from('service_expenses')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(500)
      if (byTenant.error?.message?.includes('tenant_id')) {
        serviceExpensesRes = await supabase
          .from('service_expenses')
          .select('*')
          .in('service_order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(500)
      } else {
        serviceExpensesRes = byTenant
      }
    }

    if (serviceExpensesRes.error) {
      queryErrors.push({ table: 'service_expenses', err: serviceExpensesRes.error.message })
    }

    let statusHistoryRows: Record<string, unknown>[] = []
    if (orderIds.length > 0 && !incremental) {
      const statusHistoryRes = await supabase
        .from('service_status_history')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .limit(1000)
      if (statusHistoryRes.error) {
        queryErrors.push({ table: 'service_status_history', err: statusHistoryRes.error.message })
      } else {
        statusHistoryRows = (statusHistoryRes.data ?? []) as Record<string, unknown>[]
      }
    }
    const transactions = (txRes.data ?? []).map(r => txToStore(r as Record<string, unknown>))

    const serviceDeliveries: Record<string, ServiceDelivery> = {}
    for (const order of serviceOrders) {
      if (!order.financial_posted) continue
      const incomeTx = transactions.find(
        t => t.service_id === order.id && t.type === 'gelir' && t.category === 'Servis Teslim'
      )
      const expenseTotal = transactions
        .filter(t => t.service_id === order.id && t.type === 'gider')
        .reduce((s, t) => s + t.amount, 0)
      const serviceFee = incomeTx?.amount ?? order.actual_cost ?? 0
      const netProfit = order.net_profit ?? (serviceFee - expenseTotal)
      serviceDeliveries[order.id] = {
        service_id: order.id,
        service_fee: serviceFee,
        total_expense: expenseTotal,
        net_profit: netProfit,
        profit_margin: serviceFee > 0 ? Math.round((netProfit / serviceFee) * 10000) / 100 : 0,
        delivered_at: order.delivered_at ?? new Date().toISOString(),
        financial_posted: true,
        finance_tx_id: incomeTx?.id,
      }
    }

    const serviceExpenses: Record<string, import('@/lib/store').ServiceExpense[]> = {}
    for (const row of serviceExpensesRes.data ?? []) {
      const exp = serviceExpenseToStore(row as Record<string, unknown>)
      if (!serviceExpenses[exp.service_id]) serviceExpenses[exp.service_id] = []
      serviceExpenses[exp.service_id].push(exp)
    }

    const statusHistory = statusHistoryRows.map(r => statusHistoryToStore(r))

    const payload: Partial<StoreData> = {
      stock: (partsRes.data ?? []).map(r => partToStock(r as Record<string, unknown>)),
      customers: (customersRes.data ?? []).map(r => customerToStore(r as Record<string, unknown>)),
      transactions,
      sales: (salesRes.data ?? []).map(r => saleToStore(r as Record<string, unknown>)),
      serviceOrders,
      serviceDeliveries,
      purchases: (purchasesRes.data ?? []).map(r => purchaseToStore(r as Record<string, unknown>)),
      todos: (todosRes.data ?? []).map(r => todoToStore(r as Record<string, unknown>)),
      stolenIMEIs: (stolenRes.data ?? []).map(r => stolenToStore(r as Record<string, unknown>)),
      customerOrders: (custOrdersRes.data ?? []).map(r => customerOrderToStore(r as Record<string, unknown>)),
      storeProducts: (productsRes.data ?? []).map(r => storeProductToStore(r as Record<string, unknown>)),
      assets: (assetsRes.data ?? []).map(r => assetToStore(r as Record<string, unknown>)),
      campaigns: (campaignsRes.data ?? []).map(r => campaignToStore(r as Record<string, unknown>)),
      deals: (dealsRes.data ?? []).map(r => dealToStore(r as Record<string, unknown>)),
      secondHandDevices: (showcaseRes.data ?? []).map(r => showcaseToSecondHand(r as Record<string, unknown>)),
      branches: (branchesRes.data ?? []).map(r => branchToStore(r as Record<string, unknown>)),
      kasaBakiye: Number(accountsRes.data?.[0]?.balance) || 0,
      notificationSettings: {
        ...defaultNotificationSettings(tenant ?? undefined),
        ...(settingsJson as Partial<StoreData['notificationSettings']>),
      },
      appointments: (appointmentsRes.data ?? []).map(r => appointmentToStore(r as Record<string, unknown>)),
      personnel: (personnelRes.data ?? []).map(r => personnelToStore(r as Record<string, unknown>)),
      warranties: (warrantiesRes.data ?? []).map(r => warrantyToStore(r as Record<string, unknown>)),
      invoices: (invoicesRes.data ?? []).map(r => invoiceToStore(r as Record<string, unknown>)),
      notificationLogs: (notifLogsRes.data ?? []).map(r => notificationLogToStore(r as Record<string, unknown>)),
      supportTickets: (supportRes.data ?? []).map(r => supportTicketToStore(r as Record<string, unknown>)),
      cashShifts: (cashShiftsRes.data ?? []).map(r => cashShiftToStore(r as Record<string, unknown>)),
      supplierOrders: (supplierRes.data ?? []).map(r => supplierOrderToStore(r as Record<string, unknown>)),
      foreignDevices: (foreignDevicesRes.data ?? []).map(r => foreignDeviceToStore(r as Record<string, unknown>)),
      serviceExpenses,
      statusHistory,
    }

    return NextResponse.json({
      ok: true,
      tenantId: tid,
      data: payload,
      synced_at: new Date().toISOString(),
      sync_token: settingsRes.data?.updated_at ?? new Date().toISOString(),
      incremental,
      partial: queryErrors.length > 0,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    })
}, 'tenant/sync')
