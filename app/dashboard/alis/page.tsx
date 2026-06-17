'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingBag, Plus, Search, TrendingUp, Calendar, Package, DollarSign,
  X, Edit3, Trash2, FileText, Phone, Tag, Hash, CreditCard, Truck,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle
} from 'lucide-react'
import { getPurchases, setPurchases, recordPurchase, onStoreChange, type Purchase } from '@/lib/store'

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'telefon', label: 'Telefon' },
  { value: 'aksesuar', label: 'Aksesuar' },
  { value: 'yedek_parca', label: 'Yedek Parça' },
  { value: 'ikinci_el', label: 'İkinci El' },
]

const QUALITY_OPTIONS = [
  { value: 'sifir', label: 'Sıfır' },
  { value: 'ikinci_el', label: 'İkinci El' },
  { value: 'yenilenmis', label: 'Yenilenmiş' },
  { value: 'yurtdisi', label: 'Yurtdışı' },
  { value: 'tamirli', label: 'Tamirli' },
]

const PAYMENT_OPTIONS = [
  { value: 'nakit', label: 'Nakit', icon: '💵' },
  { value: 'kredi_karti', label: 'Kredi Kartı', icon: '💳' },
  { value: 'havale', label: 'Havale', icon: '🏦' },
  { value: 'eft', label: 'EFT', icon: '🏦' },
  { value: 'veresiye', label: 'Veresiye', icon: '📝' },
]

const DEVICE_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo', 'OnePlus',
  'Realme', 'Honor', 'Google', 'Motorola', 'Sony', 'Nokia', 'LG',
  'Lenovo', 'Asus', 'Diğer',
]

const PAGE_SIZE = 10

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getCategoryLabel(val: string): string {
  return CATEGORY_OPTIONS.find(c => c.value === val)?.label ?? val
}

function getQualityLabel(val: string): string {
  return QUALITY_OPTIONS.find(q => q.value === val)?.label ?? val
}

function getPaymentLabel(val: string): string {
  return PAYMENT_OPTIONS.find(p => p.value === val)?.label ?? val
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

function validateIMEI(imei: string): boolean {
  if (!imei || imei.length !== 15 || !/^\d{15}$/.test(imei)) return false
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i])
    if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

