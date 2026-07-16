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

export function qcProgress(finalChecks?: string[]) {
  const done = QC_CHECKLIST.filter(c => finalChecks?.includes(c)).length
  return { done, total: QC_CHECKLIST.length }
}
