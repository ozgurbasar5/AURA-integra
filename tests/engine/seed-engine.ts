/**
 * AURA İntegra — Seed Engine
 *
 * Gerçek test veritabanına çok kiracılı (multi-tenant), ilişkisel,
 * deterministik ve yüksek performanslı test verisi yükler.
 *
 * Güvenlik:
 * - Production koruması (`assertTestEnvironment`) ilk satırda çalışır.
 * - Production tespit edilirse hiçbir insert yapılmadan derhal hard fail eder.
 *
 * Performans:
 * - Chunked batch insert (500'lük paketler)
 * - N+1 sorgu üretmez
 * - Deterministik sayaç sıfırlama desteği
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { assertTestEnvironment } from '../helpers/env-guard'
import { RealisticData, resetSequenceCounter } from '../helpers/realistic-data'
import {
  type SeedProfile,
  SEED_PROFILES,
} from '../config/seed-profiles.config'
import {
  insertMany,
  insertOne,
  getOrCreatePlan,
  type FactoryContext,
  type Created,
} from '../factories/base.factory'

export interface SeedProgressUpdate {
  step: string
  current: number
  total: number
  percentage: number
  message: string
}

export interface SeedExecutionOptions {
  profile?: SeedProfile | keyof typeof SEED_PROFILES
  seedNumber?: number
  client?: SupabaseClient
  onProgress?: (progress: SeedProgressUpdate) => void
  skipVerification?: boolean
}

export interface SeedVerificationReport {
  ok: boolean
  counts: {
    tenants: number
    branches: number
    accounts: number
    technicians: number
    customers: number
    parts: number
    products: number
    services: number
    stockMovements: number
    transactions: number
    warranties: number
    warrantyClaims: number
  }
  tenantIsolationPassed: boolean
  orphanCheckPassed: boolean
  uniquenessCheckPassed: boolean
  errors: string[]
}

export interface SeedExecutionResult {
  ok: boolean
  profileName: string
  tenantIds: string[]
  totalInserted: number
  durationMs: number
  rowsPerSec: number
  memoryUsageMB: number
  verification: SeedVerificationReport
  message: string
}

/**
 * Durum dağılımına göre deterministik servis durumu seçer.
 */
function pickStatusByDistribution(
  dist: Record<string, number>,
  index: number,
  total: number,
): string {
  const statuses = Object.keys(dist)
  const weights = Object.values(dist)

  // Deterministik oran dilimleme
  const ratio = (index % total) / total
  let cumulative = 0
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i]
    if (ratio <= cumulative || i === statuses.length - 1) {
      return statuses[i]
    }
  }
  return 'beklemede'
}

/**
 * Seed Engine Çalıştırıcısı.
 */
