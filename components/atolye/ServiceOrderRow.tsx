'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, User, Smartphone } from 'lucide-react'
import type { AtolyeTableOrder } from '@/components/atolye/AtolyeOrderTable'

const STATUS: Record<string, { label: string; cls: string }> = {
  waiting_diagnosis: { label: 'Bekliyor', cls: 'bg-slate-100 text-slate-700' },
  parts_waiting: { label: 'Teşhis', cls: 'bg-violet-100 text-violet-800' },
  parts_ordered: { label: 'Parça', cls: 'bg-violet-100 text-violet-800' },
  in_repair: { label: 'Tamirde', cls: 'bg-sky-100 text-sky-800' },
  customer_approval_pending: { label: 'Onay', cls: 'bg-amber-100 text-amber-800' },
  ready_for_pickup: { label: 'Hazır', cls: 'bg-emerald-100 text-emerald-800' },
  delivered: { label: 'Teslim', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'İptal', cls: 'bg-red-100 text-red-700' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function daysInShop(created: string) {
  const d = Math.floor((Date.now() - new Date(created).getTime()) / 86400000)
  return d <= 0 ? 'Bugün' : `${d} gün`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function badge(status: string) {
  const s = STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

function ServiceOrderRowInner({ order: o }: { order: AtolyeTableOrder }) {
  return (
    <tr className="hover:bg-sky-50/40 transition-colors group">
      <td className="px-4 py-3 align-top">
        <Link href={`/dashboard/atolye/${o.id}`} className="font-mono font-bold text-sky-700 hover:underline">
          {o.job_no}
        </Link>
        <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(o.created_at)}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="font-semibold text-slate-900 flex items-center gap-1">
          <User size={12} className="text-slate-400 shrink-0" /> {o.customer_name}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{o.customer_phone}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-slate-800 flex items-center gap-1">
          <Smartphone size={12} className="text-slate-400 shrink-0" />
          {o.device_brand} {o.device_model}
        </p>
      </td>
      <td className="px-4 py-3 align-top font-mono text-[11px] text-slate-500">{o.imei || '—'}</td>
      <td className="px-4 py-3 align-top">{badge(o.status)}</td>
      <td className="px-4 py-3 align-top text-xs text-slate-600">{o.technician || '—'}</td>
      <td className="px-4 py-3 align-top text-right font-bold text-slate-900 tabular-nums">
        {o.actual_cost ? fmt(o.actual_cost) : o.estimated_cost ? fmt(o.estimated_cost) : '—'}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Clock size={11} /> {daysInShop(o.created_at)}</span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500">{fmtDate(o.eta)}</td>
      <td className="px-4 py-3 align-top">
        <Link href={`/dashboard/atolye/${o.id}`} className="text-slate-300 group-hover:text-sky-600 transition-colors">
          <ChevronRight size={16} />
        </Link>
      </td>
    </tr>
  )
}

const ServiceOrderRow = memo(ServiceOrderRowInner)
export default ServiceOrderRow
