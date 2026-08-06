import type { StoreServiceOrder } from './store'

export interface ReceiptData {
  type: 'kabul' | 'teslim' | 'odeme'
  order?: StoreServiceOrder
  shopName: string
  shopPhone: string
  shopAddress: string
  amount?: number
  items?: { name: string; qty: number; price: number }[]
  date?: string
}

/**
 * ESC/POS Byte Array Oluşturucu (Ham Termal Makbuz)
 * Bu MVP için basitleştirilmiştir. Gerçek ESC/POS çok daha detaylıdır.
 */
export function buildReceiptEscPos(data: ReceiptData): Uint8Array {
  // ESC/POS Command'leri
  const INIT = [0x1B, 0x40]
  const ALIGN_CENTER = [0x1B, 0x61, 0x01]
  const ALIGN_LEFT = [0x1B, 0x61, 0x00]
  const BOLD_ON = [0x1B, 0x45, 0x01]
  const BOLD_OFF = [0x1B, 0x45, 0x00]
  const DOUBLE_HEIGHT = [0x1B, 0x21, 0x10]
  const NORMAL_TEXT = [0x1B, 0x21, 0x00]
  const CUT = [0x1D, 0x56, 0x41, 0x10]
  const LF = [0x0A]

  const encoder = new TextEncoder() // UTF-8 (ESC/POS için genelde PC857 vs gerekir, MVP'de UTF-8 ASCII kullanıyoruz)

  let buffer: number[] = []
  const add = (cmd: number[] | string) => {
    if (typeof cmd === 'string') {
      // Basit Türkçe karakter değişimi (Gerçekte codepage ayarı gerekir)
      const ascii = cmd.replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                       .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                       .replace(/ş/g, 's').replace(/Ş/g, 'S')
                       .replace(/ı/g, 'i').replace(/İ/g, 'I')
                       .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                       .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      buffer.push(...Array.from(encoder.encode(ascii)))
    } else {
      buffer.push(...cmd)
    }
  }

  add(INIT)
  add(ALIGN_CENTER)
  add(BOLD_ON)
  add(DOUBLE_HEIGHT)
  add(data.shopName + '\n')
  add(NORMAL_TEXT)
  add(BOLD_OFF)
  add(data.shopPhone + '\n')
  add(data.shopAddress + '\n')
  add('--------------------------------\n')
  
  if (data.type === 'kabul' && data.order) {
    add(BOLD_ON)
    add('SERVIS KABUL FISI\n')
    add(BOLD_OFF)
    add('--------------------------------\n')
    add(ALIGN_LEFT)
    add(`Servis No : ${data.order.job_no}\n`)
    add(`Musteri   : ${data.order.customer_name}\n`)
    add(`Telefon   : ${data.order.customer_phone}\n`)
    add(`Cihaz     : ${data.order.device_brand} ${data.order.device_model}\n`)
    if (data.order.imei) {
      add(`IMEI      : ${data.order.imei}\n`)
    }
    add('--------------------------------\n')
    add(`Ariza: ${data.order.description}\n`)
  }

  add(ALIGN_CENTER)
  add('--------------------------------\n')
  add(`Tarih: ${data.date || new Date().toLocaleString('tr-TR')}\n`)
  add('Bizi tercih ettiginiz icin tesekkurler!\n')
  
  add(LF)
  add(LF)
  add(LF)
  add(CUT)

  return new Uint8Array(buffer)
}

/**
 * ZPL Etiket Oluşturucu (Zebra/Argox vb. barkod yazıcıları için)
 */
export function buildDeviceLabelZpl(order: StoreServiceOrder): string {
  // 50x25mm tipik cihaz etiketi ZPL örneği
  return `
^XA
^PW400
^LL200
^FO20,20^A0N,25,25^FD${order.job_no}^FS
^FO20,55^A0N,20,20^FD${order.device_brand} ${order.device_model}^FS
^FO20,80^A0N,20,20^FD${order.customer_name}^FS
^FO20,105^A0N,20,20^FD${order.customer_phone}^FS
^FO20,130^BCN,40,N,N,N^FD${order.job_no}^FS
^XZ
  `.trim()
}

/**
 * IP üzerinden ağ yazıcısına ham veri gönderir (Client-side çalışmaz, API üzerinden proxy gerekir)
 */
export async function printToNetworkPrinter(ip: string, port: number, data: Uint8Array): Promise<void> {
  throw new Error('Ağ yazıcılarına doğrudan tarayıcıdan bağlanılamaz. API Proxy veya Local Agent gerektirir.')
}

/**
 * Web Bluetooth API ile Bluetooth yazıcıya bağlanır (Mobil/Chrome destekler)
 */
export async function printBluetooth(data: Uint8Array): Promise<void> {
  const nav = navigator as any
  if (!nav.bluetooth) {
    throw new Error('Tarayıcınız Bluetooth API desteklemiyor (Chrome/Edge kullanın).')
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Tipik ESC/POS printer service UUID
      optionalServices: ['0000e7810-0000-1000-8000-00805f9b34fb']
    })

    const server = await device.gatt?.connect()
    if (!server) throw new Error('Cihaza bağlanılamadı')

    // Gerçek implementasyonda doğru service ve characteristic bulunup yazılır
    // Örnek: const service = await server.getPrimaryService('...')
    // const characteristic = await service.getCharacteristic('...')
    // await characteristic.writeValue(data)
    
    // MVP Fake success
    console.log('Bluetooth ile yazdırıldı (Mock)', device.name)
    
  } catch (error: any) {
    throw new Error(error.message || 'Yazdırma iptal edildi veya başarısız')
  }
}
