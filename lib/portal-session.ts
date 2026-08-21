import { createHmac, timingSafeEqual } from 'crypto'

export type PortalSessionPayload = {
  tenantId: string
  customerPhone: string
  customerName?: string
  orderId?: string
  exp: number // unix timestamp in seconds
  iat: number // unix timestamp in seconds
}

const SESSION_TTL_SECONDS = 24 * 60 * 60 // 24 hours

function getSessionSecret(): string {
  return process.env.APP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'aura-portal-session-default-secret-min32chars'
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed portal session token.
 */
export function createPortalSessionToken(data: {
  tenantId: string
  customerPhone: string
  customerName?: string
  orderId?: string
  ttlSeconds?: number
}): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (data.ttlSeconds ?? SESSION_TTL_SECONDS)

  const payload: PortalSessionPayload = {
    tenantId: data.tenantId,
    customerPhone: data.customerPhone.replace(/\D/g, '').slice(-10),
    customerName: data.customerName,
    orderId: data.orderId,
    iat: now,
    exp,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url')

  return `${payloadB64}.${sig}`
}

/**
 * Verifies the token signature, expiration, and tenant binding.
 */
export function verifyPortalSessionToken(
  token: string | undefined | null,
  expectedTenantId: string,
): { ok: boolean; payload?: PortalSessionPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Oturum tokenı eksik' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { ok: false, error: 'Geçersiz token biçimi' }
  }

  const [payloadB64, sig] = parts

  // 1. Verify signature
  const expectedSig = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expSigBuf = Buffer.from(expectedSig)

  if (sigBuf.length !== expSigBuf.length || !timingSafeEqual(sigBuf, expSigBuf)) {
    return { ok: false, error: 'İmza doğrulanamadı (sahte token)' }
  }

  // 2. Decode payload
  let payload: PortalSessionPayload
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, error: 'Token okunamadı' }
  }

  // 3. Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    return { ok: false, error: 'Oturum süresi dolmuş' }
  }

  // 4. Verify tenant isolation
  if (payload.tenantId !== expectedTenantId) {
    return { ok: false, error: 'Farklı bayi için oluşturulmuş token' }
  }

  return { ok: true, payload }
}
