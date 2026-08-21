/**
 * AURA İntegra — Scenario Context Helper
 *
 * Senaryolar için izole tenant, şube, hesaplar, teknisyen, müşteri ve parça ortamı hazırlar.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  setupTestEnvironment,
  type FactoryContext,
  type Created,
} from '../../factories/base.factory'
import { createCustomer } from '../../factories/customer.factory'
import { createPart } from '../../factories/part.factory'
import { createTechnician } from '../../factories/technician.factory'

export interface ScenarioContext {
  client: SupabaseClient
  ctx: FactoryContext
  tenant: Created<Record<string, unknown>>
  branch: Created<Record<string, unknown>>
  accounts: Created<Record<string, unknown>>[]
  technician: Created<Record<string, unknown>>
  customer: Created<Record<string, unknown>>
  part: Created<Record<string, unknown>>
}

/**
 * Tek bir senaryo için tam izole veri tabanı bağlamı oluşturur.
 */
export async function setupScenarioContext(
  client: SupabaseClient,
  tenantName = 'Senaryo Test Bayisi'
): Promise<ScenarioContext> {
  const env = await setupTestEnvironment(client, { company_name: tenantName })
  const { technician } = await createTechnician(env.ctx, { full_name: 'Usta Ahmet' })
  const { customer } = await createCustomer(env.ctx, { full_name: 'Müşteri Mehmet' })
  const { part } = await createPart(env.ctx, { name: 'Orijinal OLED Ekran', stock_qty: 20, sale_price: 1500, purchase_price: 900 })

  return {
    client,
    ctx: env.ctx,
    tenant: env.tenant,
    branch: env.branch,
    accounts: env.accounts,
    technician,
    customer,
    part,
  }
}
