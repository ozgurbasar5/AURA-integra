'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import {
  getServiceOrderByToken, processServiceApproval, type StoreServiceOrder,
} from '@/lib/store'
import { formatCurrency } from '@/lib/validators'

export default function OnayPage() {
  const { token } = useParams() as { token: string }
  const [mounted, setMounted] = useState(false)
  const [order, setOrder] = useState<StoreServiceOrder | null>(null)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  useEffect(() => {
    setMounted(true)
    const o = getServiceOrderByToken(token)
    setOrder(o ?? null)
  }, [token])

  function handleDecision(approved: boolean) {
    const result = processServiceApproval(token, approved)
    if (!result) { toast.error('Geçersiz veya süresi dolmuş link'); return }
    setOrder(result)
    setDone(approved ? 'approved' : 'rejected')
    toast.success(approved ? 'Onayınız alındı' : 'Reddedildi')
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05061a]">
        <Loader2 className="animate-spin text-sky-400" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05061a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Smartphone size={20} className="text-sky-400" />
          </div>
          <div>
            <p className="font-black text-lg">Onarım Onayı</p>
            <p className="text-xs text-white/40">AURA İntegra Servis</p>
          </div>
        </div>

        {!order ? (
          <p className="text-center text-red-300 py-8">Onay linki geçersiz veya süresi dolmuş.</p>
        ) : done ? (
          <div className="text-center py-8 space-y-3">
            {done === 'approved' ? (
              <>
                <CheckCircle2 size={56} className="mx-auto text-emerald-400" />
                <p className="text-xl font-bold">Teşekkürler!</p>
                <p className="text-white/50 text-sm">Onarım onaylandı. Cihazınız tamir sürecine alınacaktır.</p>
              </>
            ) : (
              <>
                <XCircle size={56} className="mx-auto text-red-400" />
                <p className="text-xl font-bold">Reddedildi</p>
                <p className="text-white/50 text-sm">Cihazınızı teslim almak için mağazamızla iletişime geçin.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-2xl font-black mb-1">{order.device_brand} {order.device_model}</p>
            <p className="text-sm text-white/40 font-mono mb-4">{order.job_no}</p>
            <div className="bg-white/[0.06] rounded-2xl p-4 mb-6">
              <p className="text-xs text-white/40 uppercase font-bold mb-1">Onarım ücreti</p>
              <p className="text-3xl font-black text-sky-300">
                {formatCurrency(order.approval_amount || order.actual_cost || order.estimated_cost || 0)}
              </p>
              {order.approval_desc && <p className="text-sm text-white/60 mt-2">{order.approval_desc}</p>}
              {order.description && <p className="text-sm text-white/50 mt-2">{order.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDecision(false)}
                className="py-3.5 rounded-xl border border-red-500/40 text-red-300 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Reddet
              </button>
              <button
                type="button"
                onClick={() => handleDecision(true)}
                className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Onayla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
