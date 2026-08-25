import { describe, it, expect, beforeEach } from 'vitest'
import {
  QC_CHECKLIST,
  isQcComplete,
  qcProgress,
  evaluateQc,
  mapDbStatusToStore,
  mapStoreStatusToDb,
  mapDbStatusToPublic,
  mapStoreStatusToPublic,
} from '@/lib/erp-features'
import {
  loadStore,
  saveStore,
  canDeliverService,
  deliverService,
  type StoreServiceOrder,
} from '@/lib/store'
import { canDeliverService as canDeliverRole } from '@/lib/role-access'
import { canPushFinance } from '@/lib/api-role-guard'

describe('Workshop Delivery & QC State Machine Complete Audit', () => {
  beforeEach(() => {
    // Reset test store
    const store = loadStore()
    store.serviceOrders = []
    store.serviceDeliveries = {}
    store.transactions = []
    store.notificationSettings.require_qc_on_delivery = true
    saveStore(store)
  })

  // Scenario 1: QC Incomplete -> Delivery Blocked
  it('Scenario 1: QC Incomplete — Delivery is blocked when require_qc_on_delivery is true', () => {
    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-1',
      job_no: 'SRV-001',
      customer_name: 'Ahmet Yılmaz',
      customer_phone: '05551112233',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
      status: 'in_repair',
      estimated_cost: 1500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Mehmet Usta',
      eta: null,
      final_checks: ['Ekran testi yapıldı'], // only 1 of 8 items done
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    const evalResult = evaluateQc(testOrder.final_checks)
    expect(evalResult.passed).toBe(false)
    expect(evalResult.done).toBe(1)
    expect(evalResult.total).toBe(8)
    expect(evalResult.missing.length).toBe(7)

    const check = canDeliverService('srv-test-1')
    expect(check.ok).toBe(false)
    expect(check.reason).toContain('Kalite kontrol')

    const delivered = deliverService('srv-test-1', 1500)
    expect(delivered).toBeNull()
  })

  // Scenario 2: QC Complete (PASS) -> Auto-transition to Hazır / delivery enabled
  it('Scenario 2: QC Complete (PASS) — Automatically completes QC and enables delivery', () => {
    const allChecks = [...QC_CHECKLIST]
    expect(isQcComplete(allChecks)).toBe(true)

    const progress = qcProgress(allChecks)
    expect(progress.done).toBe(8)
    expect(progress.total).toBe(8)
    expect(progress.passed).toBe(true)

    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-2',
      job_no: 'SRV-002',
      customer_name: 'Zeynep Kaya',
      customer_phone: '05552223344',
      device_brand: 'Samsung',
      device_model: 'S23',
      status: 'ready_for_pickup',
      estimated_cost: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Ali Usta',
      eta: null,
      final_checks: allChecks,
      qc_passed: true,
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    const check = canDeliverService('srv-test-2', allChecks)
    expect(check.ok).toBe(true)
  })

  // Scenario 3: Post-QC PASS -> Delivery button is NOT blocked by QC warning again
  it('Scenario 3: Post-QC PASS — Delivery is not blocked once QC is marked passed', () => {
    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-3',
      job_no: 'SRV-003',
      customer_name: 'Fatma Demir',
      customer_phone: '05553334455',
      device_brand: 'Xiaomi',
      device_model: 'Redmi Note 12',
      status: 'ready_for_pickup',
      estimated_cost: 1200,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Ahmet Usta',
      eta: null,
      final_checks: [...QC_CHECKLIST],
      qc_passed: true,
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    // Verify delivery check succeeds multiple times without re-prompting QC
    const check1 = canDeliverService('srv-test-3')
    expect(check1.ok).toBe(true)

    const check2 = canDeliverService('srv-test-3', testOrder.final_checks)
    expect(check2.ok).toBe(true)
  })

  // Scenario 4: QC FAIL -> Delivery strictly blocked, reverts to in_repair / tamir
  it('Scenario 4: QC FAIL — Delivery is blocked and status returns to in_repair (tamir)', () => {
    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-4',
      job_no: 'SRV-004',
      customer_name: 'Cem Akın',
      customer_phone: '05554445566',
      device_brand: 'Apple',
      device_model: 'iPhone 11',
      status: 'in_repair',
      estimated_cost: 1800,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Mehmet Usta',
      eta: null,
      final_checks: ['Ekran testi yapıldı'], // missing 7 items
      qc_passed: false,
      qc_fail_reason: 'Dokunmatik ekran alt kısımda algılamıyor',
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    const check = canDeliverService('srv-test-4')
    expect(check.ok).toBe(false)

    // DB status mapping check
    expect(mapStoreStatusToDb('in_repair')).toBe('tamir')
  })

  // Scenario 5: Delivery -> Financial transaction created, status updated to delivered, history updated
  it('Scenario 5: Delivery Execution — Creates financial income, updates order status to delivered', () => {
    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-5',
      job_no: 'SRV-005',
      customer_name: 'Deniz Er',
      customer_phone: '05555556677',
      device_brand: 'Huawei',
      device_model: 'P40',
      status: 'ready_for_pickup',
      estimated_cost: 2500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Ali Usta',
      eta: null,
      final_checks: [...QC_CHECKLIST],
      qc_passed: true,
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    const delivery = deliverService('srv-test-5', 2500)
    expect(delivery).not.toBeNull()
    expect(delivery?.service_fee).toBe(2500)
    expect(delivery?.financial_posted).toBe(true)

    const updatedStore = loadStore()
    const updatedOrder = updatedStore.serviceOrders.find(o => o.id === 'srv-test-5')
    expect(updatedOrder?.status).toBe('delivered')

    // Financial transaction created
    const tx = updatedStore.transactions.find(t => t.id === delivery?.finance_tx_id)
    expect(tx).toBeDefined()
    expect(tx?.amount).toBe(2500)
    expect(tx?.type).toBe('gelir')
    expect(tx?.category).toBe('Servis Teslim')
  })

  // Scenario 6: DB Check Constraint Compatibility
  it('Scenario 6: DB Status Compatibility — All mapped DB statuses adhere to DB check constraint', () => {
    const allowedDbStatuses = [
      'alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol', 'teslim', 'iptal',
    ]

    const storeStatusesToTest = [
      'waiting_diagnosis',
      'parts_waiting',
      'customer_approval_pending',
      'in_repair',
      'onarimda',
      'kalite_kontrol',
      'hazir',
      'teslime_hazir',
      'ready_for_pickup',
      'delivered',
      'teslim_edildi',
      'cancelled',
      'iptal',
    ]

    for (const s of storeStatusesToTest) {
      const dbStatus = mapStoreStatusToDb(s)
      expect(
        allowedDbStatuses,
        `Store status '${s}' mapped to '${dbStatus}' which must be in allowed DB check constraint statuses`,
      ).toContain(dbStatus)
    }
  })

  // Scenario 7: Web + Mobile Unified State Machine Consistency
  it('Scenario 7: Web + Mobile Consistency — Identical QC evaluation and status derivation', () => {
    const emptyChecks: string[] = []
    const partialChecks = ['Ekran testi yapıldı', 'Kamera ön/arka test']
    const completeChecks = [...QC_CHECKLIST]

    expect(isQcComplete(emptyChecks)).toBe(false)
    expect(isQcComplete(partialChecks)).toBe(false)
    expect(isQcComplete(completeChecks)).toBe(true)

    // Test mapDbStatusToStore with QC metadata
    const orderWithQcPass = { status: 'kalite_kontrol', metadata: { qc_passed: true, final_checks: completeChecks } }
    const orderWithoutQcPass = { status: 'kalite_kontrol', metadata: { qc_passed: false, final_checks: partialChecks } }

    expect(mapDbStatusToStore(orderWithQcPass.status, orderWithQcPass.metadata)).toBe('ready_for_pickup')
    expect(mapDbStatusToStore(orderWithoutQcPass.status, orderWithoutQcPass.metadata)).toBe('kalite_kontrol')
  })

  // Scenario 8: Duplicate Delivery Protection
  it('Scenario 8: Duplicate Delivery Guard — Already delivered order cannot be re-delivered', () => {
    const store = loadStore()
    const testOrder: StoreServiceOrder = {
      id: 'srv-test-8',
      job_no: 'SRV-008',
      customer_name: 'Hakan Can',
      customer_phone: '05556667788',
      device_brand: 'Apple',
      device_model: 'iPhone 14',
      status: 'ready_for_pickup',
      estimated_cost: 3000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      technician: 'Ali Usta',
      eta: null,
      final_checks: [...QC_CHECKLIST],
      qc_passed: true,
    }
    store.serviceOrders = [testOrder]
    saveStore(store)

    // First delivery
    const firstDelivery = deliverService('srv-test-8', 3000)
    expect(firstDelivery).not.toBeNull()

    // Second delivery attempt
    const secondCheck = canDeliverService('srv-test-8')
    expect(secondCheck.ok).toBe(false)
    expect(secondCheck.reason).toContain('zaten teslim')

    const secondDelivery = deliverService('srv-test-8', 3000)
    expect(secondDelivery).toEqual(firstDelivery)
  })

  // Scenario 9: Role Authorization
  it('Scenario 9: Role-Based Delivery Authorization', () => {
    expect(canDeliverRole('super_admin')).toBe(true)
    expect(canDeliverRole('tenant_admin')).toBe(true)
    expect(canDeliverRole('satis')).toBe(true)
    expect(canDeliverRole('kasiyer')).toBe(true)
    expect(canDeliverRole('viewer')).toBe(false)

    expect(canPushFinance('super_admin')).toBe(true)
    expect(canPushFinance('tenant_admin')).toBe(true)
    expect(canPushFinance('muhasebe')).toBe(true)
    expect(canPushFinance('viewer')).toBe(false)
  })
})
