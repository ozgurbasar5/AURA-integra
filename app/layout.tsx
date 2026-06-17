import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import SupabaseEnvScript from '@/components/SupabaseEnvScript'
import CookieConsent from '@/components/CookieConsent'
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
      </head>
      <body className="font-sans antialiased">
        {children}
        <CookieConsent />
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          expand
          closeButton
          toastOptions={{
            style: {
              background: 'rgba(17, 17, 19, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(39, 39, 42, 0.8)',
              color: '#fafafa',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
          }}
        />
      </body>
    </html>
  )
}
