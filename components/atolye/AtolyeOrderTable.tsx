'use client'

import ServiceOrderRow from '@/components/atolye/ServiceOrderRow'

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
              <ServiceOrderRow key={o.id} order={o} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
