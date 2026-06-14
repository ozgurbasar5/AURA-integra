'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCashShifts } from '@/lib/store'
import { buildShiftReport, type ShiftReport } from '@/lib/eod-report'
import { ShiftEndReport } from '@/components/finance/ShiftEndReport'
import { getBusinessBranding } from '@/lib/business-branding'

export default function ShiftReportPage() {
  const params = useParams()
  const shiftId = String(params.shiftId ?? '')
  const shift = useMemo(() => getCashShifts().find(s => s.id === shiftId), [shiftId])
  const report = useMemo(() => {
    if (!shift) return null
    if (shift.report_snapshot) return shift.report_snapshot as unknown as ShiftReport
    return buildShiftReport(shift, getBusinessBranding().shopName)
  }, [shift])

  if (!shift || !report) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Vardiya raporu bulunamadı.</p>
        <Link href="/dashboard/kasa" className="text-sky-600 text-sm mt-4 inline-block">← Kasa</Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="no-print flex gap-2 mb-4 max-w-2xl mx-auto">
        <Link href="/dashboard/kasa" className="btn-secondary btn-sm flex items-center gap-1"><ArrowLeft size={14} /> Kasa</Link>
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm flex items-center gap-1"><Printer size={14} /> Yazdır</button>
      </div>
      <ShiftEndReport report={report} />
    </div>
  )
}