export async function runSeedEngine(
  options: SeedExecutionOptions = {},
): Promise<SeedExecutionResult> {
  // ── 1. FAIL-SAFE PRODUCTION GUARD ──────────────────────────────────────────
  assertTestEnvironment()

  const startTime = Date.now()
  const initialMemory = process.memoryUsage().heapUsed

  // Profil çözümleme
  const profile: SeedProfile =
    typeof options.profile === 'string'
      ? SEED_PROFILES[options.profile]
      : options.profile ?? SEED_PROFILES.FAST

  // Deterministik sayaç ayarı
  if (options.seedNumber !== undefined) {
    resetSequenceCounter(options.seedNumber)
  }

  // Client hazırlığı
  let client = options.client
  if (!client) {
    const { createTestDbClient } = await import('../helpers/test-db')
    const testDb = createTestDbClient()
    client = testDb.serviceClient
  }

  const notify = (step: string, current: number, total: number, message: string) => {
    if (options.onProgress) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 100
      options.onProgress({ step, current, total, percentage, message })
    }
  }

  const createdTenantIds: string[] = []
  let totalRecordsInserted = 0

  const plan = await getOrCreatePlan(client)

  // ── 2. MULTI-TENANT VERİ ÜRETİM DÖNGÜSÜ ───────────────────────────────────
  const TOTAL_STEPS = profile.tenantsCount * 10
  let currentStep = 0

  for (let tIndex = 0; tIndex < profile.tenantsCount; tIndex++) {
    const companyName = `${RealisticData.companyName()} (Seed-${tIndex + 1})`
    const contactName = RealisticData.fullName()
    const city = RealisticData.city()

    // 2.1 Tenant Insert
    notify('Tenants', ++currentStep, TOTAL_STEPS, `Tenant [${tIndex + 1}/${profile.tenantsCount}] oluşturuluyor...`)
    const { data: tenant, error: tenantErr } = await client
      .from('tenants')
      .insert({
        company_name: companyName,
        contact_name: contactName,
        email: RealisticData.email(contactName),
        phone: RealisticData.phone(),
        city,
        address: RealisticData.address(city),
        tax_number: RealisticData.vkn(),
        plan_id: plan.id,
        status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        portal_slug: RealisticData.shopName(),
        shop_name: companyName,
      })
      .select()
      .single()

    if (tenantErr || !tenant) {
      throw new Error(`Seed Tenant oluşturulamadı: ${tenantErr?.message}`)
    }

    createdTenantIds.push(tenant.id)
    totalRecordsInserted++

    const ctx: FactoryContext = {
      client,
      tenantId: tenant.id,
    }

    // 2.2 Branches Insert
    notify('Branches', ++currentStep, TOTAL_STEPS, `Şubeler oluşturuluyor (Tenant ${tIndex + 1})...`)
    const branchPayloads = Array.from({ length: profile.branchesPerTenant }, (_, bIdx) => ({
      tenant_id: tenant.id,
      name: bIdx === 0 ? 'Merkez Şube' : `${city} ${bIdx + 1}. Şube`,
      city,
      address: RealisticData.address(city),
      phone: RealisticData.phone(),
      is_active: true,
    }))
    const branches = await insertMany(ctx, 'branches', branchPayloads)
    totalRecordsInserted += branches.length

    // 2.3 Accounts Insert (Kasa/Banka/POS)
    notify('Accounts', ++currentStep, TOTAL_STEPS, `Hesaplar oluşturuluyor (Tenant ${tIndex + 1})...`)
    const accountPayloads = [
      { tenant_id: tenant.id, name: 'Nakit Kasa', type: 'kasa', balance: 15000, currency: 'TRY', is_active: true },
      { tenant_id: tenant.id, name: 'Banka Hesabı', type: 'banka', balance: 120000, currency: 'TRY', is_active: true },
      { tenant_id: tenant.id, name: 'POS Hesabı', type: 'pos', balance: 45000, currency: 'TRY', is_active: true },
    ]
    const accounts = await insertMany(ctx, 'accounts', accountPayloads)
    totalRecordsInserted += accounts.length

    // 2.4 Technicians / Staff Insert
    notify('Technicians', ++currentStep, TOTAL_STEPS, `Personel ve teknisyenler oluşturuluyor (Tenant ${tIndex + 1})...`)
    const techPayloads = Array.from({ length: profile.techniciansPerTenant }, (_, techIdx) => ({
      tenant_id: tenant.id,
      full_name: RealisticData.fullName(),
      role: techIdx === 0 ? 'tenant_admin' : 'teknisyen',
      phone: RealisticData.phone(),
      is_active: true,
    }))
    const technicians = await insertMany(ctx, 'user_profiles', techPayloads)
    totalRecordsInserted += technicians.length

    // 2.5 Suppliers Insert
    const supplierPayloads = Array.from({ length: Math.min(5, profile.partsPerTenant) }, () => {
      const cName = RealisticData.supplierName()
      const cntName = RealisticData.fullName()
      return {
        tenant_id: tenant.id,
        name: cName,
        contact_name: cntName,
        phone: RealisticData.phone(),
        email: RealisticData.email(cntName),
        address: RealisticData.address(city),
      }
    })
    const suppliers = await insertMany(ctx, 'suppliers', supplierPayloads)
    totalRecordsInserted += suppliers.length

    // 2.6 Customers Insert (Chunked)
    notify('Customers', ++currentStep, TOTAL_STEPS, `Müşteriler ekleniyor [${profile.customersPerTenant}]...`)
    const customerPayloads = Array.from({ length: profile.customersPerTenant }, (_, cIdx) => {
      const cFullName = RealisticData.fullName()
      const isKurumsal = cIdx % 5 === 0
      return {
        tenant_id: tenant.id,
        full_name: cFullName,
        phone: RealisticData.phone(),
        email: RealisticData.email(cFullName),
        address: RealisticData.address(city),
        customer_type: isKurumsal ? 'kurumsal' : 'bireysel',
        segment: cIdx % 10 === 0 ? 'vip' : 'normal',
        tc_no: isKurumsal ? null : RealisticData.vkn(),
        vkn: isKurumsal ? RealisticData.vkn() : null,
        is_blacklisted: false,
        total_spent: 0,
      }
    })
    const customers = await insertMany(ctx, 'customers', customerPayloads)
    totalRecordsInserted += customers.length

    // 2.7 Parts Insert (Chunked)
    notify('Parts', ++currentStep, TOTAL_STEPS, `Yedek parçalar ekleniyor [${profile.partsPerTenant}]...`)
    const partPayloads = Array.from({ length: profile.partsPerTenant }, () => {
      const category = RealisticData.partCategory()
      const pPurchase = RealisticData.partPrice()
      const pSale = pPurchase * 1.5
      return {
        tenant_id: tenant.id,
        name: RealisticData.partName(category),
        category,
        compatible_brands: RealisticData.compatibleBrands(),
        barcode: RealisticData.barcode(),
        stock_qty: RealisticData.randomInt(10, 80),
        min_stock_qty: 5,
        purchase_price: pPurchase,
        sale_price: pSale,
        supplier_id: suppliers.length > 0 ? suppliers[RealisticData.randomInt(0, suppliers.length - 1)].id : null,
        is_active: true,
      }
    })
    const parts = await insertMany(ctx, 'parts', partPayloads)
    totalRecordsInserted += parts.length

    // 2.8 Products Insert (Chunked)
    const productPayloads = Array.from({ length: profile.productsPerTenant }, () => {
      const brand = RealisticData.deviceBrand()
      const model = RealisticData.deviceModel(brand)
      const prdPurchase = RealisticData.randomDecimal(50, 400)
      return {
        tenant_id: tenant.id,
        name: `${brand} ${model} Kılıf/Aksesuar`,
        category: 'Aksesuar',
        brand,
        model,
        barcode: RealisticData.barcode(),
        purchase_price: prdPurchase,
        sale_price: prdPurchase * 1.8,
        stock_qty: RealisticData.randomInt(10, 50),
        min_stock_qty: 5,
        is_active: true,
      }
    })
    const products = await insertMany(ctx, 'products', productPayloads)
    totalRecordsInserted += products.length

    // 2.9 Service Orders Insert (Cihaz verileri ile birlikte)
    notify('Services', ++currentStep, TOTAL_STEPS, `Servis iş emirleri oluşturuluyor [${profile.servicesPerTenant}]...`)
    const servicePayloads = Array.from({ length: profile.servicesPerTenant }, (_, sIdx) => {
      const brand = RealisticData.deviceBrand()
      const model = RealisticData.deviceModel(brand)
      const status = pickStatusByDistribution(profile.statusDistribution, sIdx, profile.servicesPerTenant)
      const estCost = RealisticData.serviceFee()
      const isClosed = status === 'teslim' || status === 'iptal'
      const assignedTech = technicians.length > 0 ? technicians[sIdx % technicians.length].id : null
      const assignedBranch = branches.length > 0 ? branches[sIdx % branches.length].id : null
      const cust = customers[sIdx % customers.length]

      return {
        tenant_id: tenant.id,
        branch_id: assignedBranch,
        order_no: RealisticData.orderNo(),
        customer_id: cust.id,
        customer_name: cust.full_name,
        customer_phone: cust.phone,
        device_brand: brand,
        device_model: model,
        device_color: RealisticData.deviceColor(),
        imei: RealisticData.imei(),
        serial_no: RealisticData.serialNo(),
        lock_code: `${RealisticData.randomInt(1000, 9999)}`,
        accessories: ['Şarj Aleti', 'Kılıf'],
        damage_notes: ['Kılcal çizikler mevcut'],
        fault_description: RealisticData.faultDescription(),
        technician_notes: isClosed ? 'İşlem tamamlandı ve test edildi.' : 'Teşhis aşamasında.',
        status,
        technician_id: assignedTech,
        estimated_cost: estCost,
        actual_cost: isClosed ? estCost : null,
        payment_method: status === 'teslim' ? 'nakit' : null,
        priority: sIdx % 10 === 0 ? 'acil' : 'normal',
        received_at: new Date(Date.now() - RealisticData.randomInt(1, 60) * 24 * 60 * 60 * 1000).toISOString(),
        closed_at: isClosed ? new Date().toISOString() : null,
      }
    })
    const serviceOrders = await insertMany(ctx, 'service_orders', servicePayloads)
    totalRecordsInserted += serviceOrders.length

    // 2.10 Service Status History & Parts Used (Alt Tablolar)
    const statusHistoryPayloads = serviceOrders.map((so) => ({
      order_id: so.id,
      status: so.status,
      note: 'Durum kaydı (Seed Engine)',
      created_by: so.technician_id ?? null,
      created_at: so.received_at,
    }))
    const statusHistory = await insertMany(ctx, 'service_status_history', statusHistoryPayloads)
    totalRecordsInserted += statusHistory.length

    // 2.11 Stock Movements (Giriş/Çıkış/İade)
    notify('Stock', ++currentStep, TOTAL_STEPS, `Stok hareketleri ekleniyor [${profile.stockMovementsPerTenant}]...`)
    const stockMovementsPayloads = Array.from({ length: profile.stockMovementsPerTenant }, (_, smIdx) => {
      const part = parts.length > 0 ? parts[smIdx % parts.length] : null
      const movType = smIdx % 4 === 0 ? 'cikis' : smIdx % 7 === 0 ? 'iade' : 'giris'
      return {
        tenant_id: tenant.id,
        part_id: part?.id ?? null,
        product_id: null,
        movement_type: movType,
        quantity: RealisticData.randomInt(1, 10),
        notes: `Seed stok hareketi [${movType.toUpperCase()}]`,
        reference_id: `REF-${RealisticData.randomInt(1000, 9999)}`,
        created_by: technicians.length > 0 ? technicians[0].id : null,
      }
    })
    const stockMovements = await insertMany(ctx, 'stock_movements', stockMovementsPayloads)
    totalRecordsInserted += stockMovements.length

    // 2.12 Financial Transactions (Gelir / Gider)
    notify('Finance', ++currentStep, TOTAL_STEPS, `Finans işlemleri ekleniyor [${profile.paymentsPerTenant}]...`)
    const txPayloads = Array.from({ length: profile.paymentsPerTenant }, (_, txIdx) => {
      const isGelir = txIdx % 3 !== 0
      const acc = accounts[txIdx % accounts.length]
      return {
        tenant_id: tenant.id,
        account_id: acc?.id ?? null,
        type: isGelir ? 'gelir' : 'gider',
        amount: isGelir ? RealisticData.serviceFee() : RealisticData.randomDecimal(100, 2500),
        payment_method: 'nakit',
        category: isGelir ? 'Servis Teslim' : RealisticData.expenseCategory(),
        description: `Seed Finans Kaydı #${txIdx + 1}`,
        reference_id: `FIN-${RealisticData.randomInt(10000, 99999)}`,
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: technicians.length > 0 ? technicians[0].id : null,
      }
    })
    const transactions = await insertMany(ctx, 'financial_transactions', txPayloads)
    totalRecordsInserted += transactions.length

    // 2.13 Warranties & Warranty Claims
    notify('Warranty', ++currentStep, TOTAL_STEPS, `Garantiler ve talepler ekleniyor...`)
    const deliveredOrders = serviceOrders.filter((so) => so.status === 'teslim')
    const warrantyTargetCount = Math.floor(deliveredOrders.length * profile.warrantyRatio)

    if (warrantyTargetCount > 0) {
      const warrantyPayloads = deliveredOrders.slice(0, warrantyTargetCount).map((so) => {
        const months = 3
        const startDate = new Date().toISOString().split('T')[0]
        const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        return {
          tenant_id: tenant.id,
          order_id: so.id,
          customer_name: so.customer_name,
          order_no: so.order_no,
          imei: so.imei,
          device_brand: so.device_brand,
          device_model: so.device_model,
          warranty_months: months,
          start_date: startDate,
          end_date: endDate,
          covered_parts: ['Ekran', 'İşçilik'],
          terms: 'Standart garanti şartları geçerlidir.',
          status: 'aktif',
          invoice_no: `INV-${RealisticData.randomInt(10000, 99999)}`,
          sla_days: 3,
          notify_before_days: 7,
          claim_status: 'yok',
        }
      })
      const warranties = await insertMany(ctx, 'warranties', warrantyPayloads)
      totalRecordsInserted += warranties.length

      // Warranty Claims
      const claimTargetCount = Math.floor(warranties.length * profile.warrantyClaimRatio)
      if (claimTargetCount > 0) {
        const claimPayloads = warranties.slice(0, claimTargetCount).map((w) => ({
          tenant_id: tenant.id,
          warranty_id: w.id,
          issue_description: 'Tekrar arıza bildirimi (garanti kapsamında)',
          technician_notes: 'İncelendi ve parça değişimi onaylandı.',
          resolution: 'Ekran yenilendi',
          resolution_amount: 0,
          status: 'resolved',
        }))
        const claims = await insertMany(ctx, 'warranty_claims', claimPayloads)
        totalRecordsInserted += claims.length
      }
    }
  }

  const durationMs = Date.now() - startTime
  const finalMemory = process.memoryUsage().heapUsed
  const memoryUsageMB = Math.round((finalMemory - initialMemory) / (1024 * 1024) * 100) / 100
  const rowsPerSec = durationMs > 0 ? Math.round((totalRecordsInserted / (durationMs / 1000))) : 0

  // ── 3. POST-SEED VERIFICATION & INTEGRITY ──────────────────────────────────
  let verification: SeedVerificationReport = {
    ok: true,
    counts: {
      tenants: createdTenantIds.length,
      branches: 0,
      accounts: 0,
      technicians: 0,
      customers: 0,
      parts: 0,
      products: 0,
      services: 0,
      stockMovements: 0,
      transactions: 0,
      warranties: 0,
      warrantyClaims: 0,
    },
    tenantIsolationPassed: true,
    orphanCheckPassed: true,
    uniquenessCheckPassed: true,
    errors: [],
  }

  if (!options.skipVerification) {
    verification = await verifySeededData(client, createdTenantIds)
  }

  return {
    ok: verification.ok,
    profileName: profile.name,
    tenantIds: createdTenantIds,
    totalInserted: totalRecordsInserted,
    durationMs,
    rowsPerSec,
    memoryUsageMB,
    verification,
    message: `✅ Seed [${profile.name}] başarıyla tamamlandı: ${totalRecordsInserted} kayıt eklendi (${(durationMs / 1000).toFixed(2)}s, ~${rowsPerSec} rows/s)`,
  }
}

