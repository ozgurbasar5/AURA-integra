import type { BusinessBranding } from '@/lib/business-branding'

export type ServisWhatsappInput = {
  customer: string
  device: string
  tracking_code?: string
  status: string
  issue?: string
  price?: string | number
  serial_no?: string
  notes?: string
  partsLine?: string
  upsellsLine?: string
  warrantyLine?: string
}

const DEFAULT_BRAND: BusinessBranding = {
  shopName: 'AURA İntegra',
  shopPhone: '',
  shopAddress: '',
  shopLogo: null,
}

/** Atölye listesi + servis kartı için ortak WhatsApp metni (duruma göre) */
export function buildServisWhatsappMessage(
  i: ServisWhatsappInput,
  branding: BusinessBranding = DEFAULT_BRAND,
): string {
  const name = (i.customer || 'Müşteri').trim()
  const device = (i.device || 'Cihaz').trim()
  const code = (i.tracking_code || '-').trim()
  const st = (i.status || 'Bekliyor').trim()
  const shop = branding.shopName || DEFAULT_BRAND.shopName
  const phoneLine = branding.shopPhone ? `\n${String.fromCodePoint(0x1F4DE)} *Tel:* ${branding.shopPhone}` : ''
  const addressLine = branding.shopAddress ? `\n${String.fromCodePoint(0x1F4CD)} *Adres:* ${branding.shopAddress}` : ''

  const price =
    i.price != null && String(i.price).trim() !== ''
      ? `${Number(i.price).toLocaleString('tr-TR')} TL`
      : 'Henüz netleşmedi'

  const issueTrim = (i.issue || '').trim()
  const issueBlock = issueTrim
    ? `\n${String.fromCodePoint(0x1F4CB)} *Bildirilen sorun:*\n_${issueTrim}_\n`
    : ''

  const intro =
    `Sayın *${name}*,\n\n` +
    `*${shop}* teknik servis kaydınız güncellendi.\n\n` +
    `${String.fromCodePoint(0x1F4E6)} *Cihaz:* ${device}\n` +
    `${String.fromCodePoint(0x1F4C4)} *Takip no:* ${code}\n` +
    (i.serial_no ? `${String.fromCodePoint(0x1F522)} *Seri / IMEI:* ${i.serial_no}\n` : '') +
    `${String.fromCodePoint(0x1F4CA)} *Güncel durum:* *${st}*\n` +
    `${String.fromCodePoint(0x1F4B0)} *Tutar bilgisi:* ${price}\n` +
    issueBlock

  let body = ''

  switch (st) {
    case 'Teslim Edildi':
      body =
        `Cihazınızın servis süreci *tamamlanmış* ve teslim edilmiştir.\n\n` +
        (i.partsLine ? `${String.fromCodePoint(0x1F527)} *Parça / işlem:*\n${i.partsLine}\n\n` : '') +
        (i.notes ? `${String.fromCodePoint(0x1F4DD)} *Servis notu:*\n${i.notes}\n\n` : '') +
        (i.warrantyLine ? `${i.warrantyLine}\n\n` : '') +
        `Cihazınızı servisimizden teslim alabilir veya durum hakkında bize yazabilirsiniz.\n`
      break
    case 'Teslime Hazır':
    case 'Hazır':
      body =
        `Onarım tamamlandı; cihazınız *teslime hazır*.\n\n` +
        (i.notes ? `${String.fromCodePoint(0x1F4DD)} *Not:* ${i.notes}\n\n` : '') +
        `Teslim için bize yazabilirsiniz.\n`
      break
    case 'Tamirde':
    case 'İşlemde':
      body = `Cihazınız *tamirhanede işlem görüyor*. İlerleme oldukça bilgilendireceğiz.\n`
      break
    case 'Onay Bekliyor':
      body = `İşlem için *fiyat / onay* gerekmektedir. Lütfen servisimizle iletişime geçin.\n`
      break
    case 'Bekliyor':
    default:
      body = `Cihazınız *kabul edildi* ve servis sırasına alındı.\n`
      break
  }

  const footer =
    `\n— *${shop}* —${phoneLine}${addressLine}\n` +
    `Bu mesaj otomatik oluşturulmuştur.`

  return (intro + body + footer).trim()
}
