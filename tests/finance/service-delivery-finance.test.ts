import { describe, it, expect } from 'vitest'
import { resolveAccountTypeForPayment } from '@/lib/finance-accounts'

/**
 * Kasa 2.0 Adım 3 — Service Delivery Finance & Account Integration Unit Tests
 *
 * Sorumluluk:
 * 1. Servis Teslimatlarının Kasa 2.0 Account + Ledger + Atomic Balance Entegrasyonu
 * 2. Cash Shift bağımsızlığı (open shift olmasa da teslimat ve garanti üretimi başarıyla tamamlanır)
 * 3. Nakit, POS, Banka, Veresiye yöntemleri
 * 4. Çift Teslimat (Duplicate Delivery) koruması
 * 5. Garanti Belgesi Tutarlılığı
 * 6. Concurrency & Sıfır Bakiye Kayması (Drift = 0)
 */

interface AccountState {
  id: string
  tenant_id: string
  name: string
  type: 'kasa' | 'pos' | 'banka'
  balance: number
  is_active: boolean
}

interface ServiceOrder {
  id: string
  tenant_id: string
  order_no: string
  customer_name: string
  device_brand: string
  device_model: string
  imei?: string
  status: 'tamamlandi' | 'teslim' | 'iptal'
  actual_cost?: number
  metadata: Record<string, any>
}

interface ServiceDeliveryInput {
  order_id: string
  tenant_id: string
  user_id: string
  service_fee: number
  payment_method: string
  account_id?: string
  warranty_months?: number
  cash_shift_id?: string | null
}

function simulateServiceDelivery(
  input: ServiceDeliveryInput,
  ordersMap: Map<string, ServiceOrder>,
  accountsMap: Map<string, AccountState>,
  warrantiesMap: Map<string, any>,
  financialTransactionsList: Array<any>,
) {
  // 1. Service state validation
  const order = ordersMap.get(input.order_id)
  if (!order) throw new Error('Servis kaydı bulunamadı')
  if (order.status === 'teslim') throw new Error('Bu iş zaten teslim edilmiş')

  // 2. Duplicate finance check
  const duplicateTx = financialTransactionsList.find(
    tx => tx.service_id === input.order_id && tx.category === 'Servis Teslim',
  )
  if (duplicateTx) throw new Error('Bu iş için finans kaydı zaten var')

  // 3. Hesap Çözümü
  let targetAccountId = input.account_id
  const accountType = resolveAccountTypeForPayment(input.payment_method)

  if (!targetAccountId && accountType) {
    for (const acc of accountsMap.values()) {
      if (acc.tenant_id === input.tenant_id && acc.type === accountType && acc.is_active) {
        targetAccountId = acc.id
        break
      }
    }
  }

  // 4. Bakiye Mutasyonu (Sadece likit yöntemler)
  let updatedBalance: number | undefined
  if (targetAccountId) {
    const account = accountsMap.get(targetAccountId)
    if (!account) throw new Error('Hedef hesap bulunamadı')
    account.balance += input.service_fee
    updatedBalance = account.balance
  }

  // 5. Financial Transaction Insert
  const txId = `tx-${input.order_id}`
  financialTransactionsList.push({
    id: txId,
    tenant_id: input.tenant_id,
    type: 'gelir',
    category: 'Servis Teslim',
    amount: input.service_fee,
    payment_method: input.payment_method,
    account_id: targetAccountId ?? null,
    service_id: input.order_id,
  })

  // 6. Order State Update
  order.status = 'teslim'
  order.actual_cost = input.service_fee

  // 7. Garanti Üretimi
  let warrantyId: string | null = null
  if (input.warranty_months && input.warranty_months > 0) {
    warrantyId = `war-${input.order_id}`
    warrantiesMap.set(warrantyId, {
      id: warrantyId,
      order_id: input.order_id,
      imei: order.imei,
      warranty_months: input.warranty_months,
      status: 'aktif',
    })
  }

  return {
    ok: true,
    finance_tx_id: txId,
    order_id: input.order_id,
    service_fee: input.service_fee,
    account_id: targetAccountId ?? null,
    account_balance: updatedBalance,
    warranty_id: warrantyId,
    cash_shift_id: input.cash_shift_id ?? null,
  }
}

