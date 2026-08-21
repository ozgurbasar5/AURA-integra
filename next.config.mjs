import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

/** Vercel deploy env kontrolü (uyarı verir, derlemeyi kesmez) */
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
    console.warn(
      '[AURA İntegra] Uyarı: Vercel Supabase env eksik veya varsayılan değerde. ' +
        'Vercel → Project → Settings → Environment Variables bölümüne ' +
        'NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
    )
  }

  if (!service || service.includes('placeholder') || service.includes('your-service')) {
    console.warn(
      '[AURA İntegra] Bilgi: SUPABASE_SERVICE_ROLE_KEY tanımlanmamış. ' +
        'Admin/bayi toplu işlemleri için Vercel → Settings → Environment Variables bölümüne ekleyebilirsiniz.'
    )
  }
}

assertVercelSupabaseEnv()

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    forceSwcTransforms: false,
    instrumentationHook: true,
  },
}

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : nextConfig
