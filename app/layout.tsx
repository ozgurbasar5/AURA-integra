import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'AURA İntegra — Entegrasyon Platformu',
  description: 'AURA Bilişim Teknoloji Üssü güvencesiyle bayi ve servis ağları için bulut entegrasyon platformu. Stok, atölye, finans ve müşteri portalı tek panelde.',
  keywords: 'AURA İntegra, AURA Bilişim, teknik servis, bayi ERP, stok, POS, entegrasyon',
  authors: [{ name: 'AURA Bilişim', url: 'https://aurabilisim.net' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('aura_color_mode');var d=m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}var t=localStorage.getItem('aura_theme');var themes={indigo:{a:'#6366f1',l:'#eef2ff',d:'#4f46e5',r:'#c7d2fe',x:'#4338ca'},blue:{a:'#3b82f6',l:'#eff6ff',d:'#2563eb',r:'#bfdbfe',x:'#1d4ed8'},cyan:{a:'#06b6d4',l:'#ecfeff',d:'#0891b2',r:'#a5f3fc',x:'#0e7490'},emerald:{a:'#10b981',l:'#ecfdf5',d:'#059669',r:'#6ee7b7',x:'#047857'},teal:{a:'#14b8a6',l:'#f0fdfa',d:'#0d9488',r:'#99f6e4',x:'#0f766e'},violet:{a:'#8b5cf6',l:'#f5f3ff',d:'#7c3aed',r:'#ddd6fe',x:'#6d28d9'},rose:{a:'#f43f5e',l:'#fff1f2',d:'#e11d48',r:'#fecdd3',x:'#be123c'},orange:{a:'#f97316',l:'#fff7ed',d:'#ea580c',r:'#fed7aa',x:'#c2410c'},slate:{a:'#475569',l:'#f8fafc',d:'#334155',r:'#cbd5e1',x:'#1e293b'}};var th=themes[t]||themes.indigo;var r=document.documentElement;r.style.setProperty('--accent',th.a);r.style.setProperty('--accent-light',th.l);r.style.setProperty('--accent-dark',th.d);r.style.setProperty('--accent-ring',th.r);r.style.setProperty('--accent-text',th.x);}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
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
