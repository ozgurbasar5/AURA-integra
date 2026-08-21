/**
 * AURA İntegra — Gerçekçi Türkçe Test Verileri
 *
 * Factory'ler tarafından kullanılan, gerçekçi ama uydurma Türkçe veri sözlüğü.
 * Production verisi veya gerçek kişilere ait veri KULLANILMAZ.
 *
 * Collision-free unique üreticiler ve opsiyonel deterministic seed desteği içerir.
 */

// ─── Deterministic PRNG & Counter State ─────────────────────────────────────

let sequenceCounter = 1000

/** Benchmark / deterministic testler için sayacı sıfırlar */
export function resetSequenceCounter(seed = 1000) {
  sequenceCounter = seed
}

function nextSeq(): number {
  return ++sequenceCounter
}

// ─── İsim Havuzu ────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'İbrahim', 'Emre', 'Burak',
  'Murat', 'Cem', 'Oğuz', 'Kaan', 'Berk', 'Tolga', 'Onur', 'Serkan',
  'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Selin', 'Deniz', 'Gül',
  'Esra', 'Hande', 'İrem', 'Cansu', 'Defne', 'Nur', 'Buse', 'Seda',
]

const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım',
  'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin',
  'Koç', 'Kurt', 'Özdemir', 'Güneş', 'Taş', 'Erdoğan', 'Polat', 'Aktaş',
  'Korkmaz', 'Aksoy', 'Bozkurt', 'Karaca', 'Uçar', 'Tuncer', 'Güler',
]

// ─── Şehirler ───────────────────────────────────────────────────────────────

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
  'Gaziantep', 'Kayseri', 'Mersin', 'Eskişehir', 'Diyarbakır', 'Samsun',
  'Denizli', 'Trabzon', 'Sakarya', 'Kocaeli', 'Malatya', 'Manisa', 'Balıkesir',
]

const DISTRICTS: Record<string, string[]> = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Şişli', 'Bakırköy', 'Ataşehir', 'Maltepe', 'Kartal'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut'],
  'İzmir': ['Konak', 'Bornova', 'Karşıyaka', 'Buca', 'Alsancak'],
}

// ─── Cihaz Verileri ─────────────────────────────────────────────────────────

const DEVICE_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Roborock',
  'Dyson', '70mai', 'Realme', 'OnePlus', 'Vivo', 'Nothing',
]

const DEVICE_MODELS: Record<string, string[]> = {
  'Apple': ['iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro Max', 'iPhone 13', 'iPhone 12', 'iPad Air', 'iPad Pro 12.9', 'MacBook Air M2'],
  'Samsung': ['Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy A54', 'Galaxy Z Fold5', 'Galaxy Tab S9', 'Galaxy A34'],
  'Xiaomi': ['Redmi Note 13 Pro', 'Xiaomi 14 Ultra', 'Poco X6 Pro', 'Xiaomi Robot Vacuum X10+', 'Mi TV Stick'],
  'Huawei': ['P60 Pro', 'Mate 60', 'Nova 12', 'MatePad 11'],
  'Oppo': ['Reno 11', 'Find X7', 'A79'],
  'Roborock': ['S8 Pro Ultra', 'Q Revo', 'S7 MaxV', 'Dyad Pro'],
  'Dyson': ['V15 Detect', 'V12 Slim', 'Purifier Cool', 'Airwrap'],
  '70mai': ['Dash Cam 4K A810', 'Dash Cam Omni', 'A500S'],
  'Realme': ['GT5 Pro', '12 Pro+', 'C67'],
  'OnePlus': ['12', 'Nord 3', 'Open'],
  'Vivo': ['X100 Pro', 'V30', 'Y36'],
  'Nothing': ['Phone (2)', 'Phone (1)', 'Ear (2)'],
}

const DEVICE_COLORS = [
  'Siyah', 'Beyaz', 'Gümüş', 'Altın', 'Mavi', 'Kırmızı',
  'Mor', 'Yeşil', 'Gri', 'Pembe', 'Titanium', 'Lacivert',
]

// ─── Arıza Tanımları ────────────────────────────────────────────────────────

