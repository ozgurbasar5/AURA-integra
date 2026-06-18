/**
 * Cloudflare Turnstile doğrulama — secret yoksa development'ta geçer
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true
  }
  if (!token?.trim()) return false

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const json = await res.json() as { success?: boolean }
    return json.success === true
  } catch {
    return false
  }
}
