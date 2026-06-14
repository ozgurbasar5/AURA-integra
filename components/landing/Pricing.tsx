import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const VANTA_PLANS = [
  {
    name: 'Deneyim',
    price: 0,
    max_users: 2,
    max_branches: 1,
    features: ['30 Gün Ücretsiz Deneme', 'Teknik Servis', 'Stok Yönetimi', '2 Kullanıcı', '1 Şube'],
  },
  {
    name: 'Pro',
    price: 450,
    max_users: 4,
    max_branches: 2,
    features: ['Teknik Servis', 'Stok & Finans', 'Raporlar', '4 Kullanıcı', '2 Şube'],
  },
  {
    name: 'Business',
    price: 800,
    max_users: 8,
    max_branches: 4,
    features: ['Tüm Modüller', 'Çoklu Şube', 'Varlık Yönetimi', '8 Kullanıcı', '4 Şube', 'Öncelikli Destek'],
  },
]

export default async function Pricing() {
  let dbPlans: Array<Record<string, unknown>> | null = null

  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true })
    dbPlans = data
  } catch {
    dbPlans = null
  }

  const plansToRender =
    dbPlans && dbPlans.length > 0
      ? dbPlans.map((p) => ({
          name: String(p.name),
          price: Number(p.price),
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
          is_active: p.is_active !== false,
        }))
      : VANTA_PLANS.map((p) => ({ ...p, is_active: p.name === 'Deneyim' }))

  const getHighlighted = (planName: string, index: number) => {
    return planName.toLowerCase().includes('pro') || index === 1
  }

  return (
    <section id="pricing" className="py-24 bg-slate-50 relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Size Uygun Planı Seçin
          </h2>
          <p className="text-lg text-slate-600">
            VantaPhone tarzı 3 paket — admin vitrin paketini belirler. Gizli ücret yok.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plansToRender.map((plan, index) => {
            const isHighlighted = getHighlighted(plan.name, index)
            const isCatalog = plan.is_active

            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-8 border transition-all hover:shadow-xl ${
                  isHighlighted
                    ? 'border-sky-500 shadow-lg shadow-sky-100 scale-[1.02]'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {isCatalog && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Vitrin Paketi
                  </span>
                )}
                {isHighlighted && (
                  <span className="absolute -top-3 right-4 bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Popüler
                  </span>
                )}

                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <p className="text-3xl font-black text-slate-900">
                      Ücretsiz <span className="text-base font-normal text-slate-500">/ 30 Gün</span>
                    </p>
                  ) : (
                    <p className="text-3xl font-black text-slate-900">
                      ₺{plan.price}{' '}
                      <span className="text-base font-normal text-slate-500">/ Ay</span>
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/basvuru"
                  className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    isHighlighted
                      ? 'bg-sky-600 text-white hover:bg-sky-700'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {plan.price === 0 ? '30 Gün Deneyin' : 'Başvuru Yapın'}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
