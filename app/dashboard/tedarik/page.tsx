'use client'

import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PageShell, PageHeader, PageCard, EmptyState } from '@/components/ui/PageShell'
import {
  getSupplierOrders, addSupplierOrder, updateSupplierOrderStatus,
  getServiceOrders, onStoreChange, type SupplierOrder,
} from '@/lib/store'
import { formatCurrency } from '@/lib/validators'

const STATUS: Record<string, string> = {
  pending: 'Bekliyor',
  ordered: 'Sipariş Verildi',
  received: 'Teslim Alındı',
  cancelled: 'İptal',
}

export default function TedarikPage() {
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    supplier_name: '',
    supplier_phone: '',
    service_order_id: '',
    item_name: '',
    qty: '1',
    unit_price: '',
    notes: '',
  })

  const refresh = useCallback(() => setOrders(getSupplierOrders()), [])

  useEffect(() => {
    setMounted(true)
    refresh()
    return onStoreChange(m => { if (!m || m === 'supplier') refresh() })
  }, [refresh])

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier_name || !form.item_name) { toast.error('Tedarikçi ve parça adı zorunlu'); return }
    const qty = Number(form.qty) || 1
    const unit = Number(form.unit_price) || 0
    const svc = getServiceOrders().find(o => o.id === form.service_order_id)
    addSupplierOrder({
      supplier_name: form.supplier_name,
      supplier_phone: form.supplier_phone || undefined,
      service_order_id: form.service_order_id || undefined,
      service_job_no: svc?.job_no,
      items: [{ name: form.item_name, qty, unit_price: unit }],
      total: qty * unit,
      notes: form.notes || undefined,
    })
    toast.success('Tedarik siparişi oluşturuldu')
    setShowForm(false)
    setForm({ supplier_name: '', supplier_phone: '', service_order_id: '', item_name: '', qty: '1', unit_price: '', notes: '' })
    refresh()
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  const serviceOrders = getServiceOrders().filter(o => !['delivered', 'cancelled'].includes(o.status))

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tedarik"
        title="Parça Siparişleri"
        description="Servis kayıtlarına bağlı tedarikçi siparişleri ve parça bekleme takibi."
        icon={Truck}
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary btn-sm flex items-center gap-2">
            <Plus size={14} /> Yeni Sipariş
          </button>
        }
      />

      {orders.length === 0 ? (
        <PageCard><EmptyState icon={Truck} title="Sipariş yok" description="Parça bekleyen servisler için tedarikçi siparişi oluşturun." /></PageCard>
      ) : (
        <PageCard noPadding>
          <div className="divide-y divide-slate-100">
            {orders.map(o => (
              <div key={o.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold">{o.order_no}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">{STATUS[o.status]}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{o.supplier_name} · {o.items.map(i => i.name).join(', ')}</p>
                  {o.service_job_no && (
                    <Link href={`/dashboard/atolye`} className="text-xs text-sky-600 hover:underline">{o.service_job_no}</Link>
                  )}
                </div>
                <p className="font-bold text-slate-900">{formatCurrency(o.total)}</p>
                <select
                  className="select text-xs py-1.5"
                  value={o.status}
                  onChange={e => { updateSupplierOrderStatus(o.id, e.target.value as SupplierOrder['status']); refresh() }}
                >
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
        </PageCard>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header py-4 px-5"><h3 className="font-bold">Tedarik Siparişi</h3></div>
            <form onSubmit={handleCreate} className="modal-body space-y-3 py-4 px-5">
              <input className="input" placeholder="Tedarikçi adı *" required value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
              <input className="input" placeholder="Telefon" value={form.supplier_phone} onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))} />
              <select className="input" value={form.service_order_id} onChange={e => setForm(f => ({ ...f, service_order_id: e.target.value }))}>
                <option value="">Servis bağlantısı (opsiyonel)</option>
                {serviceOrders.map(s => <option key={s.id} value={s.id}>{s.job_no} — {s.device_brand}</option>)}
              </select>
              <input className="input" placeholder="Parça adı *" required value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="Adet" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                <input className="input" type="number" placeholder="Birim fiyat" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
              </div>
              <textarea className="input resize-none" rows={2} placeholder="Not" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
