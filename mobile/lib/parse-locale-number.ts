export function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim()
  if (!trimmed) return NaN
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}
