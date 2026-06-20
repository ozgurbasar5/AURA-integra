/**
 * TCMB günlük döviz kurları — today.xml (1 saat cache)
 */

export type FxRate = {
  code: 'USD' | 'EUR' | 'GBP'
  name: string
  buying: number
  selling: number
  updatedAt: string
}

export type FxRatesPayload = {
  source: 'tcmb'
  date: string
  rates: FxRate[]
  fetchedAt: string
}

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
const CACHE_TTL_MS = 60 * 60 * 1000

let cache: { payload: FxRatesPayload; expiresAt: number } | null = null

function extractCurrencyBlock(xml: string, code: string): string | null {
  const re = new RegExp(`<Currency[^>]*Kod="${code}"[^>]*>([\\s\\S]*?)</Currency>`, 'i')
  return xml.match(re)?.[1] ?? null
}

function parseRate(block: string, code: string, name: string): FxRate | null {
  const attr = (key: string) => block.match(new RegExp(`${key}="([^"]+)"`, 'i'))?.[1] ?? '0'
  const buying = parseFloat(attr('BanknoteBuying') || attr('ForexBuying'))
  const selling = parseFloat(attr('BanknoteSelling') || attr('ForexSelling'))
  if (!buying || !selling) return null
  return {
    code: code as FxRate['code'],
    name,
    buying,
    selling,
    updatedAt: new Date().toISOString(),
  }
}

function parseTcmbXml(xml: string): FxRatesPayload {
  const dateAttr =
    xml.match(/<Tarih_Date[^>]*Tarih="([^"]+)"/i)?.[1] ||
    new Date().toLocaleDateString('tr-TR')
  const codes: Array<[string, string]> = [
    ['USD', 'ABD Doları'],
    ['EUR', 'Euro'],
    ['GBP', 'İngiliz Sterlini'],
  ]

  const rates: FxRate[] = []
  for (const [code, name] of codes) {
    const block = extractCurrencyBlock(xml, code)
    if (!block) continue
    const rate = parseRate(block, code, name)
    if (rate) rates.push(rate)
  }

  if (rates.length === 0) {
    throw new Error('TCMB XML parse edilemedi')
  }

  return {
    source: 'tcmb',
    date: dateAttr,
    rates,
    fetchedAt: new Date().toISOString(),
  }
}

export async function fetchTcmbFxRates(force = false): Promise<FxRatesPayload> {
  if (!force && cache && cache.expiresAt > Date.now()) {
    return cache.payload
  }

  const res = await fetch(TCMB_URL, {
    next: { revalidate: 3600 },
    headers: { Accept: 'application/xml,text/xml' },
  })

  if (!res.ok) {
    throw new Error(`TCMB yanıt hatası: ${res.status}`)
  }

  const xml = await res.text()
  const payload = parseTcmbXml(xml)
  cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS }
  return payload
}

export function convertTryToForeign(amountTry: number, sellingRate: number): number {
  if (!sellingRate) return 0
  return amountTry / sellingRate
}
