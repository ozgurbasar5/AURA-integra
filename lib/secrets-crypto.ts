import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto'

const ENC_PREFIX = 'enc:v1:'

export class EncryptionKeyMissingError extends Error {
  constructor() {
    super('ENCRYPTION_KEY_MISSING')
    this.name = 'EncryptionKeyMissingError'
  }
}

function deriveKey(): Buffer | null {
  const secret = process.env.APP_ENCRYPTION_KEY
  if (!secret || secret.length < 16) return null
  return scryptSync(secret, 'aura-integra-v1', 32)
}

export function isEncryptionKeyConfigured(): boolean {
  return deriveKey() !== null
}

/** Reversible encryption for API secrets (Netgsm password etc.) */
export function encryptSecret(plain: string): string {
  if (!plain) return plain
  const key = deriveKey()
  if (!key) throw new EncryptionKeyMissingError()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENC_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
}

export function decryptSecret(stored: string): string {
  if (!stored) return stored
  if (!stored.startsWith(ENC_PREFIX)) return stored
  const key = deriveKey()
  if (!key) return ''
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const data = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENC_PREFIX)
}

/** One-way hash for tenant API keys (lookup by hash) */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}
