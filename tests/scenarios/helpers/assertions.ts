/**
 * AURA İntegra — Scenario Invariant & Business State Assertions
 *
 * Tüm senaryolarda paylaşılan güçlü iş kuralları ve durum kontrolcüleri.
 */

import { expect } from 'vitest'

/**
 * Tüm kayıtların beklenen tenant'a ait olduğunu (Tenant Isolation) doğrular.
 */
export function assertTenantOwnership<T extends { tenant_id?: string; id?: string }>(
  records: T | T[],
  expectedTenantId: string,
  entityName = 'Kayıt'
): void {
  const list = Array.isArray(records) ? records : [records]
  for (const item of list) {
    expect(
      item.tenant_id,
      `${entityName} [${item.id ?? 'unknown'}] tenant_id (${item.tenant_id}) beklenen tenant (${expectedTenantId}) ile eşleşmiyor!`
    ).toBe(expectedTenantId)
  }
}

/**
 * Parça stok miktarının beklenen delta kadar değiştiğini doğrular.
 */
export function assertStockDelta(
  stockBefore: number,
  stockAfter: number,
  expectedDelta: number,
  partName = 'Parça'
): void {
  const actualDelta = stockAfter - stockBefore
  expect(
    actualDelta,
    `${partName} stok değişimi (${actualDelta}) beklenen delta (${expectedDelta}) ile uyuşmuyor! Önce: ${stockBefore}, Sonra: ${stockAfter}`
  ).toBe(expectedDelta)
}

/**
 * Kasa/Banka hesap bakiyesinin beklenen delta kadar değiştiğini doğrular.
 */
export function assertFinancialDelta(
  balanceBefore: number,
  balanceAfter: number,
  expectedDelta: number,
  accountName = 'Hesap'
): void {
  const actualDelta = balanceAfter - balanceBefore
  expect(
    actualDelta,
    `${accountName} bakiye değişimi (${actualDelta}) beklenen delta (${expectedDelta}) ile uyuşmuyor! Önce: ${balanceBefore}, Sonra: ${balanceAfter}`
  ).toBe(expectedDelta)
}

/**
 * Servis iş emrinin durumunu ve onay durumunu doğrular.
 */
export function assertServiceState(
  serviceOrder: { id?: string; status?: unknown; approval_status?: unknown } | Record<string, unknown>,
  expectedStatus: string,
  expectedApprovalStatus?: string
): void {
  const currentStatus = String(serviceOrder.status ?? '')
  expect(
    currentStatus,
    `Servis [${serviceOrder.id ?? 'unknown'}] durumu (${currentStatus}) beklenen (${expectedStatus}) ile uyuşmuyor!`
  ).toBe(expectedStatus)

  if (expectedApprovalStatus !== undefined) {
    const currentApproval = String(serviceOrder.approval_status ?? '')
    expect(
      currentApproval,
      `Servis [${serviceOrder.id ?? 'unknown'}] onay durumu (${currentApproval}) beklenen (${expectedApprovalStatus}) ile uyuşmuyor!`
    ).toBe(expectedApprovalStatus)
  }
}

/**
 * Servis emirlerinin sahipsiz (müşterisiz) olmadığını doğrular.
 */
export function assertNoOrphans(
  serviceOrders: Array<{ id: string; customer_id?: string | null }>,
  validCustomerIds: string[]
): void {
  const validSet = new Set(validCustomerIds)
  for (const order of serviceOrders) {
    expect(
      order.customer_id,
      `Servis emri [${order.id}] bir müşteriye bağlı değil (orphan)!`
    ).toBeTruthy()

    expect(
      validSet.has(order.customer_id!),
      `Servis emri [${order.id}] müşterisi (${order.customer_id}) geçerli müşteri kümesinde bulunamadı!`
    ).toBe(true)
  }
}

/**
 * Aynı işlem için mükerrer (duplicate) finans veya stok hareketi oluşmadığını doğrular.
 */
export function assertNoDuplicateBusinessEffect<T>(
  items: T[],
  expectedCount: number,
  effectName = 'İşlem'
): void {
  expect(
    items.length,
    `Mükerrer ${effectName} tespit edildi! Beklenen: ${expectedCount}, Mevcut: ${items.length}`
  ).toBe(expectedCount)
}
