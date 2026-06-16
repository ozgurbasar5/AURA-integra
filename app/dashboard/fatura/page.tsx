'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  FileText, Search, Plus, X, Download, Send,
  CheckCircle, Clock, XCircle, Eye, Printer, AlertTriangle
} from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useStoreSlice } from '@/hooks/useStoreSlice'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getInvoices, setInvoices, addInvoice, type InvoiceRecord } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/validators'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  taslak:     { label: 'Taslak',     bg: 'bg-slate-100',   text: 'text-slate-600',   icon: Clock },
  onaylandi:  { label: 'Onaylandı',  bg: 'bg-blue-100',    text: 'text-blue-700',    icon: CheckCircle },
  gonderildi: { label: 'Gönderildi', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Send },
  iptal:      { label: 'İptal',      bg: 'bg-red-100',     text: 'text-red-700',     icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  efatura: 'e-Fatura', earsiv: 'e-Arşiv', irsaliye: 'İrsaliye',
}

const emptyForm: {
  invoice_type: InvoiceRecord['invoice_type']
  customer_name: string; customer_vkn: string; order_no: string
  description: string; unit_price: number; quantity: number
} = {
  invoice_type: 'earsiv',
  customer_name: '', customer_vkn: '', order_no: '',
  description: '', unit_price: 0, quantity: 1,
}

