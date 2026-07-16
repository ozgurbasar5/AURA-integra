'use client'

import { useState, useEffect, useCallback } from 'react'
import { Percent, Loader2 } from 'lucide-react'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import { getServiceOrders, getPersonnel, onStoreChange } from '@/lib/store'
import { calcTechnicianCommissions, type CommissionRow } from '@/lib/erp-features'
import { formatCurrency } from '@/lib/validators'

type CommissionSummary = {
  from?: string
  to?: string
  total_commission: number
  total_revenue?: number
  delivered_count?: number
  technician_count?: number
}

export default function KomisyonPage() {
  const [mounted, setMounted] = useState(false)
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [summary, setSummary] = useState<CommissionSummary>({ total_commission: 0 })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/commissions', { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.ok) {
        setRows(json.items ?? [])
        setSummary(json.summary ?? { total_commission: 0 })
        return
      }
    } catch { /* fallback below */ }

    const localRows = calcTechnicianCommissions(getServiceOrders(), getPersonnel())
    setRows(localRows)
    setSummary({
      total_commission: localRows.reduce((s, r) => s + r.commission_amount, 0),
    })
  }, [])

  useEffect(() => {
    setMounted(true)
    void load()
    return onStoreChange(m => { if (!m || m === 'service' || m === 'personnel') void load() })
  }, [load])

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  const totalCommission = summary.total_commission ?? rows.reduce((s, r) => s + r.commission_amount, 0)

  return (
    <PageShell>
      <PageHeader
        eyebrow="Personel"
        title="Teknisyen Komisyonu"
        description="Teslim edilen servisler ve satışlar üzerinden prim hesaplama."
        icon={Percent}
      />

      <div className="surface p-5 rounded-2xl max-w-xs">
        <p className="text-xs font-bold text-slate-500 uppercase">Toplam Prim</p>
        <p className="text-3xl font-black text-sky-600">{formatCurrency(totalCommission)}</p>
        {summary.from && summary.to && (
          <p className="text-[10px] text-slate-400 mt-1">{summary.from} — {summary.to}</p>
        )}
      </div>

      <PageCard title="Teknisyen Bazlı" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                <th className="px-5 py-3 font-bold">Teknisyen</th>
                <th className="px-5 py-3 font-bold">Teslim</th>
                <th className="px-5 py-3 font-bold">Ciro</th>
                <th className="px-5 py-3 font-bold">Oran</th>
                <th className="px-5 py-3 font-bold text-right">Prim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Henüz teslim edilmiş servis yok</td></tr>
              ) : rows.map(r => (
                <tr key={r.name} className="hover:bg-sky-50/30">
                  <td className="px-5 py-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-5 py-3">{r.delivered_count}</td>
                  <td className="px-5 py-3">{formatCurrency(r.revenue)}</td>
                  <td className="px-5 py-3">%{r.commission_rate}</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(r.commission_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </PageShell>
  )
}
