/**
 * AURA İntegra — Servis Emri (Service Order) Factory
 *
 * Servis iş emirleri ve tam ilişki grafikleri (Relation Graph) oluşturur.
 * Tablolar: `service_orders`, `service_status_history`, `service_parts_used`, `financial_transactions`
 *
 * RELATION GRAPH Yapısı:
 *   Tenant
 *   └── Branch
 *       └── Customer
 *           └── Service Order (Cihaz/IMEI/Aksesuar/Arıza)
 *               ├── Status History (Log)
 *               ├── Attached Parts (Kullanılan Parçalar)
 *               ├── Stock Movements (Stok Çıkışı)
 *               └── Financial Transaction (Finansal İşlem)
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { createCustomer } from './customer.factory'
import { createPart } from './part.factory'
import { createFinancialTransaction } from './payment.factory'
import { RealisticData } from '../helpers/realistic-data'

export type ServiceOrderStatus =
  | 'beklemede'
  | 'teslim_alindi'
  | 'teklif_bekliyor'
  | 'onaylandi'
  | 'onaylanmadi'
  | 'tamirde'
  | 'hazir'
  | 'teslim'
  | 'iptal'

export interface CreateServiceOrderInput {
  tenantId?: string
  branch_id?: string
  order_no?: string
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  device_brand?: string
  device_model?: string
  device_color?: string
  imei?: string
  serial_number?: string
  fault_description?: string
  accessories_received?: string[]
  physical_condition?: string
  status?: ServiceOrderStatus
  assigned_technician_id?: string
  estimated_cost?: number
  actual_cost?: number
  service_fee?: number
  discount?: number
  payment_status?: 'odenecek' | 'odedi' | 'kismi' | 'veresiye'
  approval_status?: string | null
  approval_token?: string | null
  approval_amount?: number | null
  financial_posted?: boolean
  delivered_at?: string
  net_profit?: number
  final_checks?: unknown[]
  private_note?: string
  metadata?: Record<string, unknown>
}

export interface ServiceOrderGraphOptions extends CreateServiceOrderInput {
  attachPart?: boolean
  partQuantity?: number
  createPayment?: boolean
}

export interface ServiceOrderGraphResult {
  tenant: Created<Record<string, unknown>>
  branch: Created<Record<string, unknown>>
  customer: Created<Record<string, unknown>>
  serviceOrder: Created<Record<string, unknown>>
  part?: Created<Record<string, unknown>>
  partUsed?: Created<Record<string, unknown>>
  transaction?: Created<Record<string, unknown>>
  ctx: FactoryContext
}

/**
 * Tek bir servis emri oluşturur.
 * customer_id yoksa otomatik müşteri oluşturur ve bağlar.
 */