export default function FaturaPage() {
  const { items: invoices, saveAll, mounted } = useStoreSlice(getInvoices, setInvoices, 'invoices')
  const { flags, loading: flagsLoading } = useFeatureFlags()
  const efaturaEnabled = flags ? isFeatureEnabled(flags, 'efatura') : false
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!mounted || flagsLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = invoices.filter(inv => {
    if (search) {
      const q = search.toLowerCase()
      if (!inv.customer_name.toLowerCase().includes(q) && !inv.invoice_no.includes(q) && !inv.order_no?.includes(q)) return false
    }
    if (typeFilter && inv.invoice_type !== typeFilter) return false
    if (statusFilter && inv.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: invoices.length,
    totalAmount: invoices.filter(i => i.status !== 'iptal').reduce((s, i) => s + i.total, 0),
    draft: invoices.filter(i => i.status === 'taslak').length,
    sent: invoices.filter(i => i.status === 'gonderildi').length,
  }

  function handleSubmitGib(inv: InvoiceRecord) {
    if (inv.invoice_type !== 'efatura') {
      toast.error('Yalnızca e-Fatura GIB\'e gönderilebilir')
      return
    }
    void (async () => {
      const res = await fetch('/api/tenant/invoices/submit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: inv.id }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(json.message || 'GIB kuyruğuna alındı')
      } else {
        toast.error(json.error || 'Gönderilemedi')
      }
    })()
  }

  function handleCreate() {
    if (!form.customer_name || form.unit_price <= 0) { toast.error('Müşteri ve tutar zorunlu'); return }
    if (form.invoice_type === 'efatura' && !efaturaEnabled) {
      toast.error('e-Fatura özelliği aktif değil')
      return
    }
    const subtotal = form.unit_price * form.quantity
    const kdv = subtotal * 0.2
    const prefix = form.invoice_type === 'efatura' ? 'FAT' : 'ARA'
    const no = `${prefix}${new Date().getFullYear()}${String(Date.now()).slice(-6)}`
    addInvoice({
      invoice_type: form.invoice_type,
      invoice_no: no,
      invoice_date: new Date().toISOString().split('T')[0],
      customer_name: form.customer_name,
      customer_vkn: form.customer_vkn || undefined,
      order_no: form.order_no || undefined,
      items: [{ description: form.description || 'Hizmet', quantity: form.quantity, unit_price: form.unit_price, kdv_rate: 20 }],
      subtotal, kdv_amount: kdv, total: subtotal + kdv, status: 'taslak',
    })
    toast.success('Fatura oluşturuldu')
    setForm(emptyForm)
    setShowNewModal(false)
  }

  function sendInvoice(id: string) {
    saveAll(invoices.map(i => i.id === id ? { ...i, status: 'gonderildi' as const } : i))
    toast.success('Fatura gönderildi')
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={FileText}
        title="E-Fatura & E-Arşiv"
        description="GİB uyumlu fatura yönetimi"
        actions={<button onClick={() => setShowNewModal(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} /> Yeni Fatura</button>}
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Fatura', val: stats.total, bg: 'bg-sky-50', color: 'text-sky-600', icon: FileText },
          { label: 'Toplam Tutar', val: formatCurrency(stats.totalAmount), bg: 'bg-emerald-50', color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Taslak', val: stats.draft, bg: 'bg-amber-50', color: 'text-amber-600', icon: Clock },
          { label: 'Gönderilen', val: stats.sent, bg: 'bg-blue-50', color: 'text-blue-600', icon: Send },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}>
              <m.icon size={14} className={m.color} />
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Fatura no, müşteri, servis no ile ara..."
            className="input pl-9 text-sm" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Tipler</option>
          <option value="efatura">e-Fatura</option>
          <option value="earsiv">e-Arşiv</option>
          <option value="irsaliye">İrsaliye</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Durumlar</option>
          <option value="taslak">Taslak</option>
          <option value="onaylandi">Onaylandı</option>
          <option value="gonderildi">Gönderildi</option>
          <option value="iptal">İptal</option>
        </select>
      </div>

      {/* Fatura Listesi */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">FATURA NO</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">TİP</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">MÜŞTERİ</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">TARİH</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">TUTAR</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">KDV</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">TOPLAM</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-500 text-xs">DURUM</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(inv => {
                const sc = STATUS_CONFIG[inv.status]
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4">
                      <p className="font-mono text-xs font-bold text-sky-600">
                        {inv.invoice_no || <span className="text-slate-300 italic">Taslak</span>}
                      </p>
                      {inv.order_no && <p className="text-[10px] text-slate-400">{inv.order_no}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-slate-700">{TYPE_LABELS[inv.invoice_type]}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-slate-900">{inv.customer_name}</p>
                      {inv.customer_vkn && <p className="text-[10px] text-slate-400 font-mono">VKN: {inv.customer_vkn}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{formatDate(inv.invoice_date)}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-600 tabular-nums">{formatCurrency(inv.subtotal)}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-400 tabular-nums">{formatCurrency(inv.kdv_amount)}</td>
                    <td className="py-3 px-4 text-right text-sm font-black text-slate-900 tabular-nums">{formatCurrency(inv.total)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                        <sc.icon size={10} /> {sc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Görüntüle"><Eye size={13} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="Yazdır"><Printer size={13} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600" title="PDF İndir"><Download size={13} /></button>
                        {inv.status === 'taslak' && (
                          <button onClick={() => sendInvoice(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Gönder"><Send size={13} /></button>
                        )}
                        {inv.invoice_type === 'efatura' && inv.status !== 'gonderildi' && efaturaEnabled && (
                          <button onClick={() => handleSubmitGib(inv)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="GIB'e Gönder"><Send size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Toplam */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-xs text-slate-500">{filtered.length} fatura</span>
          <span className="text-sm font-black text-slate-900">
            Toplam: {formatCurrency(filtered.filter(i => i.status !== 'iptal').reduce((s, i) => s + i.total, 0))}
          </span>
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Yeni Fatura</h3>
              <button onClick={() => setShowNewModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="label">Tip</label>
                <select className="select" value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value as InvoiceRecord['invoice_type'] }))}>
                  <option value="earsiv">e-Arşiv</option>
                  {efaturaEnabled && <option value="efatura">e-Fatura</option>}
                  <option value="irsaliye">İrsaliye</option>
                </select>
                {!efaturaEnabled && (
                  <p className="text-[10px] text-amber-600 mt-1">e-Fatura entegrasyonu paketinizde aktif değil.</p>
                )}
              </div>
              <div><label className="label">Müşteri *</label><input className="input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">VKN</label><input className="input" value={form.customer_vkn} onChange={e => setForm(f => ({ ...f, customer_vkn: e.target.value }))} /></div>
                <div><label className="label">Servis No</label><input className="input" value={form.order_no} onChange={e => setForm(f => ({ ...f, order_no: e.target.value }))} /></div>
              </div>
              <div><label className="label">Açıklama</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Hizmet açıklaması" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Birim Fiyat *</label><input type="number" className="input" value={form.unit_price || ''} onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} /></div>
                <div><label className="label">Adet</label><input type="number" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} /></div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowNewModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleCreate} className="btn-primary flex-1">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* KDV Uyarısı */}
      <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">GİB Entegrasyon Bilgisi</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            e-Fatura ve e-Arşiv gönderimi için GİB entegratörü (Paraşüt, eFinans, Logo vb.) bağlantısı
            Ayarlar → Entegrasyonlar sayfasından yapılandırılabilir.
          </p>
        </div>
      </div>
    </div>
  )
}
