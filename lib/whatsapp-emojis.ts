/** WhatsApp mesajlarında UTF-8 emoji (dosya encoding sorunlarından bağımsız) */
export const WA = {
  phone: String.fromCodePoint(0x1f4de),
  pin: String.fromCodePoint(0x1f4cd),
  package: String.fromCodePoint(0x1f4e6),
  page: String.fromCodePoint(0x1f4c4),
  hash: String.fromCodePoint(0x1f522),
  chart: String.fromCodePoint(0x1f4ca),
  money: String.fromCodePoint(0x1f4b0),
  clipboard: String.fromCodePoint(0x1f4cb),
  wrench: String.fromCodePoint(0x1f527),
  memo: String.fromCodePoint(0x1f4dd),
  check: String.fromCodePoint(0x2705),
  link: String.fromCodePoint(0x1f517),
  wave: String.fromCodePoint(0x1f44b),
} as const
