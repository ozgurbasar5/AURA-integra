'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react'

type SubscriptionData = {
  status: string
  subscription_end: string | null
  plan: { name: string }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  return Math.ceil((end.getTime() - Date.now()) / 86400000)
}

export default function SubscriptionBanner() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/tenant/subscription', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.status) setData(json as SubscriptionData)
      })
      .catch(() => {})
  }, [])

  if (!data || dismissed) return null

  const days = daysUntil(data.subscription_end)
  const isTrial = data.status === 'trial' || data.plan.name.toLowerCase().includes('deneme')
  const isOverdue = data.status === 'payment_overdue'
  const isSuspended = data.status === 'suspended'

  let show = false
  let tone: 'amber' | 'red' | 'sky' = 'sky'
  let title = ''
  let message = ''

  if (isSuspended) {
    show = true
    tone = 'red'
    title = 'Hesap askıya alındı'
    message = 'Aboneliğinizi yenileyerek panele tam erişimi geri alın.'
  } else if (isOverdue) {
    show = true
    tone = 'red'
    title = 'Ödeme gecikmiş'
    message = 'Son ödemeniz alınamadı. Hizmet kesintisi yaşamamak için planınızı güncelleyin.'
  } else if (isTrial && days !== null && days <= 7) {
    show = true
    tone = days <= 1 ? 'red' : days <= 3 ? 'amber' : 'sky'
    title = days <= 0 ? 'Deneme süreniz bitti' : `Deneme bitişine ${days} gün`
    message =
      days <= 0
        ? 'Verileriniz korunur; tam erişim için plan seçin.'
        : `${data.plan.name} paketiniz ${new Date(data.subscription_end!).toLocaleDateString('tr-TR')} tarihinde sona erecek.`
  }

  if (!show) return null

  const styles = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
    red: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  }

  const Icon = isOverdue || isSuspended ? CreditCard : days !== null && days <= 3 ? AlertTriangle : Clock

  return (
    <div className={`no-print mb-4 rounded-2xl border px-4 py-3 flex items-start gap-3 ${styles[tone]}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs mt-0.5 opacity-90">{message}</p>
      </div>
      <Link
        href="/dashboard/plan-yukselt"
        className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 hover:opacity-90 transition-opacity"
      >
        Plan Yükselt
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70"
        aria-label="Kapat"
      >
        <X size={14} />
      </button>
    </div>
  )
}
