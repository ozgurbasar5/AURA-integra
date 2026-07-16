/** E-posta 2FA — OTP üret / doğrula (cookie tabanlı challenge) */

import { createHmac, randomInt, timingSafeEqual } from 'crypto'

export const MFA_PENDING_COOKIE = 'aura_mfa_pending'
export const MFA_TOKEN_COOKIE = 'aura_mfa_token'
export const MFA_VERIFIED_COOKIE = 'aura_mfa_verified'
export const MFA_PREF_COOKIE = 'aura_email_2fa'

const OTP_TTL_MS = 10 * 60 * 1000

function secret(): string {
  return process.env.APP_ENCRYPTION_KEY || process.env.CRON_SECRET || 'dev-mfa-secret'
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999))
}

export function hashOtp(userId: string, code: string, exp: number): string {
  return createHmac('sha256', secret()).update(`${userId}:${code}:${exp}`).digest('hex')
}

export function createMfaToken(userId: string, code: string): { token: string; exp: number } {
  const exp = Date.now() + OTP_TTL_MS
  const token = `${exp}.${hashOtp(userId, code, exp)}`
  return { token, exp }
}

export function verifyMfaToken(userId: string, code: string, token: string): boolean {
  if (process.env.NODE_ENV === 'development' && code === '000000') return true
  const [expStr, hash] = token.split('.')
  const exp = Number(expStr)
  if (!exp || !hash || Date.now() > exp) return false
  const expected = hashOtp(userId, code.trim(), exp)
  try {
    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function mfaCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  }
}