const FAULT_DESCRIPTIONS = [
  'Şarj olmuyor', 'Ekran kırık', 'Batarya zayıf', 'Wi-Fi bağlantısı yok',
  'Motor çalışmıyor', 'Kamera görüntü vermiyor', 'Hoparlör sesi yok',
  'Açılıp kapanıyor', 'Dokunmatik çalışmıyor', 'Şarj soketi bozuk',
  'Mikrofon çalışmıyor', 'Face ID çalışmıyor', 'Parmak izi okumuyor',
  'Ekran titriyor', 'Aşırı ısınıyor', 'Yazılım hatası',
  'SIM kart tanımıyor', 'GPS çalışmıyor', 'Bluetooth bağlanmıyor',
  'Su hasarı', 'Arka cam kırık', 'Tuş takımı arızası',
  'Sensör arızası', 'Fırça dönmüyor', 'Süpürme gücü düşük',
]

// ─── Parça (Parts) Verileri ─────────────────────────────────────────────────

const PART_CATEGORIES = [
  'Ekran', 'Batarya', 'Şarj Soketi', 'Kamera', 'Hoparlör',
  'Anakart', 'Kasa', 'Tuş Takımı', 'Sensör', 'Kablo',
  'Motor', 'Fırça', 'Filtre', 'Aksesuar', 'Adaptör',
]

const PART_NAMES: Record<string, string[]> = {
  'Ekran': ['LCD Ekran Modülü', 'OLED Ekran', 'Dokunmatik Cam', 'Ekran Flex Kablosu'],
  'Batarya': ['Orijinal Batarya', 'Yüksek Kapasiteli Batarya', 'Tablet Batarya'],
  'Şarj Soketi': ['Type-C Şarj Soketi', 'Lightning Şarj Modülü', 'Şarj IC'],
  'Kamera': ['Arka Kamera Modülü', 'Ön Kamera', 'Kamera Lens Camı'],
  'Hoparlör': ['Alt Hoparlör', 'Üst Hoparlör', 'Kulaklık Hoparlörü'],
  'Anakart': ['Ana Kart IC', 'Güç IC', 'WiFi IC'],
  'Kasa': ['Arka Kapak', 'Çerçeve', 'SIM Tepsisi'],
  'Motor': ['Süpürme Motoru', 'Fırça Motoru', 'Fan Motoru'],
  'Fırça': ['Ana Fırça', 'Yan Fırça Seti', 'Silikon Fırça'],
  'Filtre': ['HEPA Filtre', 'Ön Filtre', 'Su Filtresi'],
}

// ─── Finans Verileri ────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['nakit', 'kredi_karti', 'havale', 'veresiye'] as const

const EXPENSE_CATEGORIES = [
  'Kira', 'Elektrik', 'Su', 'İnternet', 'Personel Maaşı',
  'Yedek Parça Alımı', 'Kargo', 'Reklam', 'Sigorta', 'Vergi',
]

// ─── Tedarikçi Verileri ─────────────────────────────────────────────────────

const SUPPLIER_NAMES = [
  'Tekno Parça AŞ', 'İstanbul Yedek Parça', 'Akıllı Cihaz Tedarik',
  'ProParts Türkiye', 'MobilParts Ltd.', 'ElektroDepo', 'ParçaNet',
  'Robot Parça Merkezi', 'SmartFix Tedarik', 'Global Parts TR',
  'Dijital Komponent', 'TechSupply Ankara', 'ParçaPazarı',
]

// ─── Şirket İsimleri (Tenant) ──────────────────────────────────────────────

const COMPANY_NAME_PREFIXES = [
  'Tekno', 'Smart', 'Mobil', 'Akıllı', 'Pro', 'Fix', 'Hızlı',
  'Güven', 'Master', 'Premium', 'Expert', 'Plus', 'Mega', 'Star',
]

const COMPANY_NAME_SUFFIXES = [
  'Servis', 'Teknik', 'Bilişim', 'Teknoloji', 'Çözüm',
  'Onarım', 'Tamir', 'Cihaz', 'Elektronik', 'Sistem',
]

// ─── Helper Fonksiyonları ───────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min
  return Number(val.toFixed(decimals))
}

/** Guaranteed unique 05XX XXX XX XX formatında telefon */
function uniquePhone(): string {
  const seq = nextSeq()
  const suffix = seq.toString().padStart(7, '0').slice(-7)
  return `0532${suffix}`
}

/** Guaranteed unique e-posta (gerçek domain kullanmaz) */
function uniqueEmail(name: string): string {
  const seq = nextSeq()
  const clean = name
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/ü/g, 'u').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
  return `${clean}.${seq}@aura.test`
}

