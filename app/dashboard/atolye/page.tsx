'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Wrench, Plus, Search, Loader2, Phone, ChevronRight, X,
} from 'lucide-react'
import {
  getServiceOrders, addServiceOrder, onStoreChange, type StoreServiceOrder,
} from '@/lib/store'

const STATUS: Record<string, { label: string; cls: string }> = {
  waiting_diagnosis: { label: 'Bekliyor', cls: 'bg-slate-100 text-slate-700' },
  in_repair: { label: 'Tamirde', cls: 'bg-sky-100 text-sky-800' },
  customer_approval_pending: { label: 'Onay', cls: 'bg-amber-100 text-amber-800' },
  ready_for_pickup: { label: 'Hazır', cls: 'bg-emerald-100 text-emerald-800' },
  delivered: { label: 'Teslim', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'İptal', cls: 'bg-red-100 text-red-700' },
}

const FILTERS = [
  { key: '', label: 'Tümü' },
  { key: 'waiting_diagnosis', label: 'Bekliyor' },
  { key: 'in_repair', label: 'Tamirde' },
  { key: 'ready_for_pickup', label: 'Hazır' },
  { key: 'delivered', label: 'Teslim' },
]

interface OrderRow {
  id: string
  job_no: string
  customer_name: string
  customer_phone: string
  device_brand: string
  device_model: string
  imei: string
  status: string
  estimated_cost: number
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

function relTime(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 60) return `${m} dk`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} sa`
  return `${Math.floor(h / 24)} gün`
}

function badge(status: string) {
  const s = STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
}

export default function AtolyePage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', device_brand: 'Samsung',
    device_model: '', imei: '', description: '', estimated_cost: '',
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('service_orders').select('*').order('created_at', { ascending: false })
      if (data?.length) {
        setOrders(data.map((r: any) => ({
          id: r.id,
          job_no: r.job_no || `SRV-${String(r.id).slice(0, 6)}`,
          customer_name: r.customer_name || '—',
          customer_phone: r.customer_phone || '',
          device_brand: r.device_brand || '',
          device_model: r.device_model || '',
          imei: r.imei || '',
          status: r.status || 'waiting_diagnosis',
          estimated_cost: Number(r.estimated_cost) || 0,
          created_at: r.created_at,
        })))
      } else {
        setOrders(getServiceOrders().map(mapStore))
      }
    } catch {
      setOrders(getServiceOrders().map(mapStore))
    }
    setLoading(false)
  }, [supabase])

  function mapStore(o: StoreServiceOrder): OrderRow {
    return {
      id: o.id, job_no: o.job_no, customer_name: o.customer_name,
      customer_phone: o.customer_phone, device_brand: o.device_brand,
      device_model: o.device_model, imei: o.imei || '',
      status: o.status, estimated_cost: o.estimated_cost, created_at: o.created_at,
    }
  }

  useEffect(() => {
    fetchOrders()
    return onStoreChange(m => { if (m === 'service') fetchOrders() })
  }, [fetchOrders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      if (filter && o.status !== filter) return false
      if (!q) return true
      return [o.job_no, o.customer_name, o.customer_phone, o.device_brand, o.device_model, o.imei]
        .some(v => v?.toLowerCase().includes(q))
    })
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
    const jobNo = `SRV-${Date.now().toString().slice(-6)}`
    const created = addServiceOrder({
      job_no: jobNo,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      device_brand: form.device_brand,
      device_model: form.device_model,
      imei: form.imei || '-',
      status: 'waiting_diagnosis',
      technician: null,
      estimated_cost: Number(form.estimated_cost) || 0,
      description: form.description,
      created_at: new Date().toISOString(),
      eta: null,
    })
    try {
      await supabase.from('service_orders').insert({
        id: created.id, job_no: jobNo, customer_name: form.customer_name,
        customer_phone: form.customer_phone, device_brand: form.device_brand,
        device_model: form.device_model, imei: form.imei, status: 'waiting_diagnosis',
        estimated_cost: Number(form.estimated_cost) || 0, description: form.description,
      })
    } catch { /* local ok */ }
    toast.success('Servis kaydı oluşturuldu')
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
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary shrink-0">
          <Plus size={16} /> Yeni Servis
        </button>
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

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Wrench size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(o => (
              <Link
                key={o.id}
                href={`/dashboard/atolye/${o.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-sky-100 transition-colors">
                  <Wrench size={18} className="text-slate-500 group-hover:text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-900">{o.job_no}</span>
                    {badge(o.status)}
                  </div>
                  <p className="text-sm text-slate-700 truncate mt-0.5">{o.customer_name} · {o.device_brand} {o.device_model}</p>
                  {o.imei && o.imei !== '-' && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.imei}</p>}
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-bold text-slate-900">{o.estimated_cost > 0 ? fmt(o.estimated_cost) : '—'}</p>
                  <p className="text-[10px] text-slate-400">{relTime(o.created_at)} önce</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

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
