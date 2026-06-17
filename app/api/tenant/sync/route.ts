export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
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

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth
  const tid = tenantId

  try {
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
      supabase.from('parts').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('customers').select('*').eq('tenant_id', tid).order('full_name'),
      supabase.from('financial_transactions').select('*').eq('tenant_id', tid).order('transaction_date', { ascending: false }).limit(500),
      supabase.from('sales').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(200),
      supabase.from('service_orders').select('*, technician:user_profiles!technician_id(full_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(300),
      supabase.from('purchases').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(200),
      supabase.from('todos').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('stolen_imeis').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('customer_orders').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('store_products').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('assets').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('campaigns').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('deals').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('showcase_devices').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('branches').select('*').eq('tenant_id', tid).order('name'),
      supabase.from('tenants').select('company_name, phone, address, shop_name, shop_logo, portal_slug').eq('id', tid).single(),
      supabase.from('tenant_settings').select('settings').eq('tenant_id', tid).maybeSingle(),
      supabase.from('accounts').select('balance').eq('tenant_id', tid).eq('type', 'kasa').limit(1),
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
      serviceExpensesRes,
    ] = await Promise.all([
      supabase.from('appointments').select('*').eq('tenant_id', tid).order('appointment_date', { ascending: false }),
      supabase.from('warranties').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('notification_logs').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(200),
      supabase.from('support_tickets').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('cash_shifts').select('*').eq('tenant_id', tid).order('opened_at', { ascending: false }),
      supabase.from('supplier_orders').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('personnel_profiles').select('*').eq('tenant_id', tid).order('full_name'),
      supabase.from('foreign_devices').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
      supabase.from('service_expenses').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(500),
    ])

    if (serviceExpensesRes.error) {
      queryErrors.push({ table: 'service_expenses', err: serviceExpensesRes.error.message })
    }

    const tenant = tenantRes.data as Record<string, unknown> | null
    const settingsJson = (settingsRes.data?.settings as Record<string, unknown>) ?? {}

    const serviceOrders = (ordersRes.data ?? []).map(r => serviceOrderToStore(r as Record<string, unknown>))
    const orderIds = serviceOrders.map(o => o.id).filter(Boolean)

    let statusHistoryRows: Record<string, unknown>[] = []
    if (orderIds.length > 0) {
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
      data: payload,
      synced_at: new Date().toISOString(),
      partial: queryErrors.length > 0,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
