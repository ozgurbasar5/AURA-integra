import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeAwareToaster } from '@/components/ThemeAwareToaster'
import SupabaseEnvScript from '@/components/SupabaseEnvScript'
import CookieConsent from '@/components/CookieConsent'
import PwaRegister from '@/components/PwaRegister'
import MagicLinkHashRedirect from '@/components/auth/MagicLinkHashRedirect'
import { themeBootScript } from '@/lib/theme-boot-script'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'AURA İntegra — Entegrasyon Platformu',
  description: 'AURA Bilişim Teknoloji Üssü güvencesiyle bayi ve servis ağları için bulut entegrasyon platformu. Stok, atölye, finans ve müşteri portalı tek panelde.',
  keywords: 'AURA İntegra, AURA Bilişim, teknik servis, bayi ERP, stok, POS, entegrasyon',
  authors: [{ name: 'AURA Bilişim', url: 'https://aurabilisim.net' }],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'AURA İntegra' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <SupabaseEnvScript />
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootScript(),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0284c7" />
      </head>
      <body className="font-sans antialiased">
        <MagicLinkHashRedirect />
        <PwaRegister />
        {children}
        <CookieConsent />
        <ThemeAwareToaster />
      </body>
    </html>
  )
}
