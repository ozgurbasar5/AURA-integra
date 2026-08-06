/**
 * PostgREST sorgularında tenant_id filtresini ilk sıraya koymak için yardımcılar.
 */

export function tenantQuery<T>(qb: T, tenantId: string): T {
  return (qb as { eq: (column: string, value: string) => T }).eq('tenant_id', tenantId)
}

export function sinceQuery<T>(qb: T, since: string | null | undefined, column = 'updated_at'): T {
  if (!since) return qb
  return (qb as { gte: (col: string, val: string) => T }).gte(column, since)
}
