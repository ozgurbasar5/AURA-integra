/** @type {import('next').NextConfig} */

/** Vercel deploy: env yoksa build'i durdur (push sonrası boş DB bağlantısını önler) */
function assertVercelSupabaseEnv() {
  if (process.env.VERCEL !== '1') return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const bad =
    !url ||
    !anon ||
    url.includes('placeholder') ||
    url.includes('YOUR_PROJECT') ||
    anon.includes('placeholder') ||
    anon.includes('your-anon')

  if (bad) {
    throw new Error(
      '[AURA İntegra] Vercel Supabase env eksik veya placeholder. ' +
        'Vercel → Project → Settings → Environment Variables bölümüne ' +
        'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ve SUPABASE_SERVICE_ROLE_KEY ekleyin. ' +
        'Git push .env.local dosyasını taşımaz; her deploy öncesi Vercel env kontrol edin.'
    )
  }

  if (!service || service.includes('placeholder') || service.includes('your-service')) {
    throw new Error(
      '[AURA İntegra] SUPABASE_SERVICE_ROLE_KEY Vercel\'de eksik veya placeholder. ' +
        'Login ve bayi işlemleri çalışmaz. Vercel → Settings → Environment Variables.'
    )
  }

  const isVercelProd =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const encKey = process.env.APP_ENCRYPTION_KEY ?? ''
  if (isVercelProd && (!encKey || encKey.length < 32)) {
    console.warn(
      '[AURA İntegra] APP_ENCRYPTION_KEY eksik — build devam ediyor. ' +
        'Vercel → Environment Variables → APP_ENCRYPTION_KEY (min 32 karakter, örn. openssl rand -hex 32)'
    )
  }
}

assertVercelSupabaseEnv()

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    forceSwcTransforms: false,
  },
}

export default nextConfig
