import { describe, it, expect } from 'vitest'
import {
  createTenant,
  createTenantGraph,
  createTenants,
  createBranch,
  createBranches,
  createAccount,
  createDefaultAccounts,
  createAccounts,
  createUserProfile,
  createTechnician,
  createTechnicians,
  createCustomer,
  createCustomers,
  createSupplier,
  createSuppliers,
  createPart,
  createParts,
  createProduct,
  createProducts,
  createServiceOrder,
  createServiceOrders,
  createServiceOrderGraph,
  createStockMovement,
  createStockMovements,
  createFinancialTransaction,
  createFinancialTransactions,
  createWarranty,
  createWarrantyClaim,
  createWarranties,
} from './index'

/**
 * Faz 2 — Domain Factories Master Test Suite
 *
 * Doğrulanan yetenekler:
 * 1. Tenant & Tenant Graph
 * 2. Branch Factory
 * 3. Account Factory
 * 4. Technician & User Profile Factory
 * 5. Customer Factory
 * 6. Part Factory
 * 7. Product Factory
 * 8. Supplier Factory
 * 9. Service Order & Full Relation Graph
 * 10. Stock Movement Factory
 * 11. Payment / Financial Transaction Factory
 * 12. Warranty & Claim Factory
 */
describe('Faz 2 — Domain Factories Master Suite', () => {

  describe('1. Tenant Factory & Graph', () => {
    it('tekil tenant kaydı oluşturur', async () => {
      const mockClient = {
        from: (table: string) => ({
          insert: (data: unknown) => ({
            select: () => ({
              single: async () => ({ data: { id: 'tenant-100', ...(data as object) }, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: async () => ({ data: { id: 'plan-1' }, error: null }),
              }),
            }),
          }),
        }),
      } as never

      const tenant = await createTenant(mockClient, { company_name: 'Antigravity Bilişim' })
      expect(tenant.id).toBe('tenant-100')
      expect(tenant.company_name).toBe('Antigravity Bilişim')
      expect(tenant.portal_slug).toBeTruthy()
    })

    it('createTenantGraph izole tam tenant yapısı (Tenant+Branch+Accounts+Technician) kurar', async () => {
      const createdTables: string[] = []
      const mockClient = {
        from: (table: string) => {
          createdTables.push(table)
          return {
            insert: (data: unknown) => {
              const isArr = Array.isArray(data)
              const returnArray = isArr ? data.map((d, i) => ({ id: `${table}-${i}`, ...(d as object) })) : []
              const returnSingle = !isArr ? { id: `${table}-id`, ...(data as object) } : null

              return {
                select: () => {
                  const promise = Promise.resolve({ data: isArr ? returnArray : [returnSingle], error: null })
                  return Object.assign(promise, {
                    single: async () => ({ data: returnSingle, error: null }),
                  })
                },
              }
            },
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: async () => ({ data: { id: 'plan-1' }, error: null }),
                }),
              }),
            }),
          }
        },
      } as never

      const graph = await createTenantGraph(mockClient, { company_name: 'Merkez Bilişim' })
      expect(graph.tenant).toBeDefined()
      expect(graph.branch).toBeDefined()
      expect(graph.accounts.length).toBeGreaterThan(0)
      expect(graph.technician).toBeDefined()
      expect(graph.ctx.tenantId).toBe(graph.tenant.id)

      expect(createdTables).toContain('tenants')
      expect(createdTables).toContain('branches')
      expect(createdTables).toContain('accounts')
      expect(createdTables).toContain('user_profiles')
    })

    it('createTenants batch insert ile N+1 oluşturmadan toplu kayıt ekler', async () => {
      let insertedCount = 0
      const mockClient = {
        from: () => ({
          insert: (data: unknown[]) => {
            insertedCount = data.length
            return {
              select: async () => ({
                data: data.map((item, idx) => ({ id: `tenant-${idx}`, ...(item as object) })),
                error: null,
              }),
            }
          },
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: async () => ({ data: { id: 'plan-1' }, error: null }),
              }),
            }),
          }),
        }),
      } as never

      const list = await createTenants(mockClient, 3)
      expect(list.length).toBe(3)
      expect(insertedCount).toBe(3)
    })
  })

  describe('2. Branch Factory', () => {
    it('şube kaydı oluşturur ve tenant_id yi bağlar', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'br-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { branch } = await createBranch(mockCtx, { name: 'Kadıköy Şubesi', city: 'İstanbul' })
      expect(branch.id).toBe('br-1')
      expect(branch.name).toBe('Kadıköy Şubesi')
      expect(branch.city).toBe('İstanbul')
      expect(branch.tenant_id).toBe('tenant-001')
    })

    it('createBranches batch insert ile şube listesi oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown[]) => ({
              select: async () => ({
                data: data.map((item, idx) => ({ id: `br-${idx}`, ...(item as object) })),
                error: null,
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const branches = await createBranches(mockCtx, 4)
      expect(branches.length).toBe(4)
    })
  })

  describe('3. Account Factory', () => {
    it('tekil kasa/banka hesabı oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'acc-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { account } = await createAccount(mockCtx, { name: 'Garanti Bankası', type: 'banka', balance: 50000 })
      expect(account.id).toBe('acc-1')
      expect(account.type).toBe('banka')
      expect(account.balance).toBe(50000)
    })

    it('createDefaultAccounts kasa, banka ve pos hesaplarını oluşturur', async () => {
      let insertedList: unknown[] = []
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown[]) => {
              insertedList = data
              return {
                select: async () => ({
                  data: data.map((item, idx) => ({ id: `acc-${idx}`, ...(item as object) })),
                  error: null,
                }),
              }
            },
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const accs = await createDefaultAccounts(mockCtx)
      expect(accs.length).toBe(3)
      expect(insertedList.length).toBe(3)
    })
  })

  describe('4. Technician & User Profile Factory', () => {
    it('teknisyen kaydı oluşturur (role = teknisyen)', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'usr-tech-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { technician } = await createTechnician(mockCtx, { full_name: 'Usta Ali' })
      expect(technician.id).toBe('usr-tech-1')
      expect(technician.full_name).toBe('Usta Ali')
      expect(technician.role).toBe('teknisyen')
    })

    it('farklı rollerde kullanıcı profili oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'usr-adm-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { userProfile } = await createUserProfile(mockCtx, { full_name: 'Müdür Hasan', role: 'mudur' })
      expect(userProfile.role).toBe('mudur')
    })
  })

  describe('5. Customer Factory', () => {
    it('başarılı varsayılan değerlerle veri objesi üretir', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'cust-123', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { customer } = await createCustomer(mockCtx)
      expect(customer.id).toBe('cust-123')
      expect(customer.tenant_id).toBe('tenant-001')
      expect(customer.full_name).toBeTruthy()
      expect(customer.phone).toMatch(/^0532/)
    })

    it('override değerlerini doğru uygular', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'cust-456', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { customer } = await createCustomer(mockCtx, {
        full_name: 'Ahmet Özel',
        customer_type: 'kurumsal',
        company_name: 'Özel Ltd. Şti.',
      })

      expect(customer.full_name).toBe('Ahmet Özel')
      expect(customer.customer_type).toBe('kurumsal')
      expect(customer.company_name).toBe('Özel Ltd. Şti.')
    })

    it('geçersiz memnuniyet puanı girildiğinde hata fırlatır', async () => {
      const mockCtx = { client: {} as never, tenantId: 'tenant-001' }
      await expect(createCustomer(mockCtx, { satisfaction_avg: 10 })).rejects.toThrow('0-5 arasında olmalıdır')
    })

    it('batch insert N+1 oluşturmadan toplu kayıt listesi döner', async () => {
      let insertedBatch: unknown[] = []
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown[]) => {
              insertedBatch = data
              return {
                select: async () => ({
                  data: data.map((item, idx) => ({ id: `cust-${idx}`, ...(item as object) })),
                  error: null,
                }),
              }
            },
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const customers = await createCustomers(mockCtx, 5)
      expect(customers.length).toBe(5)
      expect(insertedBatch.length).toBe(5)
    })
  })

  describe('6. Part Factory', () => {
    it('güvenli varsayılan stok ile parça üretir', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'part-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { part } = await createPart(mockCtx)
      expect(part.id).toBe('part-1')
      expect(part.stock_qty).toBe(20)
    })

    it('allowNegativeStock=false iken negatif stok verilirse engeller', async () => {
      const mockCtx = { client: {} as never, tenantId: 'tenant-001' }
      await expect(createPart(mockCtx, { stock_qty: -10 })).rejects.toThrow('allowNegativeStock: true bayrağı gereklidir')
    })

    it('allowNegativeStock=true ile negatif stok oluşturulabilir', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'part-neg', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { part } = await createPart(mockCtx, { stock_qty: -5, allowNegativeStock: true })
      expect(part.stock_qty).toBe(-5)
    })
  })

  describe('7. Product Factory', () => {
    it('perakende ürün kaydı oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'prd-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { product } = await createProduct(mockCtx, { name: 'iPhone 15 Kılıfı' })
      expect(product.name).toBe('iPhone 15 Kılıfı')
      expect(product.vat_rate).toBe(20)
    })
  })

  describe('8. Supplier Factory', () => {
    it('tedarikçi kaydı oluşturur (name ve company_name uyumlu)', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'sup-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { supplier } = await createSupplier(mockCtx, { company_name: 'Tedarik AŞ' })
      expect(supplier.name).toBe('Tedarik AŞ')
      expect(supplier.company_name).toBe('Tedarik AŞ')
    })
  })

  describe('9. Service Order Factory & Relation Graph', () => {
    it('servis emri kaydı ve varsayılan alanları oluşturur', async () => {
      const mockCtx = {
        client: {
          from: (table: string) => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: `${table}-id`, ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { serviceOrder } = await createServiceOrder(mockCtx, { customer_id: 'cust-99' })
      expect(serviceOrder.customer_id).toBe('cust-99')
      expect(serviceOrder.status).toBe('beklemede')
      expect(serviceOrder.order_no).toMatch(/^SRV-/)
    })

    it('Relation Graph mimarisini doğrulayan composite graph', async () => {
      const createdTables: string[] = []
      const mockCtx = {
        client: {
          from: (table: string) => {
            createdTables.push(table)
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: { id: `${table}-1`, tenant_id: 't-1' }, error: null }),
                  limit: () => ({ single: async () => ({ data: { id: `${table}-1`, tenant_id: 't-1' }, error: null }) }),
                }),
              }),
              insert: (data: unknown) => ({
                select: () => ({
                  single: async () => ({ data: { id: `${table}-id`, ...(data as object) }, error: null }),
                }),
              }),
            }
          },
        } as never,
        tenantId: 'tenant-001',
      }

      const graph = await createServiceOrderGraph(mockCtx, {
        attachPart: true,
        createPayment: true,
        status: 'teslim',
      })

      expect(graph.customer).toBeDefined()
      expect(graph.serviceOrder).toBeDefined()
      expect(graph.part).toBeDefined()
      expect(graph.partUsed).toBeDefined()
      expect(graph.transaction).toBeDefined()

      // Tablo oluşturma sırası kontrolü
      expect(createdTables).toContain('customers')
      expect(createdTables).toContain('service_orders')
      expect(createdTables).toContain('parts')
      expect(createdTables).toContain('service_parts_used')
      expect(createdTables).toContain('financial_transactions')
    })
  })

  describe('10. Stock Movement Factory', () => {
    it('stok hareket kaydı oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'mov-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { movement } = await createStockMovement(mockCtx, { part_id: 'p-1', movement_type: 'giris', quantity: 50 })
      expect(movement.movement_type).toBe('giris')
      expect(movement.quantity).toBe(50)
    })
  })

  describe('11. Payment Factory', () => {
    it('gelir finans işlemi oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'tx-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { transaction } = await createFinancialTransaction(mockCtx, { type: 'gelir', amount: 1500 })
      expect(transaction.type).toBe('gelir')
      expect(transaction.amount).toBe(1500)
    })

    it('0 veya negatif tutarda finans işlemi engellenir', async () => {
      const mockCtx = { client: {} as never, tenantId: 'tenant-001' }
      await expect(createFinancialTransaction(mockCtx, { amount: -50 })).rejects.toThrow('0 veya negatif olamaz')
    })
  })

  describe('12. Warranty & Warranty Claims Factory', () => {
    it('garanti kaydı oluşturur', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'war-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { warranty } = await createWarranty(mockCtx, { warranty_months: 6, status: 'aktif' })
      expect(warranty.id).toBe('war-1')
      expect(warranty.warranty_months).toBe(6)
      expect(warranty.status).toBe('aktif')
      expect(warranty.qr_token).toBeUndefined() // QR token schema default
    })

    it('garanti talebi (claim) oluşturur ve warranty_id yi bağlar', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown) => ({
              select: () => ({
                single: async () => ({ data: { id: 'claim-1', ...(data as object) }, error: null }),
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const { claim } = await createWarrantyClaim(mockCtx, {
        warranty_id: 'war-1',
        issue_description: 'Ekran dokunmatiği tekrar basmıyor',
      })

      expect(claim.id).toBe('claim-1')
      expect(claim.warranty_id).toBe('war-1')
      expect(claim.status).toBe('open')
    })

    it('createWarranties batch insert ile toplu garanti üretir', async () => {
      const mockCtx = {
        client: {
          from: () => ({
            insert: (data: unknown[]) => ({
              select: async () => ({
                data: data.map((item, idx) => ({ id: `war-${idx}`, ...(item as object) })),
                error: null,
              }),
            }),
          }),
        } as never,
        tenantId: 'tenant-001',
      }

      const warranties = await createWarranties(mockCtx, 3)
      expect(warranties.length).toBe(3)
    })
  })
})

