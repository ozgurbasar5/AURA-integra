export const QC_CHECKLIST = [
  'Ekran testi yapıldı',
  'Dokunmatik testi yapıldı',
  'Kamera ön/arka test',
  'Hoparlör ve mikrofon test',
  'Şarj ve batarya test',
  'Wi-Fi / Bluetooth test',
  'IMEI ve SIM okuma test',
  'Kasa/conta kontrolü',
]

export function isQcComplete(finalChecks?: string[]): boolean {
  if (!finalChecks?.length) return false
  return QC_CHECKLIST.every(item => finalChecks.includes(item))
}

export function qcProgress(finalChecks?: string[]) {
  const done = QC_CHECKLIST.filter(c => finalChecks?.includes(c)).length
  return { done, total: QC_CHECKLIST.length, passed: done === QC_CHECKLIST.length }
}

export function evaluateQc(finalChecks?: string[]) {
  const missing = QC_CHECKLIST.filter(c => !finalChecks?.includes(c))
  const done = QC_CHECKLIST.length - missing.length
  return {
    passed: missing.length === 0,
    done,
    total: QC_CHECKLIST.length,
    missing,
  }
}
