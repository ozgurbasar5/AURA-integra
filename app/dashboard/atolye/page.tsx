'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Wrench, Plus, Search, Loader2, X,
} from 'lucide-react'
import { onStoreChange, type StoreServiceOrder } from '@/lib/store'
import { loadServiceOrdersFromApi, createServiceOrderRemote } from '@/lib/service-order-bridge'
import dynamic from 'next/dynamic'
import AtolyeOrderTable, { type AtolyeTableOrder } from '@/components/atolye/AtolyeOrderTable'
import { filterOrdersByTrackingQuery } from '@/lib/tracking-search'

const AtolyeKanban = dynamic(() => import('@/components/atolye/AtolyeKanban'), { ssr: false })

const FILTERS = [
  { key: '', label: 'Tümü' },
  { key: 'waiting_diagnosis', label: 'Bekliyor' },
  { key: 'in_repair', label: 'Tamirde' },
  { key: 'ready_for_pickup', label: 'Hazır' },
  { key: 'delivered', label: 'Teslim' },
]

interface OrderRow extends AtolyeTableOrder {}

export default function AtolyePage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', device_brand: 'Samsung',
    device_model: '', imei: '', description: '', estimated_cost: '',
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const list = await loadServiceOrdersFromApi()
    setOrders(list.map(mapStore))
    setLoading(false)
  }, [])

  function mapStore(o: StoreServiceOrder): OrderRow {
    return {
      id: o.id, job_no: o.job_no, customer_name: o.customer_name,
      customer_phone: o.customer_phone, device_brand: o.device_brand,
      device_model: o.device_model, imei: o.imei || '',
      status: o.status, technician: o.technician,
      estimated_cost: o.estimated_cost, actual_cost: o.actual_cost,
      description: o.description, created_at: o.created_at,
      updated_at: o.updated_at, eta: o.eta,
    }
  }

  useEffect(() => {
    fetchOrders()
    return onStoreChange(m => { if (m === 'service') fetchOrders() })
  }, [fetchOrders])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return orders.filter(o => !filter || o.status === filter)
    const hits = filterOrdersByTrackingQuery(orders, q)
    return hits.filter(o => !filter || o.status === filter)
  }, [orders, search, filter])

  const counts = useMemo(() => ({
    active: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
    repair: orders.filter(o => o.status === 'in_repair').length,
    ready: orders.filter(o => o.status === 'ready_for_pickup').length,
  }), [orders])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name || !form.customer_phone) {
      toast.error('Müşteri adı ve telefon zorunlu')
      return
    }
    setSaving(true)
    const result = await createServiceOrderRemote({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      device_brand: form.device_brand,
      device_model: form.device_model,
      imei: form.imei || undefined,
      description: form.description,
      estimated_cost: Number(form.estimated_cost) || 0,
      status: 'waiting_diagnosis',
    })
    if (result.synced) {
      toast.success(`Servis kaydı oluşturuldu — ${result.order.job_no}`)
    } else {
      toast.warning(result.error || 'Yerel kayıt oluşturuldu; portal senkronu yok')
    }
    setShowModal(false)
    setForm({ customer_name: '', customer_phone: '', device_brand: 'Samsung', device_model: '', imei: '', description: '', estimated_cost: '' })
    fetchOrders()
    setSaving(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">Teknik Servis</p>
          <h1 className="text-2xl font-black text-slate-900">Atölye</h1>
          <p className="text-sm text-slate-500 mt-1">{counts.active} aktif · {counts.repair} tamirde · {counts.ready} teslime hazır</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button type="button" onClick={() => setViewMode('kanban')} className={`px-3 py-2 text-xs font-bold ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Kanban</button>
            <button type="button" onClick={() => setViewMode('list')} className={`px-3 py-2 text-xs font-bold ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Liste</button>
          </div>
          <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Yeni Servis
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-11 py-3 text-base rounded-2xl border-slate-200 shadow-sm"
          placeholder="IMEI, müşteri, servis no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
      ) : viewMode === 'kanban' ? (
        <AtolyeKanban orders={filtered} onRefresh={fetchOrders} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4 surface">
          <Wrench size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Kayıt bulunamadı</p>
        </div>
      ) : (
        <AtolyeOrderTable orders={filtered} />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header py-4 px-5">
              <h3 className="font-bold text-lg">Yeni Servis</h3>
              <button type="button" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-body space-y-3 py-4 px-5">
              <input className="input" placeholder="Müşteri adı *" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              <input className="input" placeholder="Telefon *" required value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={form.device_brand} onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))}>
                  {['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer'].map(b => <option key={b}>{b}</option>)}
                </select>
                <input className="input" placeholder="Model" value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} />
              </div>
              <input className="input font-mono text-sm" placeholder="IMEI (opsiyonel)" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} />
              <textarea className="input resize-none" rows={2} placeholder="Arıza açıklaması" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input type="number" className="input" placeholder="Tahmini ücret (₺)" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