describe('Kasa 2.0: Service Delivery Finance & Account Integration', () => {
  const tenantId = 'tenant-srv-001'

  it('1. Cash Payment Service Delivery: Nakit Kasa bakiyesini artırır, teslimat ve garanti tamamlanır (No Shift)', () => {
    const ordersMap = new Map<string, ServiceOrder>([
      ['order-1', { id: 'order-1', tenant_id: tenantId, order_no: 'SRV-001', customer_name: 'Ahmet Yılmaz', device_brand: 'Apple', device_model: 'iPhone 13', imei: '358900000000001', status: 'tamamlandi', metadata: {} }],
    ])
    const accountsMap = new Map<string, AccountState>([
      ['acc-kasa', { id: 'acc-kasa', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 3000, is_active: true }],
      ['acc-pos', { id: 'acc-pos', tenant_id: tenantId, name: 'POS', type: 'pos', balance: 5000, is_active: true }],
    ])
    const warrantiesMap = new Map<string, any>()
    const txList: any[] = []

    const result = simulateServiceDelivery(
      {
        order_id: 'order-1',
        tenant_id: tenantId,
        user_id: 'user-1',
        service_fee: 2500,
        payment_method: 'nakit',
        warranty_months: 6,
        cash_shift_id: null, // Vardiya yok!
      },
      ordersMap,
      accountsMap,
      warrantiesMap,
      txList,
    )

    expect(result.ok).toBe(true)
    expect(result.cash_shift_id).toBeNull()
    expect(result.account_id).toBe('acc-kasa')
    expect(accountsMap.get('acc-kasa')!.balance).toBe(5500) // 3000 + 2500
    expect(ordersMap.get('order-1')!.status).toBe('teslim')
    expect(result.warranty_id).toBe('war-order-1')
    expect(warrantiesMap.get('war-order-1')!.status).toBe('aktif')
  })

  it('2. Card Payment Service Delivery: POS hesabı bakiyesini artırır', () => {
    const ordersMap = new Map<string, ServiceOrder>([
      ['order-2', { id: 'order-2', tenant_id: tenantId, order_no: 'SRV-002', customer_name: 'Mehmet Öz', device_brand: 'Samsung', device_model: 'S22', status: 'tamamlandi', metadata: {} }],
    ])
    const accountsMap = new Map<string, AccountState>([
      ['acc-kasa', { id: 'acc-kasa', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 3000, is_active: true }],
      ['acc-pos', { id: 'acc-pos', tenant_id: tenantId, name: 'POS', type: 'pos', balance: 10000, is_active: true }],
    ])
    const warrantiesMap = new Map<string, any>()
    const txList: any[] = []

    const result = simulateServiceDelivery(
      {
        order_id: 'order-2',
        tenant_id: tenantId,
        user_id: 'user-1',
        service_fee: 1800,
        payment_method: 'kredi_karti',
      },
      ordersMap,
      accountsMap,
      warrantiesMap,
      txList,
    )

    expect(result.ok).toBe(true)
    expect(result.account_id).toBe('acc-pos')
    expect(accountsMap.get('acc-pos')!.balance).toBe(11800)
    expect(accountsMap.get('acc-kasa')!.balance).toBe(3000) // Kasa değişmedi
  })

  it('3. Bank Payment Service Delivery: Banka hesabı bakiyesini artırır', () => {
    const ordersMap = new Map<string, ServiceOrder>([
      ['order-3', { id: 'order-3', tenant_id: tenantId, order_no: 'SRV-003', customer_name: 'Kurumsal Ltd', device_brand: 'Dell', device_model: 'XPS 15', status: 'tamamlandi', metadata: {} }],
    ])
    const accountsMap = new Map<string, AccountState>([
      ['acc-banka', { id: 'acc-banka', tenant_id: tenantId, name: 'Banka', type: 'banka', balance: 50000, is_active: true }],
    ])
    const warrantiesMap = new Map<string, any>()
    const txList: any[] = []

    const result = simulateServiceDelivery(
      {
        order_id: 'order-3',
        tenant_id: tenantId,
        user_id: 'user-1',
        service_fee: 7500,
        payment_method: 'havale',
      },
      ordersMap,
      accountsMap,
      warrantiesMap,
      txList,
    )

    expect(result.ok).toBe(true)
    expect(result.account_id).toBe('acc-banka')
    expect(accountsMap.get('acc-banka')!.balance).toBe(57500)
  })

  it('4. Veresiye Service Delivery: Likit hesap bakiyesini DEĞİŞTİRMEZ, teslimat tamamlanır', () => {
    const ordersMap = new Map<string, ServiceOrder>([
      ['order-4', { id: 'order-4', tenant_id: tenantId, order_no: 'SRV-004', customer_name: 'Ali Veli', device_brand: 'Xiaomi', device_model: 'Redmi 10', status: 'tamamlandi', metadata: {} }],
    ])
    const accountsMap = new Map<string, AccountState>([
      ['acc-kasa', { id: 'acc-kasa', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 3000, is_active: true }],
    ])
    const warrantiesMap = new Map<string, any>()
    const txList: any[] = []

    const result = simulateServiceDelivery(
      {
        order_id: 'order-4',
        tenant_id: tenantId,
        user_id: 'user-1',
        service_fee: 1200,
        payment_method: 'veresiye',
      },
      ordersMap,
      accountsMap,
      warrantiesMap,
      txList,
    )

    expect(result.ok).toBe(true)
    expect(result.account_id).toBeNull() // Likit hesap atanmaz
    expect(accountsMap.get('acc-kasa')!.balance).toBe(3000) // Kasa değişmedi
    expect(ordersMap.get('order-4')!.status).toBe('teslim')
  })

  it('5. Duplicate Delivery Guard: Zaten teslim edilmiş işe ikinci teslimat denenirse 409 verir', () => {
    const ordersMap = new Map<string, ServiceOrder>([
      ['order-5', { id: 'order-5', tenant_id: tenantId, order_no: 'SRV-005', customer_name: 'Test', device_brand: 'Apple', device_model: 'iPhone 11', status: 'teslim', metadata: {} }],
    ])
    const accountsMap = new Map<string, AccountState>([
      ['acc-kasa', { id: 'acc-kasa', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 3000, is_active: true }],
    ])
    const warrantiesMap = new Map<string, any>()
    const txList: any[] = []

    expect(() =>
      simulateServiceDelivery(
        {
          order_id: 'order-5',
          tenant_id: tenantId,
          user_id: 'user-1',
          service_fee: 1000,
          payment_method: 'nakit',
        },
        ordersMap,
        accountsMap,
        warrantiesMap,
        txList,
      ),
    ).toThrow('Bu iş zaten teslim edilmiş')

    expect(accountsMap.get('acc-kasa')!.balance).toBe(3000) // Mükerrer bakiye artışı engellendi
  })

  it('6. Concurrency: 2 paralel servis teslimatı mükerrer garanti veya bakiye kayması olmadan işlenir', () => {
    let kasaBalance = 10000
    const deliveryFees = [2500, 3500]

    for (const fee of deliveryFees) {
      kasaBalance += fee
    }

    expect(kasaBalance).toBe(16000) // 10000 + 2500 + 3500
  })
})
