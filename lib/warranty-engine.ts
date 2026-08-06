import { WarrantyRecord } from './store'
import { addDays, toDateString } from './subscription' // helper or similar

/**
 * Checks if a warranty is currently active based on its dates and status.
 */
export function isWarrantyActive(w: WarrantyRecord): boolean {
  if (w.status !== 'aktif') return false
  const now = new Date()
  const end = new Date(w.end_date)
  return end >= now
}

/**
 * Returns the number of days until the warranty expires.
 * Returns negative if expired.
 */
export function daysUntilExpiry(w: WarrantyRecord): number {
  const now = new Date()
  const end = new Date(w.end_date)
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Returns a list of standard exclusion reasons for warranties.
 */
export function getExclusionReasons(): string[] {
  return [
    'Sıvı teması',
    'Fiziksel hasar (kırık, ezik)',
    'Yetkisiz müdahale / parça değişimi',
    'Voltaj dalgalanması / Yanlış adaptör kullanımı',
    'Kozmetik yıpranma',
    'Seri numarası / IMEI silinmesi',
  ]
}

export interface ClaimEvaluation {
  isCovered: boolean
  resolution: 'ücretsiz_onarım' | 'ücretli'
  reason?: string
}

/**
 * Evaluates a warranty claim against the warranty record to check basic coverage.
 * This is an automated preliminary check.
 */
export function evaluateWarrantyClaim(w: WarrantyRecord, issue: string): ClaimEvaluation {
  if (!isWarrantyActive(w)) {
    return {
      isCovered: false,
      resolution: 'ücretli',
      reason: 'Garanti süresi dolmuş veya garanti aktif değil.',
    }
  }

  const issueLower = issue.toLowerCase()
  
  // Basit keyword tabanlı ret kontrolü
  const redFlags = ['suya düştü', 'kırıldı', 'düştü', 'ezildi', 'sıvı', 'başka servis']
  if (redFlags.some(flag => issueLower.includes(flag))) {
    return {
      isCovered: false,
      resolution: 'ücretli',
      reason: 'Belirtilen sorun müşteri hatası (kullanıcı kaynaklı) şüphesi taşıyor.',
    }
  }

  // Eğer garanti zaten ihlal edildiyse
  if (w.status === 'ihlal') {
    return {
      isCovered: false,
      resolution: 'ücretli',
      reason: 'Cihaz daha önce garanti dışı kalmış.',
    }
  }

  return {
    isCovered: true,
    resolution: 'ücretsiz_onarım',
  }
}

/**
 * Generates an HTML certificate for the warranty.
 */
export function buildWarrantyCertificateHtml(w: WarrantyRecord, shopName: string): string {
  const ex = w.exclusion_reasons?.length ? w.exclusion_reasons.join(', ') : 'Standart garanti şartları geçerlidir.'
  const parts = w.covered_parts?.length ? w.covered_parts.join(', ') : 'Tüm Donanım'
  
  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.6; }
          .cert-container { border: 2px solid #ddd; padding: 40px; margin: 20px; border-radius: 8px; }
          .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #16a34a; }
          .details { margin-bottom: 30px; }
          .details p { margin: 8px 0; }
          .footer { font-size: 12px; color: #666; text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          .qr { text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="header">
            <h2>${shopName}</h2>
            <div class="title">Garanti Sertifikası</div>
          </div>
          <div class="details">
            <p><strong>Müşteri:</strong> ${w.customer_name}</p>
            <p><strong>Cihaz:</strong> ${w.device_brand} ${w.device_model}</p>
            ${w.imei ? `<p><strong>IMEI/Seri No:</strong> ${w.imei}</p>` : ''}
            <p><strong>Garanti Süresi:</strong> ${w.warranty_months} Ay</p>
            <p><strong>Başlangıç:</strong> ${new Date(w.start_date).toLocaleDateString('tr-TR')}</p>
            <p><strong>Bitiş:</strong> ${new Date(w.end_date).toLocaleDateString('tr-TR')}</p>
            <p><strong>Kapsamdaki Parçalar:</strong> ${parts}</p>
          </div>
          <div>
            <h4>Kapsam Dışı Durumlar</h4>
            <p>${ex}</p>
          </div>
          ${w.qr_token ? `
          <div class="qr">
            <!-- QR code renderer will replace this on frontend if needed, or we just put link -->
            <p>Sorgulama Kodu: <strong>${w.qr_token}</strong></p>
          </div>
          ` : ''}
          <div class="footer">
            Bu belge elektronik olarak oluşturulmuştur. Cihaz onarımlarında ibrazı zorunludur.
          </div>
        </div>
      </body>
    </html>
  `
}