export async function createServiceOrder(
  ctx?: Partial<FactoryContext>,
  overrides: CreateServiceOrderInput = {},
): Promise<{ serviceOrder: Created<Record<string, unknown>>; ctx: FactoryContext }> {
  let effectiveCtx = ctx as FactoryContext

  if (!effectiveCtx?.tenantId && !overrides.tenantId) {
    if (!effectiveCtx?.client) {
      const { createTestDbClient } = await import('../helpers/test-db')
      const { serviceClient } = createTestDbClient()
      const env = await setupTestEnvironment(serviceClient)
      effectiveCtx = env.ctx
    } else {
      const env = await setupTestEnvironment(effectiveCtx.client)
      effectiveCtx = env.ctx
    }
  }

  const tenantId = overrides.tenantId ?? effectiveCtx.tenantId
  let customerId = overrides.customer_id
  let customerName = overrides.customer_name
  let customerPhone = overrides.customer_phone

  if (!customerId) {
    const { customer } = await createCustomer(effectiveCtx)
    customerId = customer.id
    customerName = customerName ?? (customer.full_name as string)
    customerPhone = customerPhone ?? (customer.phone as string)
  }

  const brand = overrides.device_brand ?? RealisticData.deviceBrand()
  const model = overrides.device_model ?? RealisticData.deviceModel(brand)
  const orderNo = overrides.order_no ?? RealisticData.orderNo()
  const estimatedCost = overrides.estimated_cost ?? RealisticData.serviceFee()
  const status = overrides.status ?? 'beklemede'

  const data = {
    tenant_id: tenantId,
    order_no: orderNo,
    customer_id: customerId,
    customer_name: customerName ?? RealisticData.fullName(),
    customer_phone: customerPhone ?? RealisticData.phone(),
    device_brand: brand,
    device_model: model,
    device_color: overrides.device_color ?? RealisticData.deviceColor(),
    imei: overrides.imei ?? RealisticData.imei(),
    serial_number: overrides.serial_number ?? RealisticData.serialNo(),
    fault_description: overrides.fault_description ?? RealisticData.faultDescription(),
    accessories_received: overrides.accessories_received ?? ['Kılıf', 'Adaptör'],
    physical_condition: overrides.physical_condition ?? 'Kılcal çizikler var',
    status,
    assigned_technician_id: overrides.assigned_technician_id ?? null,
    branch_id: overrides.branch_id ?? null,
    estimated_cost: estimatedCost,
    actual_cost: overrides.actual_cost ?? (status === 'teslim' ? estimatedCost : null),
    service_fee: overrides.service_fee ?? (status === 'teslim' ? estimatedCost : null),
    discount: overrides.discount ?? 0,
    payment_status: overrides.payment_status ?? (status === 'teslim' ? 'odedi' : 'odenecek'),
    financial_posted: overrides.financial_posted ?? (status === 'teslim'),
    delivered_at: overrides.delivered_at ?? (status === 'teslim' ? new Date().toISOString() : null),
    net_profit: overrides.net_profit ?? (status === 'teslim' ? estimatedCost * 0.7 : 0),
    final_checks: overrides.final_checks ?? [],
    private_note: overrides.private_note ?? null,
    metadata: overrides.metadata ?? {},
  }

  const serviceOrder = await insertOne(effectiveCtx, 'service_orders', data)

  // Otomatik durum geçmişi kaydı (service_status_history)
  try {
    await insertOne(effectiveCtx, 'service_status_history', {
      order_id: serviceOrder.id,
      tenant_id: tenantId,
      status,
      note: 'Servis emri oluşturuldu (factory)',
      created_by: effectiveCtx.userId ?? null,
    })
  } catch {
    // Opsiyonel log
  }

  return { serviceOrder, ctx: effectiveCtx }
}

/**
 * Servis emrine kullanılan yedek parça kaydı ekler.
 */
export async function addPartToServiceOrder(
  ctx: FactoryContext,
  orderId: string,
  partId: string,
  quantity = 1,
  unitPrice?: number,
): Promise<Created<Record<string, unknown>>> {
  const price = unitPrice ?? RealisticData.partSalePrice()

  return insertOne(ctx, 'service_parts_used', {
    order_id: orderId,
    part_id: partId,
    tenant_id: ctx.tenantId,
    quantity,
    unit_price: price,
    total_price: price * quantity,
  })
}

/**
 * Müşteriden Teslime Kadar Eksiksiz RELATION GRAPH Oluşturucu:
 * Tenant → Branch → Customer → Device → Service Order → Part → Financial Transaction
 */
