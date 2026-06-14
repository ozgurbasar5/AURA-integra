'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Shield, Search, Plus, X, AlertTriangle, CheckCircle,
  Wrench, Clock
} from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useStoreSlice } from '@/hooks/useStoreSlice'
import { getWarranties, setWarranties, addWarranty, type WarrantyRecord } from '@/lib/store'
import { formatDate } from '@/lib/validators'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  aktif:       { label: 'Aktif',       bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  sona_erdi:   { label: 'Sona Erdi',   bg: 'bg-slate-100',   text: 'text-slate-600',   icon: Clock },
  kullanildi:  { label: 'Kullanıldı',  bg: 'bg-blue-100',    text: 'text-blue-700',    icon: Wrench },
  reddedildi:  { label: 'Reddedildi',  bg: 'bg-red-100',     text: 'text-red-700',     icon: AlertTriangle },
}

const emptyForm = {
  order_id: '', customer_id: '', imei: '', device_brand: '', device_model: '',
  warranty_months: 6, start_date: new Date().toISOString().split('T')[0],
  end_date: '', covered_parts: [] as string[], customer_name: '', order_no: '', status: 'aktif' as const,
}

export default function GarantiPage() {
  const { items: warranties, saveAll, mounted } = useStoreSlice(getWarranties, setWarranties, 'warranties')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = warranties.filter(w => {
    if (search) {
      const q = search.toLowerCase()
      if (!w.customer_name?.toLowerCase().includes(q) && !w.order_no?.includes(q) && !w.imei?.includes(q) && !w.device_model.toLowerCase().includes(q)) return false
    }
    if (statusFilter && w.status !== statusFilter) return false
    return true
  })

  const stats = {
    aktif: warranties.filter(w => w.status === 'aktif').length,
    sona_erdi: warranties.filter(w => w.status === 'sona_erdi').length,
    kullanildi: warranties.filter(w => w.status === 'kullanildi').length,
    yaklasan: warranties.filter(w => {
      if (w.status !== 'aktif') return false
      const daysLeft = Math.ceil((new Date(w.end_date).getTime() - Date.now()) / 86400000)
      return daysLeft > 0 && daysLeft <= 30
    }).length,
  }

  function handleSave() {
    if (!form.customer_name || !form.device_brand) { toast.error('Müşteri ve cihaz bilgisi zorunlu'); return }
    const end = form.end_date || new Date(new Date(form.start_date).setMonth(new Date(form.start_date).getMonth() + form.warranty_months)).toISOString().split('T')[0]
    addWarranty({ ...form, end_date: end, covered_parts: form.covered_parts.length ? form.covered_parts : ['Genel'] })
    toast.success('Garanti kaydı oluşturuldu')
    setForm(emptyForm)
    setShowModal(false)
  }

  function updateStatus(id: string, status: WarrantyRecord['status']) {
    saveAll(warranties.map(w => w.id === id ? { ...w, status } : w))
    toast.success('Garanti durumu güncellendi')
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={Shield}
        title="Garanti Yönetimi"
        description="Servis garantileri, talepler ve takip"
        actions={<button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} /> Yeni Garanti</button>}
      />

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aktif Garanti', val: stats.aktif, bg: 'bg-emerald-50', color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Sona Eren', val: stats.sona_erdi, bg: 'bg-slate-50', color: 'text-slate-500', icon: Clock },
          { label: 'Kullanılan', val: stats.kullanildi, bg: 'bg-blue-50', color: 'text-blue-600', icon: Wrench },
          { label: '30 Günde Bitecek', val: stats.yaklasan, bg: 'bg-amber-50', color: 'text-amber-600', icon: AlertTriangle },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}>
              <m.icon size={14} className={m.color} />
            </div>
            <p className="text-xl font-black text-slate-900">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Müşteri, servis no, IMEI ile ara..."
            className="input pl-9 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="sona_erdi">Sona Erdi</option>
          <option value="kullanildi">Kullanıldı</option>
          <option value="reddedildi">Reddedildi</option>
        </select>
      </div>

      {/* Garanti Listesi */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">SERVİS</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">MÜŞTERİ</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">CİHAZ</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">SÜRE</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">BİTİŞ</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">KAPSAM</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-500 text-xs">DURUM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(w => {
                const sc = STATUS_CONFIG[w.status]
                const daysLeft = Math.ceil((new Date(w.end_date).getTime() - Date.now()) / 86400000)
                const isExpiring = w.status === 'aktif' && daysLeft > 0 && daysLeft <= 30
                return (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs font-bold text-sky-600">{w.order_no}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 text-xs">{w.customer_name}</td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-700">{w.device_brand} {w.device_model}</p>
                      {w.imei && <p className="text-[10px] text-slate-400 font-mono">{w.imei}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{w.warranty_months} ay</td>
                    <td className="py-3 px-4">
                      <p className={`text-xs font-semibold ${isExpiring ? 'text-amber-600' : 'text-slate-600'}`}>
                        {formatDate(w.end_date)}
                      </p>
                      {isExpiring && <p className="text-[10px] text-amber-500">{daysLeft} gün kaldı!</p>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {w.covered_parts?.map(p => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select value={w.status} onChange={e => updateStatus(w.id, e.target.value as WarrantyRecord['status'])} className="select text-[10px] py-1">
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Yeni Garanti</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Müşteri *</label><input className="input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
                <div><label className="label">Servis No</label><input className="input" value={form.order_no} onChange={e => setForm(f => ({ ...f, order_no: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Marka *</label><input className="input" value={form.device_brand} onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))} /></div>
                <div><label className="label">Model</label><input className="input" value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">IMEI</label><input className="input" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} /></div>
                <div><label className="label">Süre (ay)</label><input type="number" className="input" value={form.warranty_months} onChange={e => setForm(f => ({ ...f, warranty_months: parseInt(e.target.value) || 6 }))} /></div>
              </div>
              <div><label className="label">Başlangıç</label><input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleSave} className="btn-primary flex-1">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
