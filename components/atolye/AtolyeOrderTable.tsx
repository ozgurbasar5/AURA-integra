'use client'

import Link from 'next/link'
import { ChevronRight, Clock, User, Smartphone } from 'lucide-react'

export interface AtolyeTableOrder {
  id: string
  job_no: string
  customer_name: string
  customer_phone: string
  device_brand: string
  device_model: string
  imei: string
  status: string
  technician: string | null
  estimated_cost: number
  actual_cost?: number
  description?: string
  created_at: string
  updated_at: string
  eta: string | null
}

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

export default function AtolyeOrderTable({ orders }: { orders: AtolyeTableOrder[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Servis No</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Müşteri</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Cihaz</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">IMEI</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Durum</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Teknisyen</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Ücret</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Süre</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">ETA</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-sky-50/40 transition-colors group">
                <td className="px-4 py-3 align-top">
                  <Link href={`/dashboard/atolye/${o.id}`} className="font-mono font-bold text-sky-700 hover:underline">
                    {o.job_no}
                  </Link>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(o.created_at)}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-start gap-1.5">
                    <User size={13} className="text-slate-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">{o.customer_name}</p>
                      <p className="text-xs text-slate-500">{o.customer_phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-start gap-1.5">
                    <Smartphone size={13} className="text-slate-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{o.device_brand} {o.device_model}</p>
                      {o.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px] mt-0.5">{o.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top font-mono text-xs text-slate-500">
                  {o.imei && o.imei !== '-' ? o.imei : '—'}
                </td>
                <td className="px-4 py-3 align-top">{badge(o.status)}</td>
                <td className="px-4 py-3 align-top text-xs text-slate-600">
                  {o.technician || '—'}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <p className="font-bold text-slate-900">
                    {(o.actual_cost ?? o.estimated_cost) > 0 ? fmt(o.actual_cost ?? o.estimated_cost) : '—'}
                  </p>
                  {o.actual_cost != null && o.estimated_cost > 0 && o.actual_cost !== o.estimated_cost && (
                    <p className="text-[10px] text-slate-400 line-through">{fmt(o.estimated_cost)}</p>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={11} /> {daysInShop(o.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-xs text-slate-500">{fmtDate(o.eta)}</td>
                <td className="px-4 py-3 align-top">
                  <Link href={`/dashboard/atolye/${o.id}`} className="text-slate-300 group-hover:text-sky-500">
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