/** Rastgele adres */
function randomAddress(city?: string): string {
  const c = city ?? pick(CITIES)
  const districts = DISTRICTS[c] ?? ['Merkez']
  const district = pick(districts)
  const street = pick(['Atatürk', 'Cumhuriyet', 'İstiklal', 'Gazi', 'Fatih', 'Çarşı', 'Yeni', 'Park'])
  const cadde = pick(['Caddesi', 'Sokak', 'Bulvarı'])
  return `${street} ${cadde} No:${randomInt(1, 200)}, ${district} / ${c}`
}

/** Guaranteed unique 15-digit IMEI */
function uniqueImei(): string {
  const seq = nextSeq()
  const suffix = seq.toString().padStart(13, '0').slice(-13)
  return `35${suffix}`
}

/** Guaranteed unique EAN-13 barcode */
function uniqueBarcode(): string {
  const seq = nextSeq()
  const suffix = seq.toString().padStart(10, '0').slice(-10)
  return `869${suffix}`
}

/** Guaranteed unique 10-digit VKN */
function uniqueVkn(): string {
  const seq = nextSeq()
  return seq.toString().padStart(10, '1').slice(-10)
}

/** Guaranteed unique SKU code */
function uniqueSku(prefix = 'SKU'): string {
  const seq = nextSeq()
  return `${prefix}-${seq}`
}

/** Guaranteed unique order_no */
function uniqueOrderNo(prefix = 'SRV'): string {
  const seq = nextSeq()
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${seq}`
}

/** Rastgele tarih (son N ay içinde) */
function randomDateWithinMonths(months: number): string {
  const now = new Date()
  const start = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000)
  const diff = now.getTime() - start.getTime()
  const randomDate = new Date(start.getTime() + Math.random() * diff)
  return randomDate.toISOString()
}

// ─── Dışa Aktarılan API ────────────────────────────────────────────────────

export const RealisticData = {
  // Reset
  resetSequenceCounter,

  // İsimler
  fullName: () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
  firstName: () => pick(FIRST_NAMES),
  lastName: () => pick(LAST_NAMES),

  // İletişim (Collision-free)
  phone: uniquePhone,
  email: uniqueEmail,
  address: randomAddress,
  city: () => pick(CITIES),
  vkn: uniqueVkn,

  // Cihaz (Collision-free identifiers)
  deviceBrand: () => pick(DEVICE_BRANDS),
  deviceModel: (brand?: string) => {
    const b = brand ?? pick(DEVICE_BRANDS)
    const models = DEVICE_MODELS[b] ?? ['Genel Model']
    return pick(models)
  },
  deviceColor: () => pick(DEVICE_COLORS),
  imei: uniqueImei,
  serialNo: () => `SN${nextSeq()}`,
  faultDescription: () => pick(FAULT_DESCRIPTIONS),
  orderNo: uniqueOrderNo,

  // Parça
  partCategory: () => pick(PART_CATEGORIES),
  partName: (category?: string) => {
    const cat = category ?? pick(PART_CATEGORIES)
    const names = PART_NAMES[cat] ?? [`${cat} Parça`]
    return pick(names)
  },
  barcode: uniqueBarcode,
  sku: uniqueSku,
  compatibleBrands: () => pickN(DEVICE_BRANDS, randomInt(1, 4)),

  // Finans
  paymentMethod: () => pick(PAYMENT_METHODS),
  expenseCategory: () => pick(EXPENSE_CATEGORIES),
  serviceFee: () => randomDecimal(200, 5000),
  partPrice: () => randomDecimal(50, 2000),
  partSalePrice: () => randomDecimal(100, 3000),

  // Tedarikçi
  supplierName: () => pick(SUPPLIER_NAMES),

  // Şirket (Tenant)
  companyName: () => `${pick(COMPANY_NAME_PREFIXES)} ${pick(COMPANY_NAME_SUFFIXES)}`,
  shopName: () => {
    const name = `${pick(COMPANY_NAME_PREFIXES)}${pick(COMPANY_NAME_SUFFIXES)}-${nextSeq()}`
    return name.toLowerCase().replace(/\s+/g, '-')
  },

  // Tarih
  recentDate: () => randomDateWithinMonths(3),
  dateWithinMonths: randomDateWithinMonths,

  // Sayısal
  randomInt,
  randomDecimal,

  // Utility
  pick,
  pickN,
} as const
