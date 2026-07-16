'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Globe, Search, Plus, X, Trash2, Edit3, Eye, AlertTriangle,
  CheckCircle, Clock, Smartphone, ExternalLink, ChevronLeft, ChevronRight,
  ShieldCheck, CalendarClock, Phone
} from 'lucide-react'
import { toast } from 'sonner'
import { getForeignDevices, setForeignDevices, onStoreChange, type ForeignDevice } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceStatus = ForeignDevice['durum']

const DURUM_CONFIG: Record<DeviceStatus, { label: string; bg: string; text: string; dot: string }> = {
  kayit_bekliyor: { label: 'Kayıt Bekliyor', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  kayit_yapildi:  { label: 'Kayıt Yapıldı',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  tr_kayitli:     { label: 'TR Kayıtlı',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const ITEMS_PER_PAGE = 10
const REGISTRATION_DAYS = 120 // yurt dışı cihaz TR kayıt süresi

function isValidIMEI(imei: string): boolean {
  return /^\d{15}$/.test(imei)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateStr }
}

function daysLeft(dateStr: string): number {
  if (!dateStr) return 0
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function addDays(dateStr: string, days: number): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const emptyForm = {
  imei: '', marka: '', model: '',
  musteri_adi: '', musteri_telefon: '',
  durum: 'kayit_bekliyor' as DeviceStatus,
  giris_tarihi: new Date().toISOString().split('T')[0],
  notlar: '',
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function YurtDisiCihazPage() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<ForeignDevice[]>([])

  const reload = useCallback(() => setData(getForeignDevices()), [])

  useEffect(() => {
    reload()
    setMounted(true)
    return onStoreChange(m => { if (!m || m === 'foreignDevices' || m === 'seed') reload() })
  }, [reload])

  const persist = (items: ForeignDevice[]) => {
    setForeignDevices(items)
    setData(items)
  }

  const [checkImei, setCheckImei] = useState('')
  const [checkResult, setCheckResult] = useState<'found' | 'notfound' | null>(null)
  const [foundRecord, setFoundRecord] = useState<ForeignDevice | null>(null)
  const [checkError, setCheckError] = useState('')

  const [search, setSearch] = useState('')
  const [durumFilter, setDurumFilter] = useState('')
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [viewItem, setViewItem] = useState<ForeignDevice | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const stats = useMemo(() => ({
    total: data.length,
    bekliyor: data.filter(d => d.durum === 'kayit_bekliyor').length,
    yapildi: data.filter(d => d.durum === 'kayit_yapildi' || d.durum === 'tr_kayitli').length,
    sureDoluyor: data.filter(d => d.durum === 'kayit_bekliyor' && daysLeft(d.kayit_son_tarih) <= 15 && daysLeft(d.kayit_son_tarih) >= 0).length,
  }), [data])

  const handleCheck = () => {
    setCheckError(''); setCheckResult(null); setFoundRecord(null)
    const trimmed = checkImei.replace(/\s/g, '')
    if (!trimmed) { setCheckError('Lütfen bir IMEI numarası girin.'); return }
    if (!isValidIMEI(trimmed)) { setCheckError('IMEI 15 haneli sayısal değer olmalıdır.'); return }
    const found = data.find(d => d.imei === trimmed)
    if (found) { setCheckResult('found'); setFoundRecord(found) }
    else setCheckResult('notfound')
  }

  const filtered = useMemo(() => {
    let items = [...data]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.imei.includes(q) || i.marka.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q) || i.musteri_adi.toLowerCase().includes(q))
    }
    if (durumFilter) items = items.filter(i => i.durum === durumFilter)
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [data, search, durumFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  useEffect(() => { setPage(1) }, [search, durumFilter])

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormErrors({}); setShowModal(true) }
  const openEdit = (item: ForeignDevice) => {
    setEditingId(item.id)
    setForm({
      imei: item.imei, marka: item.marka, model: item.model,
      musteri_adi: item.musteri_adi, musteri_telefon: item.musteri_telefon,
      durum: item.durum, giris_tarihi: item.giris_tarihi, notlar: item.notlar,
    })
    setFormErrors({}); setShowModal(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.imei.trim()) errors.imei = 'IMEI zorunludur'
    else if (!isValidIMEI(form.imei.trim())) errors.imei = 'IMEI 15 haneli olmalıdır'
    if (!form.marka.trim()) errors.marka = 'Marka zorunludur'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) return
    const updated = [...data]
    const kayitSon = addDays(form.giris_tarihi, REGISTRATION_DAYS)
    if (editingId) {
      const idx = updated.findIndex(i => i.id === editingId)
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...form, imei: form.imei.trim(), marka: form.marka.trim(), model: form.model.trim(), kayit_son_tarih: kayitSon }
      }
    } else {
      if (data.some(d => d.imei === form.imei.trim())) { setFormErrors({ imei: 'Bu IMEI zaten kayıtlı' }); return }
      const now = new Date().toISOString()
      updated.unshift({
        id: uid(), imei: form.imei.trim(), marka: form.marka.trim(), model: form.model.trim(),
        musteri_adi: form.musteri_adi.trim(), musteri_telefon: form.musteri_telefon.trim(),
        durum: form.durum, giris_tarihi: form.giris_tarihi, kayit_son_tarih: kayitSon,
        notlar: form.notlar.trim(), created_at: now,
      })
    }
    persist(updated); setShowModal(false)
    toast.success(editingId ? 'Cihaz güncellendi' : 'Cihaz eklendi')
  }

  const handleDelete = (id: string) => {
    const updated = data.filter(d => d.id !== id)
    persist(updated); setDeleteId(null)
    toast.success('Kayıt silindi')
  }

  const setDurum = (id: string, durum: DeviceStatus) => {
    const updated = data.map(d => d.id === id ? { ...d, durum } : d)
    persist(updated)
    toast.success(`Durum: ${DURUM_CONFIG[durum].label}`)
  }

  if (!mounted)
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5"><Globe size={22} className="text-sky-600" /> Yurt Dışı / TR Kayıt Takibi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dahili IMEI / kayıt günlüğü — harici polis veya BTK çalıntı sorgusu değildir. Cihazın TR kayıt sürecini kendi defterinizde takip edin.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Cihaz Ekle</button>
      </div>

      {/* Quick check */}
      <div className="card p-5">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-sky-600" /> Hızlı IMEI Sorgulama
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" maxLength={15} value={checkImei}
              onChange={e => { setCheckImei(e.target.value.replace(/\D/g, '')); setCheckResult(null); setCheckError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder="IMEI numarası (15 haneli)"
              className="input pl-11 text-base tracking-wider"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">{checkImei.length}/15</span>
          </div>
          <button onClick={handleCheck} className="btn-primary px-8"><Search size={15} /> Kontrol Et</button>
        </div>

        {checkError && <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm"><AlertTriangle size={14} /> {checkError}</div>}

        {checkResult === 'notfound' && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-slate-400" />
            <div>
              <p className="font-bold text-slate-700">Sistemde kayıt yok</p>
              <p className="text-slate-500 text-sm">Bu IMEI takip listenizde değil. Cihazın resmi TR kayıt durumunu E-Devlet&apos;ten kontrol edin.</p>
            </div>
          </div>
        )}

        {checkResult === 'found' && foundRecord && (
          <div className={`mt-4 p-4 rounded-xl border ${DURUM_CONFIG[foundRecord.durum].bg} border-current/10`}>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-7 h-7 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-slate-800">{foundRecord.marka} {foundRecord.model}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div><span className="text-xs text-slate-400">Durum</span><p className="text-sm font-semibold text-slate-700">{DURUM_CONFIG[foundRecord.durum].label}</p></div>
                  <div><span className="text-xs text-slate-400">Müşteri</span><p className="text-sm font-semibold text-slate-700">{foundRecord.musteri_adi || '—'}</p></div>
                  <div><span className="text-xs text-slate-400">Giriş</span><p className="text-sm font-semibold text-slate-700">{formatDate(foundRecord.giris_tarihi)}</p></div>
                  <div><span className="text-xs text-slate-400">Kayıt Son</span><p className="text-sm font-semibold text-slate-700">{formatDate(foundRecord.kayit_son_tarih)}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <ExternalLink size={14} />
          <span>Resmi sorgu:</span>
          <a href="https://www.turkiye.gov.tr/btk-imei-sorgulama" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline underline-offset-2">
            E-Devlet IMEI Kayıt Sorgulama
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Takipteki Cihaz', value: stats.total, icon: Globe, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Kayıt Bekleyen', value: stats.bekliyor, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Kaydı Tamam', value: stats.yapildi, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Süresi Doluyor', value: stats.sureDoluyor, icon: CalendarClock, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}><s.icon size={18} className={s.color} /></div>
            <div><p className="text-2xl font-black text-slate-900">{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="IMEI, marka, model, müşteri ara..." className="input pl-8 py-2 text-sm" />
        </div>
        <select value={durumFilter} onChange={e => setDurumFilter(e.target.value)} className="select py-2 text-sm w-auto min-w-[160px]">
          <option value="">Tüm Durumlar</option>
          {Object.entries(DURUM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>IMEI</th><th>Cihaz</th><th>Müşteri</th><th>Durum</th><th>Giriş</th><th>Kayıt Son Tarih</th><th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  <Globe size={32} className="mx-auto mb-2 opacity-30" />
                  {data.length === 0 ? 'Henüz cihaz eklenmemiş' : 'Kayıt bulunamadı'}
                </td></tr>
              ) : paginated.map(item => {
                const durum = DURUM_CONFIG[item.durum]
                const left = daysLeft(item.kayit_son_tarih)
                const urgent = item.durum === 'kayit_bekliyor' && left <= 15
                return (
                  <tr key={item.id}>
                    <td><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{item.imei}</span></td>
                    <td><p className="font-medium text-slate-900">{item.marka} {item.model}</p></td>
                    <td>
                      <p className="text-sm text-slate-700">{item.musteri_adi || '—'}</p>
                      {item.musteri_telefon && <p className="text-xs text-slate-400">{item.musteri_telefon}</p>}
                    </td>
                    <td><span className={`badge ${durum.bg} ${durum.text} border-0 inline-flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${durum.dot}`} />{durum.label}</span></td>
                    <td className="text-xs text-slate-500">{formatDate(item.giris_tarihi)}</td>
                    <td>
                      <span className={`text-xs font-medium ${urgent ? 'text-red-600' : 'text-slate-500'}`}>
                        {formatDate(item.kayit_son_tarih)}
                        {item.durum === 'kayit_bekliyor' && left >= 0 && <span className="block text-[10px]">{left} gün kaldı</span>}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewItem(item)} className="btn-ghost btn-sm p-1.5" title="Görüntüle"><Eye size={13} /></button>
                        <button onClick={() => openEdit(item)} className="btn-ghost btn-sm p-1.5" title="Düzenle"><Edit3 size={13} /></button>
                        {item.durum === 'kayit_bekliyor' && (
                          <button onClick={() => setDurum(item.id, 'kayit_yapildi')} className="btn-ghost btn-sm p-1.5 text-emerald-600" title="Kayıt Yapıldı işaretle"><CheckCircle size={13} /></button>
                        )}
                        <button onClick={() => setDeleteId(item.id)} className="btn-ghost btn-sm p-1.5 text-red-500" title="Sil"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Toplam {filtered.length} kayıt · Sayfa {page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost btn-sm p-1.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost btn-sm p-1.5 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2"><Globe size={18} className="text-sky-600" /> {editingId ? 'Cihaz Düzenle' : 'Yurt Dışı Cihaz Ekle'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-sm p-1.5"><X size={16} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">IMEI Numarası *</label>
                <input value={form.imei} maxLength={15} onChange={e => setForm({ ...form, imei: e.target.value.replace(/\D/g, '') })} placeholder="15 haneli IMEI" className={`input font-mono ${formErrors.imei ? 'input-error' : ''}`} />
                {formErrors.imei && <p className="text-red-500 text-xs mt-1">{formErrors.imei}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Marka *</label>
                  <input value={form.marka} onChange={e => setForm({ ...form, marka: e.target.value })} placeholder="Apple, Samsung..." className={`input ${formErrors.marka ? 'input-error' : ''}`} />
                  {formErrors.marka && <p className="text-red-500 text-xs mt-1">{formErrors.marka}</p>}
                </div>
                <div><label className="label">Model</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="iPhone 15 Pro" className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Müşteri Adı</label><input value={form.musteri_adi} onChange={e => setForm({ ...form, musteri_adi: e.target.value })} placeholder="Ad Soyad" className="input" /></div>
                <div><label className="label">Telefon</label><input value={form.musteri_telefon} onChange={e => setForm({ ...form, musteri_telefon: e.target.value })} placeholder="0 5XX..." className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cihaz Giriş Tarihi</label>
                  <input type="date" value={form.giris_tarihi} onChange={e => setForm({ ...form, giris_tarihi: e.target.value })} className="input" />
                  <p className="text-[10px] text-slate-400 mt-1">Kayıt son tarihi: {formatDate(addDays(form.giris_tarihi, REGISTRATION_DAYS))}</p>
                </div>
                <div>
                  <label className="label">Kayıt Durumu</label>
                  <select value={form.durum} onChange={e => setForm({ ...form, durum: e.target.value as DeviceStatus })} className="select">
                    {Object.entries(DURUM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Notlar</label><textarea value={form.notlar} onChange={e => setForm({ ...form, notlar: e.target.value })} rows={2} placeholder="Harç ödendi mi, ek bilgi..." className="input resize-none" /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
              <button onClick={handleSave} className="btn-primary"><CheckCircle size={14} /> {editingId ? 'Güncelle' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2"><Eye size={18} className="text-sky-600" /> Cihaz Detayı</h2>
              <button onClick={() => setViewItem(null)} className="btn-ghost btn-sm p-1.5"><X size={16} /></button>
            </div>
            <div className="modal-body space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><p className="text-xs text-slate-400 mb-1">IMEI</p><p className="font-mono text-slate-900 tracking-wider">{viewItem.imei}</p></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Marka / Model', v: `${viewItem.marka} ${viewItem.model}` },
                  { l: 'Durum', v: DURUM_CONFIG[viewItem.durum].label },
                  { l: 'Müşteri', v: viewItem.musteri_adi || '—' },
                  { l: 'Telefon', v: viewItem.musteri_telefon || '—' },
                  { l: 'Giriş Tarihi', v: formatDate(viewItem.giris_tarihi) },
                  { l: 'Kayıt Son Tarih', v: formatDate(viewItem.kayit_son_tarih) },
                ].map(f => (
                  <div key={f.l}><p className="text-xs text-slate-400 mb-0.5">{f.l}</p><p className="text-sm font-semibold text-slate-800">{f.v}</p></div>
                ))}
              </div>
              {viewItem.notlar && <div><p className="text-xs text-slate-400 mb-1">Notlar</p><p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{viewItem.notlar}</p></div>}
              {viewItem.musteri_telefon && (
                <a href={`https://wa.me/90${viewItem.musteri_telefon.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm w-full justify-center">
                  <Phone size={13} /> Müşteriye Ulaş
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-box max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center"><Trash2 className="w-7 h-7 text-red-500" /></div>
              <h3 className="text-slate-900 mb-2">Kaydı Sil</h3>
              <p className="text-sm text-slate-500 mb-6">Bu cihaz kaydını kalıcı olarak silmek istediğinize emin misiniz?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="btn-secondary">Vazgeç</button>
                <button onClick={() => handleDelete(deleteId)} className="btn-danger"><Trash2 size={14} /> Evet, Sil</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
