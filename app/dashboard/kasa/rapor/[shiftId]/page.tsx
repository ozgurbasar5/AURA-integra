'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getCashShifts } from '@/lib/store'
import { buildShiftReport, type ShiftReport } from '@/lib/eod-report'
import { ShiftEndReport } from '@/components/finance/ShiftEndReport'
import { getBusinessBranding } from '@/lib/business-branding'

export default function ShiftReportPage() {
  const params = useParams()
  const shiftId = String(params.shiftId ?? '')
  const [report, setReport] = useState<ShiftReport | null>(null)
  const [source, setSource] = useState<'api' | 'snapshot' | 'local'>('local')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!shiftId) return
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const res = await fetch(`/api/tenant/eod-report?shiftId=${encodeURIComponent(shiftId)}`, {
          credentials: 'same-origin',
        })
        const json = await res.json()
        if (res.ok && json.report) {
          if (!cancelled) {
            setReport(json.report as ShiftReport)
            setSource(json.source === 'snapshot' ? 'snapshot' : 'api')
          }
          return
        }
        throw new Error(json.error || 'API rapor üretmedi')
      } catch {
        const shift = getCashShifts().find(s => s.id === shiftId)
        if (!shift) {
          if (!cancelled) setError('Vardiya raporu bulunamadı.')
          return
        }
        if (shift.report_snapshot) {
          if (!cancelled) {
            setReport(shift.report_snapshot as unknown as ShiftReport)
            setSource('local')
          }
          return
        }
        if (!cancelled) {
          setReport(buildShiftReport(shift, getBusinessBranding().shopName))
          setSource('local')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [shiftId])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Rapor yükleniyor…
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{error || 'Vardiya raporu bulunamadı.'}</p>
        <Link href="/dashboard/kasa" className="text-sky-600 text-sm mt-4 inline-block">← Kasa</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="no-print flex flex-wrap items-center gap-2 mb-4 max-w-2xl mx-auto">
        <Link href="/dashboard/kasa" className="btn-secondary btn-sm flex items-center gap-1"><ArrowLeft size={14} /> Kasa</Link>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm flex items-center gap-1"><Printer size={14} /> Yazdır</button>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          Kaynak: {source === 'api' ? 'Sunucu' : source === 'snapshot' ? 'Kayıtlı özet' : 'Yerel yedek'}
        </span>
      </div>
      <ShiftEndReport report={report} />
    </div>
  )
}
