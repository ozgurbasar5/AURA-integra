import { encryptSecret, decryptSecret } from './secrets-crypto'

const PII_PREFIX = 'pii:v1:'

function piiKeyAvailable(): boolean {
  return Boolean(process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.length >= 16)
}

/** Encrypt phone/VKN for DB storage (app-layer; phone_enc column optional) */
export function encryptPii(value: string | undefined | null): string | null {
  if (!value) return null
  if (!piiKeyAvailable()) return value
  return `${PII_PREFIX}${encryptSecret(value).replace(/^enc:v1:/, '')}`
}

export function decryptPii(stored: string | undefined | null): string {
  if (!stored) return ''
  if (stored.startsWith(PII_PREFIX)) {
    return decryptSecret(`enc:v1:${stored.slice(PII_PREFIX.length)}`)
  }
  return stored
}

/** Mask for display (e.g. 532***4567) */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return '***'
  return `${digits.slice(0, 3)}***${digits.slice(-4)}`
}

export function maskVkn(vkn: string): string {
  if (vkn.length < 4) return '****'
  return `${vkn.slice(0, 2)}****${vkn.slice(-2)}`
}
