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
} from '@/lib/db-mappers'
import type { StoreData } from '@/lib/store'

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

    const queryErrors = [
      { table: 'parts', err: partsRes.error?.message },
      { table: 'showcase_devices', err: showcaseRes.error?.message },
      { table: 'tenant_settings', err: settingsRes.error?.message },
      { table: 'service_orders', err: ordersRes.error?.message },
      { table: 'tenants', err: tenantRes.error?.message },
    ].filter(e => e.err)

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
    ])

    const tenant = tenantRes.data as Record<string, unknown> | null
    const settingsJson = (settingsRes.data?.settings as Record<string, unknown>) ?? {}

    const payload: Partial<StoreData> = {
      stock: (partsRes.data ?? []).map(r => partToStock(r as Record<string, unknown>)),
      customers: (customersRes.data ?? []).map(r => customerToStore(r as Record<string, unknown>)),
      transactions: (txRes.data ?? []).map(r => txToStore(r as Record<string, unknown>)),
      sales: (salesRes.data ?? []).map(r => saleToStore(r as Record<string, unknown>)),
      serviceOrders: (ordersRes.data ?? []).map(r => serviceOrderToStore(r as Record<string, unknown>)),
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
    }

    return NextResponse.json({ ok: true, data: payload, synced_at: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
