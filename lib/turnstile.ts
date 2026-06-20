/**
 * Cloudflare Turnstile doğrulama — secret yoksa development'ta geçer
 */
export type TurnstileVerifyResult = {
  ok: boolean
  errorCodes?: string[]
}

export async function verifyTurnstileToken(
  token: string | undefined,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return { ok: false, errorCodes: ['missing-secret'] }
    return { ok: true }
  }
  if (!token?.trim()) return { ok: false, errorCodes: ['missing-token'] }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token.trim())

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const json = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (json.success === true) return { ok: true }

    const errorCodes = json['error-codes'] ?? ['unknown']
    console.error('[Turnstile] doğrulama başarısız:', errorCodes.join(', '))
    return { ok: false, errorCodes }
  } catch (err) {
    console.error('[Turnstile] siteverify hatası:', err)
    return { ok: false, errorCodes: ['network-error'] }
  }
}

export function turnstileErrorMessage(errorCodes?: string[]): string {
  if (!errorCodes?.length) return 'Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.'
  if (errorCodes.includes('missing-token')) {
    return 'Güvenlik doğrulamasını tamamlayın (CAPTCHA kutusunu işaretleyin).'
  }
  if (errorCodes.includes('timeout-or-duplicate')) {
    return 'Güvenlik doğrulamasının süresi doldu. Sayfayı yenileyip tekrar deneyin.'
  }
  if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-secret')) {
    return 'CAPTCHA yapılandırması hatalı (site key / secret key eşleşmiyor). Lütfen destek ile iletişime geçin.'
  }
  if (errorCodes.includes('invalid-input-response')) {
    return 'Güvenlik doğrulaması geçersiz. CAPTCHA\'yı tekrar tamamlayıp gönderin.'
  }
  return 'Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.'
}
