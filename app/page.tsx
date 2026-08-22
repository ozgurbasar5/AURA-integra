import { Metadata } from 'next'
import { getLandingPlans } from '@/lib/landing-plans'
import { LandingPageShell } from '@/components/landing/LandingPageShell'

export const metadata: Metadata = {
  title: 'AURA İntegra — Kurumsal Teknik Servis & Operasyon Yönetim Platformu',
  description:
    'Servis kabulünden atölyeye, stoktan kasaya, müşteriden mobil operasyona kadar tüm teknik servis süreçlerinizi tek merkezden yönetin. Multi-tenant ve RLS korumalı bulut altyapısı.',
  keywords: [
    'teknik servis programı',
    'servis yönetim yazılımı',
    'atölye takip',
    'mobil servis',
    'kasa ve finans yönetimi',
    'müşteri takip portalı',
    'çoklu şube servis yazılımı',
    'AURA İntegra',
  ],
  openGraph: {
    title: 'AURA İntegra — Kurumsal Teknik Servis & Operasyon Platformu',
    description:
      'Servis kabulünden atölyeye, stoktan kasaya kadar tüm operasyon tek merkezde.',
    url: 'https://integra.aurabilisim.net',
    siteName: 'AURA İntegra',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AURA İntegra — Teknik Servis & Operasyon Yönetimi',
    description:
      'Servis, stok, kasa, mobil ve müşteri portalı tek merkezde buluşuyor.',
  },
  alternates: {
    canonical: 'https://integra.aurabilisim.net',
  },
}

export default async function HomePage() {
  const { trialDays, plans } = await getLandingPlans()

  // JSON-LD structured schema for SoftwareApplication and Organization
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'AURA İntegra',
        operatingSystem: 'Web, iOS, Android',
        applicationCategory: 'BusinessApplication',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'TRY',
          price: plans[0]?.price || '0',
        },
        description:
          'Teknik servis işletmeleri için entegre atölye, stok, kasa, mobil ve müşteri takip platformu.',
      },
      {
        '@type': 'Organization',
        name: 'AURA Bilişim Tic. Ltd. Şti.',
        url: 'https://aurabilisim.net',
        logo: 'https://integra.aurabilisim.net/LOGO.png',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageShell plans={plans} trialDays={trialDays} />
    </>
  )
}
