'use client'

import { useEffect, useState } from 'react'
import PortalTrackUI from '@/components/portal/PortalTrackUI'
import { Loader2, Package } from 'lucide-react'

export default function PortalPage({ params }: { params: { slug: string } }) {
  const [loading, setLoading] = useState(true)
  const [portalEnabled, setPortalEnabled] = useState(true)
  const [branding, setBranding] = useState({
    shopName: params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    shopPhone: '',
    shopLogo: null as string | null,
    shopAddress: '',
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/tenant/branding?slug=${encodeURIComponent(params.slug)}`)
        if (res.ok) {
          const json = await res.json()
          if (cancelled) return
          setBranding({
            shopName: json.shopName || branding.shopName,
            shopPhone: json.shopPhone || '',
            shopLogo: json.shopLogo || null,
            shopAddress: json.shopAddress || '',
          })
        }
      } catch {
        /* fallback slug name */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05061a]">
        <Loader2 className="animate-spin text-sky-400 w-8 h-8" />
      </div>
    )
  }

  if (!portalEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05061a] px-6">
        <div className="text-center max-w-md text-white">
          <Package size={40} className="mx-auto text-white/30 mb-4" />
          <h1 className="text-lg font-bold mb-2">Portal bulunamadı</h1>
          <p className="text-sm text-white/50">Bayi slug&apos;ı veya portal ayarlarını kontrol edin.</p>
        </div>
      </div>
    )
  }

  return (
    <PortalTrackUI
      slug={params.slug}
      shopName={branding.shopName}
      shopPhone={branding.shopPhone}
      shopLogo={branding.shopLogo}
      shopAddress={branding.shopAddress}
    />
  )
}
