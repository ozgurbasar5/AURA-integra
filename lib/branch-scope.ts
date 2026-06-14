/**
 * Şube kapsamı — ileri faz için filtre yardımcıları
 */
import { getActiveBranchId } from './store'

export function getScopedBranchId(): string | null {
  return getActiveBranchId()
}

/** Kayıt branch_id taşıyorsa aktif şubeye göre filtreler; yoksa tümünü döner */
export function filterByActiveBranch<T extends { branch_id?: string | null }>(items: T[]): T[] {
  const branchId = getActiveBranchId()
  if (!branchId) return items
  return items.filter(i => !i.branch_id || i.branch_id === branchId)
}
