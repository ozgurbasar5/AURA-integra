'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  X,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Calendar,
  Package,
  Clock,
  UserPlus,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type BasvuruStatus = 'beklemede' | 'inceleniyor' | 'onaylandi' | 'reddedildi'

interface Basvuru {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  city: string | null
  device_types: string[]
  monthly_service_count: string | null
  plan_interest: string | null
  message: string | null
  internal_note: string | null
  status: BasvuruStatus
  created_at: string
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BasvuruStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  beklemede: {
    label: 'Beklemede',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  inceleniyor: {
    label: 'İnceleniyor',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  onaylandi: {
    label: 'Onaylandı',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  reddedildi: {
    label: 'Reddedildi',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
}

const ALL_STATUSES: BasvuruStatus[] = [
  'beklemede',
  'inceleniyor',
  'onaylandi',
  'reddedildi',
]

function StatusBadge({ status }: { status: BasvuruStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        cfg.bg,
        cfg.text,
        cfg.border
      )}
    >
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BasvurularPage() {
  const router = useRouter()
  const supabase = createClient()

  const [basvurular, setBasvurular] = useState<Basvuru[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<BasvuruStatus | 'tumu'>(
    'tumu'
  )
  const [selected, setSelected] = useState<Basvuru | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Drawer state
  const [newStatus, setNewStatus] = useState<BasvuruStatus>('beklemede')
  const [internalNote, setInternalNote] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBasvurular = useCallback(async () => {
    setLoading(true)
    const { data, error } = await (
      supabase.from('bayi_basvurulari') as any
    ).select('*').order('created_at', { ascending: false })

    if (!error && data) {
      setBasvurular(data as Basvuru[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchBasvurular()
  }, [fetchBasvurular])

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered =
    filterStatus === 'tumu'
      ? basvurular
      : basvurular.filter((b) => b.status === filterStatus)

  const bekleyenCount = basvurular.filter((b) => b.status === 'beklemede').length

  // ── Drawer open ────────────────────────────────────────────────────────────

  function openDrawer(b: Basvuru) {
    setSelected(b)
    setNewStatus(b.status)
    setInternalNote(b.internal_note ?? '')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelected(null)
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const { error } = await (supabase.from('bayi_basvurulari') as any)
      .update({ status: newStatus, internal_note: internalNote })
      .eq('id', selected.id)

    if (!error) {
      await fetchBasvurular()
      closeDrawer()
    }
    setSaving(false)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <ClipboardList size={20} className="text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bayi Başvuruları</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gelen bayi başvurularını inceleyin ve yönetin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
              Toplam: <strong>{basvurular.length}</strong>
            </span>
            {bekleyenCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
                Bekleyen: <strong>{bekleyenCount}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('tumu')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              filterStatus === 'tumu'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
            )}
          >
            Tümü ({basvurular.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const count = basvurular.filter((b) => b.status === s).length
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  filterStatus === s
                    ? cn('text-white border-transparent', 
                        s === 'beklemede' ? 'bg-amber-500' :
                        s === 'inceleniyor' ? 'bg-blue-500' :
                        s === 'onaylandi' ? 'bg-green-500' : 'bg-red-500')
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Yükleniyor…</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ClipboardList size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium">Başvuru bulunamadı</p>
              <p className="text-xs mt-1">
                {filterStatus !== 'tumu' ? 'Filtreyi değiştirmeyi deneyin' : 'Henüz başvuru gelmemiş'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Firma</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">İletişim</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Şehir</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Servis Türleri</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Paket İlgisi</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tarih</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Durum</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => openDrawer(b)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{b.company_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{b.contact_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{b.email}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{b.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        {b.device_types && b.device_types.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {b.device_types.slice(0, 2).map((d) => (
                              <span
                                key={d}
                                className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                              >
                                {d}
                              </span>
                            ))}
                            {b.device_types.length > 2 && (
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                                +{b.device_types.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{b.plan_interest ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(b.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {selected && (
          <>
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selected.company_name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Başvuru Detayı</p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* İletişim Bilgileri */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  İletişim Bilgileri
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 size={16} className="text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-medium">{selected.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-slate-400 shrink-0" />
                    <a href={`mailto:${selected.email}`} className="text-sky-600 hover:underline">
                      {selected.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-slate-400 shrink-0" />
                    <span className="text-slate-700">{selected.phone}</span>
                  </div>
                  {selected.city && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin size={16} className="text-slate-400 shrink-0" />
                      <span className="text-slate-700">{selected.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <span className="text-slate-500">{formatDate(selected.created_at)}</span>
                  </div>
                </div>
              </section>

              {/* İşletme Bilgileri */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  İşletme Bilgileri
                </h3>
                <div className="space-y-2.5">
                  {selected.device_types && selected.device_types.length > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                      <Package size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Servis Türleri</p>
                        <div className="flex flex-wrap gap-1">
                          {selected.device_types.map((d) => (
                            <span
                              key={d}
                              className="inline-block px-2 py-1 bg-sky-50 text-sky-700 rounded-md text-xs font-medium border border-sky-100"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {selected.monthly_service_count && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <span className="text-slate-700">
                        Aylık servis: <strong>{selected.monthly_service_count}</strong>
                      </span>
                    </div>
                  )}
                  {selected.plan_interest && (
                    <div className="flex items-center gap-3 text-sm">
                      <ClipboardList size={16} className="text-slate-400 shrink-0" />
                      <span className="text-slate-700">
                        İlgilenilen paket: <strong>{selected.plan_interest}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Mesaj */}
              {selected.message && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Mesaj
                  </h3>
                  <div className="flex items-start gap-3 text-sm">
                    <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-700 leading-relaxed">{selected.message}</p>
                  </div>
                </section>
              )}

              {/* Mevcut Durum */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Mevcut Durum
                </h3>
                <StatusBadge status={selected.status} />
              </section>

              {/* Durum Değiştir */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Durumu Güncelle
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setNewStatus(s)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                          newStatus === s
                            ? cn(cfg.bg, cfg.text, cfg.border, 'ring-2 ring-offset-1',
                                s === 'beklemede' ? 'ring-amber-400' :
                                s === 'inceleniyor' ? 'ring-blue-400' :
                                s === 'onaylandi' ? 'ring-green-400' : 'ring-red-400')
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* İç Not */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  İç Not (Sadece admin görebilir)
                </h3>
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Bu başvuruya dair notlarınızı buraya yazın…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                />
              </section>

              {/* Bayi Hesabı Oluştur */}
              {newStatus === 'onaylandi' && (
                <section className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <UserPlus size={18} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Başvuru Onaylandı</p>
                      <p className="text-xs text-green-600 mt-1">
                        Bayi hesabı oluşturmak için Bayi Yönetimi sayfasına gidin.
                      </p>
                      <button
                        onClick={() => {
                          closeDrawer()
                          router.push('/admin/bayiler')
                        }}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserPlus size={14} />
                        Bayi Hesabı Oluştur
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={closeDrawer}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Kaydediliyor…
                  </>
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