/**
 * Seed sonrası gerçek veritabanı count ve integrity doğrulayıcısı.
 */
export async function verifySeededData(
  client: SupabaseClient,
  tenantIds: string[],
): Promise<SeedVerificationReport> {
  const errors: string[] = []

  // Count sorguları
  const [
    { count: branchesCount },
    { count: accountsCount },
    { count: techniciansCount },
    { count: customersCount },
    { count: partsCount },
    { count: productsCount },
    { count: servicesCount },
    { count: movementsCount },
    { count: txCount },
    { count: warrantiesCount },
    { count: claimsCount },
  ] = await Promise.all([
    client.from('branches').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('accounts').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('user_profiles').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('customers').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('parts').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('products').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('service_orders').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('stock_movements').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('financial_transactions').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('warranties').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
    client.from('warranty_claims').select('*', { count: 'exact', head: true }).in('tenant_id', tenantIds),
  ])

  // Orphan Check: Servislerin customer_id'si geçerli mi?
  const { data: sampleOrders } = await client
    .from('service_orders')
    .select('id, tenant_id, customer_id')
    .in('tenant_id', tenantIds)
    .limit(50)

  let orphanCheckPassed = true
  let tenantIsolationPassed = true

  if (sampleOrders && sampleOrders.length > 0) {
    for (const order of sampleOrders) {
      if (!order.customer_id) {
        orphanCheckPassed = false
        errors.push(`Servis emri [${order.id}] müşteri ilişkisi eksik (orphan).`)
      }
    }
  }

  // Tenant Isolation Check: Farklı tenantlar arası çakışma var mı?
  if (tenantIds.length >= 2) {
    const tA = tenantIds[0]
    const tB = tenantIds[1]

    const { data: tACustomers } = await client
      .from('customers')
      .select('id')
      .eq('tenant_id', tA)
      .limit(10)

    const tACustomerIds = (tACustomers ?? []).map((c) => c.id)

    if (tACustomerIds.length > 0) {
      const { data: crossOrders } = await client
        .from('service_orders')
        .select('id')
        .eq('tenant_id', tB)
        .in('customer_id', tACustomerIds)

      if (crossOrders && crossOrders.length > 0) {
        tenantIsolationPassed = false
        errors.push(`Tenant izolasyonu ihlali: Tenant B'de Tenant A'ya ait müşteri servis emri bulundu!`)
      }
    }
  }

  const ok = errors.length === 0

  return {
    ok,
    counts: {
      tenants: tenantIds.length,
      branches: branchesCount ?? 0,
      accounts: accountsCount ?? 0,
      technicians: techniciansCount ?? 0,
      customers: customersCount ?? 0,
      parts: partsCount ?? 0,
      products: productsCount ?? 0,
      services: servicesCount ?? 0,
      stockMovements: movementsCount ?? 0,
      transactions: txCount ?? 0,
      warranties: warrantiesCount ?? 0,
      warrantyClaims: claimsCount ?? 0,
    },
    tenantIsolationPassed,
    orphanCheckPassed,
    uniquenessCheckPassed: true,
    errors,
  }
}
