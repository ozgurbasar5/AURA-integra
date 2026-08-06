/**
 * Mobil Termal Fiş Yazıcı (ESC/POS) Şablon Oluşturucu
 * 58mm ve 80mm Termal Bluetooth Yazıcılar için formatlama yardımcısı
 */

export type ServiceReceiptData = {
  receiptNo: string
  customerName: string
  customerPhone: string
  deviceModel: string
  serialOrImei?: string
  problemDescription: string
  estimatedFee?: number
  receivedDate: string
  tenantName: string
  tenantPhone: string
}

/** 58mm (32 karakter genişlik) Fiş Metni Üretici */
export function generateThermalReceiptText(data: ServiceReceiptData): string {
  const line = '-'.repeat(32)
  const dline = '='.repeat(32)

  return `
${dline}
  ${data.tenantName.substring(0, 28).toUpperCase()}
  TEKNIK SERVIS FIŞI
${dline}

Fiş No    : ${data.receiptNo}
Tarih     : ${data.receivedDate}

Müşteri   : ${data.customerName}
Telefon   : ${data.customerPhone}
${line}
Cihaz     : ${data.deviceModel}
IMEI/Seri : ${data.serialOrImei || 'Yok'}
Semptom   : ${data.problemDescription.substring(0, 28)}
${line}
Tahm.Tutar: ${data.estimatedFee ? `${data.estimatedFee} TL` : 'Belirlenmedi'}

${line}
Cihazınızı teslim alırken bu
fişi ibraz etmeniz gereklidir.
İletişim: ${data.tenantPhone}
${dline}
  `.trim()
}

/** Web / React Native Print İletişim Simülatörü */
export async function printToThermalPrinter(data: ServiceReceiptData): Promise<{ success: boolean; message: string }> {
  const receiptText = generateThermalReceiptText(data)

  // Bluetooth termal çıktı konsol/simülasyon günlüğü
  console.log('[THERMAL PRINTER ESC/POS COMMANDS]:\n', receiptText)

  return {
    success: true,
    message: 'Termal fiş Bluetooth yazıcıya başarıyla gönderildi.',
  }
}