export async function createServiceOrderGraph(
  clientOrCtx?: FactoryContext | unknown,
  options: ServiceOrderGraphOptions = {},
): Promise<ServiceOrderGraphResult> {
  let effectiveCtx: FactoryContext

  if ((clientOrCtx as FactoryContext)?.client && (clientOrCtx as FactoryContext)?.tenantId) {
    effectiveCtx = clientOrCtx as FactoryContext
  } else if (clientOrCtx) {
    const env = await setupTestEnvironment(clientOrCtx as Parameters<typeof setupTestEnvironment>[0])
    effectiveCtx = env.ctx
  } else {
    const { createTestDbClient } = await import('../helpers/test-db')
    const { serviceClient } = createTestDbClient()
    const env = await setupTestEnvironment(serviceClient)
    effectiveCtx = env.ctx
  }

  // Tenant ve Branch bilgilerini al
  const { data: tenant } = await effectiveCtx.client.from('tenants').select('*').eq('id', effectiveCtx.tenantId).single()
  const { data: branch } = await effectiveCtx.client.from('branches').select('*').eq('tenant_id', effectiveCtx.tenantId).limit(1).single()

  // Customer oluştur
  const { customer } = await createCustomer(effectiveCtx, {
    full_name: options.customer_name,
    phone: options.customer_phone,
  })

  // Service Order oluştur
  const { serviceOrder } = await createServiceOrder(effectiveCtx, {
    ...options,
    customer_id: customer.id,
    customer_name: customer.full_name as string,
    customer_phone: customer.phone as string,
    branch_id: branch?.id ?? options.branch_id,
  })

  let part: Created<Record<string, unknown>> | undefined
  let partUsed: Created<Record<string, unknown>> | undefined
  let transaction: Created<Record<string, unknown>> | undefined

  // Opsiyonel yedek parça ve stok çıkışı ekle
  if (options.attachPart) {
    const partRes = await createPart(effectiveCtx, { createOpeningMovement: true })
    part = partRes.part
    partUsed = await addPartToServiceOrder(effectiveCtx, serviceOrder.id, part.id, options.partQuantity ?? 1)
  }

  // Opsiyonel ödeme / finans kaydı ekle
  if (options.createPayment || options.status === 'teslim') {
    const txRes = await createFinancialTransaction(effectiveCtx, {
      type: 'gelir',
      category: 'Servis Teslim',
      amount: (serviceOrder.service_fee as number) ?? (serviceOrder.estimated_cost as number) ?? 500,
      customer_name: customer.full_name as string,
      order_no: serviceOrder.order_no as string,
      service_id: serviceOrder.id,
      financial_posted: true,
    })
    transaction = txRes.transaction
  }

  return {
    tenant: tenant as Created<Record<string, unknown>>,
    branch: branch as Created<Record<string, unknown>>,
    customer,
    serviceOrder,
    part,
    partUsed,
    transaction,
    ctx: effectiveCtx,
  }
}

/**
 * N+1 query oluşturmadan toplu servis emri kaydı oluşturur (batch insert).
 */
export async function createServiceOrders(
  ctx: FactoryContext,
  count: number,
  overrides: CreateServiceOrderInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const { customer } = await createCustomer(ctx)
  const orders = Array.from({ length: count }, () => {
    const brand = overrides.device_brand ?? RealisticData.deviceBrand()
    const model = overrides.device_model ?? RealisticData.deviceModel(brand)
    const estimatedCost = overrides.estimated_cost ?? RealisticData.serviceFee()

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      order_no: RealisticData.orderNo(),
      customer_id: overrides.customer_id ?? customer.id,
      customer_name: overrides.customer_name ?? (customer.full_name as string),
      customer_phone: overrides.customer_phone ?? (customer.phone as string),
      device_brand: brand,
      device_model: model,
      device_color: overrides.device_color ?? RealisticData.deviceColor(),
      imei: overrides.imei ?? RealisticData.imei(),
      serial_number: overrides.serial_number ?? RealisticData.serialNo(),
      fault_description: overrides.fault_description ?? RealisticData.faultDescription(),
      accessories_received: overrides.accessories_received ?? [],
      physical_condition: overrides.physical_condition ?? 'İyi durumda',
      status: overrides.status ?? 'beklemede',
      assigned_technician_id: overrides.assigned_technician_id ?? null,
      branch_id: overrides.branch_id ?? null,
      estimated_cost: estimatedCost,
      actual_cost: overrides.actual_cost ?? null,
      service_fee: overrides.service_fee ?? null,
      discount: overrides.discount ?? 0,
      payment_status: overrides.payment_status ?? 'odenecek',
      financial_posted: overrides.financial_posted ?? false,
      final_checks: overrides.final_checks ?? [],
      metadata: overrides.metadata ?? {},
    }
  })

  return insertMany(ctx, 'service_orders', orders)
}
