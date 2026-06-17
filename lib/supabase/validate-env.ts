/** JWT içindeki proje ref ile URL eşleşmesini kontrol eder */
export function projectRefFromJwt(jwt: string | undefined | null): string | null {
  if (!jwt) return null
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')) as {
      ref?: string
    }
    return payload.ref ?? null
  } catch {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1])) as { ref?: string }
      return payload.ref ?? null
    } catch {
      return null
    }
  }
}

export function projectRefFromUrl(url: string | undefined | null): string | null {
  if (!url) return null
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)
  return m?.[1] ?? null
}

export type EnvCheck = {
  ok: boolean
  urlRef: string | null
  anonRef: string | null
  serviceRef: string | null
  message: string
}

export function checkSupabaseEnv(): EnvCheck {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const urlRef = projectRefFromUrl(url)
  const anonRef = projectRefFromJwt(anon)
  const serviceRef = projectRefFromJwt(service)

  if (!url || !anon) {
    return {
      ok: false,
      urlRef,
      anonRef,
      serviceRef,
      message: 'NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY zorunlu. Lokal: .env.local | Vercel: Environment Variables + Redeploy.',
    }
  }

  if (urlRef && anonRef && urlRef !== anonRef) {
    return {
      ok: false,
      urlRef,
      anonRef,
      serviceRef,
      message:
        `Proje uyuşmazlığı! URL projesi: ${urlRef}, anon key projesi: ${anonRef}. ` +
        `Supabase → İNTEGRA → Settings → API bölümünden üçünü birlikte kopyalayın.`,
    }
  }

  if (service && serviceRef && urlRef && serviceRef !== urlRef) {
    return {
      ok: false,
      urlRef,
      anonRef,
      serviceRef,
      message:
        `Service role key farklı projeye ait (${serviceRef}). URL: ${urlRef}. İNTEGRA API anahtarlarını kullanın.`,
    }
  }

  if (!service) {
    return {
      ok: true,
      urlRef,
      anonRef,
      serviceRef,
      message: 'SUPABASE_SERVICE_ROLE_KEY eksik — admin bayi oluşturma çalışmayabilir.',
    }
  }

  return {
    ok: true,
    urlRef,
    anonRef,
    serviceRef,
    message: `Bağlantı yapılandırması OK (proje: ${urlRef ?? 'bilinmiyor'})`,
  }
}

/** İNTEGRA projesi — dashboard ref */
export const EXPECTED_PROJECT_REF = 'dipyrdidkvljojkyaqmd'