// ─── Empty Form State ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  supplier_name: '',
  supplier_phone: '',
  category: 'telefon' as Purchase['category'],
  quality: 'sifir' as Purchase['quality'],
  device_brand: '',
  device_model: '',
  imei: '',
  quantity: 1,
  buy_price: 0,
  payment_method: 'nakit',
  invoice_no: '',
  notes: '',
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlisPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [mounted, setMounted] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [qualityFilter, setQualityFilter] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ─── Data Load ──────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    setPurchases(getPurchases())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    return onStoreChange(m => { if (!m || m === 'purchases' || m === 'all') refresh() })
  }, [refresh])

  // ─── Filtering ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...purchases]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.supplier_name.toLowerCase().includes(q) ||
        (p.device_brand && p.device_brand.toLowerCase().includes(q)) ||
        (p.device_model && p.device_model.toLowerCase().includes(q)) ||
        (p.imei && p.imei.includes(q)) ||
        (p.invoice_no && p.invoice_no.toLowerCase().includes(q))
      )
    }

    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter)
    }

    if (qualityFilter) {
      result = result.filter(p => p.quality === qualityFilter)
    }

    // Sort by date descending (newest first)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return result
  }, [purchases, search, categoryFilter, qualityFilter])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, qualityFilter])

  // ─── Pagination ─────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = purchases.length
    const todayCount = purchases.filter(p => isToday(p.created_at)).length
    const totalCost = purchases.reduce((sum, p) => sum + p.total_cost, 0)
    const avgPrice = total > 0 ? purchases.reduce((sum, p) => sum + p.buy_price, 0) / total : 0
    return { total, todayCount, totalCost, avgPrice }
  }, [purchases])

  // ─── Form Validation ───────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.supplier_name.trim()) {
      errors.supplier_name = 'Tedarikçi adı zorunludur'
    }

    if (form.quantity < 1) {
      errors.quantity = 'Adet en az 1 olmalıdır'
    }

    if (form.buy_price <= 0) {
      errors.buy_price = 'Birim fiyat 0\'dan büyük olmalıdır'
    }

    if (form.category === 'telefon' && form.imei && form.imei.trim()) {
      if (form.imei.length !== 15 || !/^\d{15}$/.test(form.imei)) {
        errors.imei = 'IMEI 15 haneli rakamlardan oluşmalıdır'
      } else if (!validateIMEI(form.imei)) {
        errors.imei = 'Geçersiz IMEI numarası'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ─── CRUD Operations ───────────────────────────────────────────────────

  const handleSave = () => {
    if (!validateForm()) return

    const list = getPurchases()
    const totalCost = form.quantity * form.buy_price

    if (editingId) {
      const next = list.map(p =>
        p.id === editingId
          ? {
              ...p,
              supplier_name: form.supplier_name.trim(),
              supplier_phone: form.supplier_phone.trim() || undefined,
              category: form.category,
              quality: form.quality,
              device_brand: form.category === 'telefon' ? form.device_brand.trim() || undefined : undefined,
              device_model: form.category === 'telefon' ? form.device_model.trim() || undefined : undefined,
              imei: form.category === 'telefon' ? form.imei.trim() || undefined : undefined,
              quantity: form.quantity,
              buy_price: form.buy_price,
              total_cost: totalCost,
              payment_method: form.payment_method,
              invoice_no: form.invoice_no.trim() || undefined,
              notes: form.notes.trim() || undefined,
            }
          : p
      )
      setPurchases(next)
    } else {
      recordPurchase({
        supplier_name: form.supplier_name.trim(),
        supplier_phone: form.supplier_phone.trim() || undefined,
        category: form.category,
        quality: form.quality,
        device_brand: form.category === 'telefon' ? form.device_brand.trim() || undefined : undefined,
        device_model: form.category === 'telefon' ? form.device_model.trim() || undefined : undefined,
        imei: form.category === 'telefon' ? form.imei.trim() || undefined : undefined,
        quantity: form.quantity,
        buy_price: form.buy_price,
        payment_method: form.payment_method,
        invoice_no: form.invoice_no.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
    }

    refresh()
    closeModal()
  }

  const handleDelete = (id: string) => {
    setPurchases(getPurchases().filter(p => p.id !== id))
    refresh()
    setDeleteId(null)
  }

  const openEdit = (purchase: Purchase) => {
    setEditingId(purchase.id)
    setForm({
      supplier_name: purchase.supplier_name,
      supplier_phone: purchase.supplier_phone || '',
      category: purchase.category,
      quality: purchase.quality,
      device_brand: purchase.device_brand || '',
      device_model: purchase.device_model || '',
      imei: purchase.imei || '',
      quantity: purchase.quantity,
      buy_price: purchase.buy_price,
      payment_method: purchase.payment_method,
      invoice_no: purchase.invoice_no || '',
      notes: purchase.notes || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormErrors({})
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormErrors({})
  }

  // ─── Computed Values ────────────────────────────────────────────────────

  const totalCostCalc = form.quantity * form.buy_price

  // ─── Loading ────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div data-tour="alis-baslik">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
          </div>
          Alış Yönetimi
        </h1>
        <p className="text-slate-400 mt-1">Tedarikçi alışlarınızı takip edin ve yönetin</p>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Alış */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-sky-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Toplam Alış</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-sky-500/20 rounded-xl">
              <Package className="w-5 h-5 text-sky-400" />
            </div>
          </div>
        </div>

        {/* Bugünkü Alışlar */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Bugünkü Alışlar</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.todayCount}</p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Toplam Maliyet */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Toplam Maliyet</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalCost)}</p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Ortalama Birim Fiyat */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-sky-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Ort. Birim Fiyat</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.avgPrice)}</p>
            </div>
            <div className="p-3 bg-sky-500/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-sky-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tedarikçi, marka, model veya IMEI ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">Tüm Kategoriler</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Quality Filter */}
            <select
              value={qualityFilter}
              onChange={e => setQualityFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">Tüm Kaliteler</option>
              {QUALITY_OPTIONS.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>

          {/* New Purchase Button */}
          <button
            data-tour="alis-yeni-btn"
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Yeni Alış
          </button>
        </div>
      </div>

      {/* ── Data Table ─────────────────────────────────────────────────────── */}
      <div data-tour="alis-tablo" className="bg-slate-800/60 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Tarih</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Tedarikçi</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Ürün</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Kategori</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Kalite</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Adet</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Birim Fiyat</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Toplam</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">IMEI</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">Fatura No</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-4">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-700/50 rounded-2xl">
                        <ShoppingBag className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-sm">
                        {search || categoryFilter || qualityFilter
                          ? 'Arama kriterlerine uygun alış bulunamadı'
                          : 'Henüz alış kaydı bulunmuyor'}
                      </p>
                      {!search && !categoryFilter && !qualityFilter && (
                        <button
                          onClick={openNew}
                          className="mt-2 flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          İlk Alışı Ekle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(purchase => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <td className="px-5 py-3.5 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(purchase.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-white">{purchase.supplier_name}</p>
                        {purchase.supplier_phone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {purchase.supplier_phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">
                      {purchase.device_brand && purchase.device_model
                        ? `${purchase.device_brand} ${purchase.device_model}`
                        : purchase.device_brand || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                        purchase.category === 'telefon' ? 'bg-sky-500/15 text-sky-400' :
                        purchase.category === 'aksesuar' ? 'bg-purple-500/15 text-purple-400' :
                        purchase.category === 'yedek_parca' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {getCategoryLabel(purchase.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                        purchase.quality === 'sifir' ? 'bg-emerald-500/15 text-emerald-400' :
                        purchase.quality === 'ikinci_el' ? 'bg-sky-500/15 text-sky-400' :
                        purchase.quality === 'yenilenmis' ? 'bg-amber-500/15 text-amber-400' :
                        purchase.quality === 'yurtdisi' ? 'bg-purple-500/15 text-purple-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {getQualityLabel(purchase.quality)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white font-medium text-right">
                      {purchase.quantity}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300 text-right whitespace-nowrap">
                      {formatCurrency(purchase.buy_price)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white font-semibold text-right whitespace-nowrap">
                      {formatCurrency(purchase.total_cost)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">
                      {purchase.imei || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">
                      {purchase.invoice_no || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(purchase)}
                          className="p-2 hover:bg-sky-500/20 rounded-lg text-slate-400 hover:text-sky-400 transition-all"
                          title="Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(purchase.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
            <p className="text-sm text-slate-400">
              Toplam <span className="text-white font-medium">{filtered.length}</span> kayıt &middot; Sayfa{' '}
              <span className="text-white font-medium">{currentPage}</span> / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Alışı Sil</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Bu alış kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? (
                  <>
                    <Edit3 className="w-5 h-5 text-sky-400" />
                    Alış Düzenle
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-sky-400" />
                    Yeni Alış Kaydı
                  </>
                )}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Tedarikçi Bilgileri */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-400" />
                  Tedarikçi Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Tedarikçi Adı <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.supplier_name}
                      onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                      placeholder="Tedarikçi adı girin"
                      className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        formErrors.supplier_name
                          ? 'border-red-500/50 focus:ring-red-500/40'
                          : 'border-white/10 focus:ring-sky-500/40'
                      }`}
                    />
                    {formErrors.supplier_name && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.supplier_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Tedarikçi Telefon</label>
                    <input
                      type="text"
                      value={form.supplier_phone}
                      onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))}
                      placeholder="0 5XX XXX XX XX"
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Ürün Bilgileri */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-400" />
                  Ürün Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Kategori</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as Purchase['category'] }))}
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Kalite</label>
                    <select
                      value={form.quality}
                      onChange={e => setForm(f => ({ ...f, quality: e.target.value as Purchase['quality'] }))}
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                    >
                      {QUALITY_OPTIONS.map(q => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Phone Fields */}
                {form.category === 'telefon' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Marka</label>
                      <select
                        value={form.device_brand}
                        onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Marka Seçin</option>
                        {DEVICE_BRANDS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Model</label>
                      <input
                        type="text"
                        value={form.device_model}
                        onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))}
                        placeholder="ör: iPhone 15 Pro"
                        className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">IMEI</label>
                      <input
                        type="text"
                        value={form.imei}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 15)
                          setForm(f => ({ ...f, imei: v }))
                        }}
                        placeholder="15 haneli IMEI"
                        maxLength={15}
                        className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all font-mono ${
                          formErrors.imei
                            ? 'border-red-500/50 focus:ring-red-500/40'
                            : 'border-white/10 focus:ring-sky-500/40'
                        }`}
                      />
                      {formErrors.imei && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.imei}
                        </p>
                      )}
                      {form.imei.length === 15 && !formErrors.imei && validateIMEI(form.imei) && (
                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Geçerli IMEI
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fiyat Bilgileri */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-sky-400" />
                  Fiyat Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Adet <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      min={1}
                      className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all ${
                        formErrors.quantity
                          ? 'border-red-500/50 focus:ring-red-500/40'
                          : 'border-white/10 focus:ring-sky-500/40'
                      }`}
                    />
                    {formErrors.quantity && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.quantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Birim Fiyat (₺) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.buy_price || ''}
                      onChange={e => setForm(f => ({ ...f, buy_price: parseFloat(e.target.value) || 0 }))}
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        formErrors.buy_price
                          ? 'border-red-500/50 focus:ring-red-500/40'
                          : 'border-white/10 focus:ring-sky-500/40'
                      }`}
                    />
                    {formErrors.buy_price && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.buy_price}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Toplam (₺)</label>
                    <div className="w-full px-4 py-2.5 bg-slate-900/40 border border-white/5 rounded-xl text-sm text-emerald-400 font-semibold">
                      {formatCurrency(totalCostCalc)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ödeme ve Fatura */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  Ödeme & Fatura
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Ödeme Yöntemi</label>
                    <select
                      value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all appearance-none cursor-pointer"
                    >
                      {PAYMENT_OPTIONS.map(p => (
                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Fatura No</label>
                    <input
                      type="text"
                      value={form.invoice_no}
                      onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))}
                      placeholder="Fatura numarası"
                      className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Notlar
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ek notlar (isteğe bağlı)"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
