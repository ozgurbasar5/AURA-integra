/**
 * POS — Supabase sales API ↔ localStorage cache
 */

import { completeSaleViaApi, type CartItem, type Sale } from './store'

export async function completePosSaleViaApi(
  items: CartItem[],
  customerName: string,
  paymentMethod: string,
  vatRate = 20,
): Promise<Sale> {
  return completeSaleViaApi(items, customerName, paymentMethod, vatRate)
}

export { completeSaleViaApi }
