'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Package, Plus, Search, Tag, ShoppingBag, AlertTriangle,
  X, Edit3, Trash2, Eye, LayoutGrid, List, ChevronLeft,
  ChevronRight, TrendingUp, ToggleLeft, ToggleRight,
  Smartphone, Headphones, Wrench
} from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/dashboard/PageHeader'
import {
  getStoreProducts, setStoreProducts, onStoreChange, type StoreProduct
} from '@/lib/store'

type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'stock_desc'
type ViewMode = 'grid' | 'list'

const CATEGORIES = ['Telefon', 'Aksesuar', 'Yedek Parça'] as const
const QUALITIES = ['Sıfır', 'İkinci El', 'Yenilenmiş', 'Yurtdışı', 'Tamirli'] as const

const CATEGORY_COLORS: Record<string, string> = {
  Telefon: 'bg-sky-100 text-sky-700',
  Aksesuar: 'bg-emerald-100 text-emerald-700',
  'Yedek Parça': 'bg-amber-100 text-amber-700',
}

const QUALITY_BADGES: Record<string, string> = {
  'Sıfır': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'İkinci El': 'bg-amber-100 text-amber-700 border-amber-200',
  'Yenilenmiş': 'bg-sky-100 text-sky-700 border-sky-200',
  'Yurtdışı': 'bg-purple-100 text-purple-700 border-purple-200',
  'Tamirli': 'bg-rose-100 text-rose-700 border-rose-200',
}

const formatCurrency = (v: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(v)

const LOW_STOCK_THRESHOLD = 5

type ProductForm = Omit<StoreProduct, 'id' | 'created_at'>

const defaultForm = (): ProductForm => ({
  name: '',
  category: CATEGORIES[0],
  brand: '',
  model: '',
  price: 0,
  cost_price: 0,
  stock_count: 0,
  imei: '',
  quality: 'sifir',
  is_active: true,
  description: '',
})

const QUALITY_TO_STORE: Record<string, StoreProduct['quality']> = {
  'Sıfır': 'sifir', 'İkinci El': 'ikinci_el', 'Yenilenmiş': 'yenilenmis', 'Yurtdışı': 'yurtdisi', 'Tamirli': 'tamirli',
}
const QUALITY_FROM_STORE: Record<StoreProduct['quality'], string> = {
  sifir: 'Sıfır', ikinci_el: 'İkinci El', yenilenmis: 'Yenilenmiş', yurtdisi: 'Yurtdışı', tamirli: 'Tamirli',
}

function toDisplayProduct(p: StoreProduct) {
  return {
    ...p,
    qualityLabel: QUALITY_FROM_STORE[p.quality] || 'Sıfır',
    brand: p.brand || '',
    model: p.model || '',
    imei: p.imei || '',
    description: p.description || '',
  }
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Telefon: <Smartphone className="w-4 h-4" />,
  Aksesuar: <Headphones className="w-4 h-4" />,
  'Yedek Parça': <Wrench className="w-4 h-4" />,
}

export default function MagazaPage() {
  const [mounted, setMounted] = useState(false)
  const [products, setProducts] = useState<ReturnType<typeof toDisplayProduct>[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [qualityFilter, setQualityFilter] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewProduct, setViewProduct] = useState<ReturnType<typeof toDisplayProduct> | null>(null)
  const [form, setForm] = useState(defaultForm())
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const PER_PAGE = 12

  const refresh = useCallback(() => {
    setProducts(getStoreProducts().map(toDisplayProduct))
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    return onStoreChange((m) => { if (!m || m === 'storeProducts') refresh() })
  }, [refresh])

  const persist = (raw: StoreProduct[]) => {
    setStoreProducts(raw)
    setProducts(raw.map(toDisplayProduct))
  }

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter(p => p.is_active).length
    const stockValue = products.reduce((s, p) => s + p.price * p.stock_count, 0)
    const lowStock = products.filter(p => p.stock_count <= LOW_STOCK_THRESHOLD && p.stock_count > 0).length
    return { total, active, stockValue, lowStock }
  }, [products])

  // ─── Filtering & Sorting ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...products]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) result = result.filter(p => p.category === categoryFilter)
    if (qualityFilter) result = result.filter(p => p.qualityLabel === qualityFilter)

    switch (sortOption) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'stock_desc':
        result.sort((a, b) => b.stock_count - a.stock_count)
        break
    }

    return result
  }, [products, search, categoryFilter, qualityFilter, sortOption])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, categoryFilter, qualityFilter, sortOption])

  // ─── CRUD ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null)
    setForm(defaultForm())
    setShowModal(true)
  }

  const openEdit = (p: ReturnType<typeof toDisplayProduct>) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand,
      model: p.model,
      price: p.price,
      cost_price: p.cost_price,
      stock_count: p.stock_count,
      imei: p.imei,
      quality: p.quality,
      is_active: p.is_active,
      description: p.description,
    })
    setShowModal(true)
  }

  const openView = (p: ReturnType<typeof toDisplayProduct>) => {
    setViewProduct(p)
    setShowViewModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Ürün adı zorunlu'); return }
    if (form.price <= 0) { toast.error('Geçerli bir fiyat girin'); return }

    const raw = getStoreProducts()
    if (editingId) {
      persist(raw.map(p => p.id === editingId ? { ...p, ...form } : p))
      toast.success('Ürün güncellendi')
    } else {
      const newProduct: StoreProduct = {
        id: `prod_${Date.now()}`,
        ...form,
        created_at: new Date().toISOString(),
      }
      persist([newProduct, ...raw])
      toast.success('Ürün eklendi')
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    persist(getStoreProducts().filter(p => p.id !== id))
    setDeleteConfirm(null)
    toast.success('Ürün silindi')
  }

  const toggleActive = (id: string) => {
    persist(getStoreProducts().map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p)))
  }

  // ─── Loading State ─────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const profitMargin = (p: { price: number; cost_price: number }) =>
    p.cost_price > 0 ? (((p.price - p.cost_price) / p.cost_price) * 100).toFixed(1) : '—'

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        data-tour="magaza-baslik"
        icon={ShoppingBag}
        title="Mağaza"
        description="Ürün vitrini ve stok yönetimi"
        actions={
          <button data-tour="magaza-urun-ekle-btn" onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Ürün Ekle
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Ürün', value: stats.total, icon: Package, bg: 'bg-sky-50', color: 'text-sky-600' },
          { label: 'Aktif Ürün', value: stats.active, icon: Tag, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Toplam Stok Değeri', value: formatCurrency(stats.stockValue), icon: TrendingUp, bg: 'bg-sky-50', color: 'text-sky-600' },
          { label: 'Düşük Stok Uyarısı', value: stats.lowStock, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
        ].map((card) => (
          <div key={card.label} className="card p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-black mt-1 ${card.color}`}>{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ürün adı, marka, model ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="select text-sm">
              <option value="">Tüm Kategoriler</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} className="select text-sm">
              <option value="">Tüm Kaliteler</option>
              {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <select value={sortOption} onChange={e => setSortOption(e.target.value as SortOption)} className="select text-sm">
              <option value="newest">En Yeni</option>
              <option value="price_asc">Fiyat (Artan)</option>
              <option value="price_desc">Fiyat (Azalan)</option>
              <option value="stock_desc">Stok (Azalan)</option>
            </select>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 transition ${viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 transition ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-16 text-center">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Ürün bulunamadı</p>
          <p className="text-slate-500 text-sm mt-1">Yeni ürün ekleyin veya filtreleri değiştirin</p>
          <button
            onClick={openAdd}
            className="mt-4 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            İlk Ürünü Ekle
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ─────────────────────────────────────────────────── */
        <div data-tour="magaza-urun-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map(product => (
            <div
              key={product.id}
              className={`group bg-slate-800/60 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-500/30 ${!product.is_active ? 'opacity-60' : ''}`}
            >
              {/* Category Strip */}
              <div className={`h-1.5 ${CATEGORY_COLORS[product.category] || 'bg-slate-500'}`} />

              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white truncate text-sm">{product.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {product.brand}{product.model ? ` • ${product.model}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {CATEGORY_ICONS[product.category]}
                  </div>
                </div>

                {/* Price & Stock */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-sky-400">{formatCurrency(product.price)}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.stock_count <= LOW_STOCK_THRESHOLD ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {product.stock_count} adet
                  </span>
                </div>

                {/* Quality Badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${QUALITY_BADGES[product.qualityLabel] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {product.qualityLabel}
                  </span>
                  <button
                    onClick={() => toggleActive(product.id)}
                    className="transition hover:scale-110"
                    title={product.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                  >
                    {product.is_active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-white/5">
                  <button
                    onClick={() => openView(product)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-md transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> Görüntüle
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── List View ─────────────────────────────────────────────────── */
        <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Ürün Adı', 'Kategori', 'Marka / Model', 'Kalite', 'Satış Fiyatı', 'Maliyet', 'Kar Marjı', 'Stok', 'Durum', 'İşlemler'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map(product => (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-700/30 transition ${!product.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{product.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full text-white ${CATEGORY_COLORS[product.category] || 'bg-slate-500'}`}>
                        {CATEGORY_ICONS[product.category]}
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {product.brand}{product.model ? ` / ${product.model}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${QUALITY_BADGES[product.qualityLabel] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {product.qualityLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sky-400 font-semibold whitespace-nowrap">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatCurrency(product.cost_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${Number(profitMargin(product)) > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {profitMargin(product) !== '—' ? `%${profitMargin(product)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.stock_count <= LOW_STOCK_THRESHOLD ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {product.stock_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(product.id)} className="transition hover:scale-110">
                        {product.is_active ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Aktif</span>
                        ) : (
                          <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full">Pasif</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(product)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-md transition" title="Görüntüle">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(product)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition" title="Düzenle">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(product.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition" title="Sil">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-sm text-slate-400">
            Toplam <span className="text-white font-medium">{filtered.length}</span> ürün &bull; Sayfa{' '}
            <span className="text-white font-medium">{page}</span> / {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | string)[]>((acc, n, i, arr) => {
                if (i > 0 && typeof arr[i - 1] === 'number' && (n as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                typeof n === 'string' ? (
                  <span key={`dots-${i}`} className="px-1 text-slate-500">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === n ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit3 className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-sky-400" />}
                {editingId ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ürün Adı */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Ürün Adı <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="Ürün adını girin"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Kalite */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Kalite</label>
                  <select
                    value={form.quality}
                    onChange={e => setForm(f => ({ ...f, quality: (QUALITY_TO_STORE[e.target.value] || 'sifir') as StoreProduct['quality'] }))}
                    className="select"
                  >
                    {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>

                {/* Marka */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="ör: Apple, Samsung"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="ör: iPhone 15 Pro"
                  />
                </div>

                {/* Satış Fiyatı */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Satış Fiyatı (₺) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price || ''}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="0.00"
                  />
                </div>

                {/* Maliyet Fiyatı */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Maliyet Fiyatı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price || ''}
                    onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="0.00"
                  />
                </div>

                {/* Stok Adedi */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Stok Adedi</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_count || ''}
                    onChange={e => setForm(f => ({ ...f, stock_count: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="0"
                  />
                </div>

                {/* IMEI */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">IMEI <span className="text-slate-500">(isteğe bağlı)</span></label>
                  <input
                    type="text"
                    value={form.imei}
                    onChange={e => setForm(f => ({ ...f, imei: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                    placeholder="IMEI numarası"
                  />
                </div>

                {/* Açıklama */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition resize-none"
                    placeholder="Ürün hakkında açıklama"
                  />
                </div>

                {/* Aktif/Pasif Toggle */}
                <div className="md:col-span-2 flex items-center justify-between bg-slate-900/30 border border-white/5 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-white font-medium">Ürün Durumu</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {form.is_active ? 'Ürün aktif olarak satışta görünecek' : 'Ürün pasif, vitrinde görünmeyecek'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="transition hover:scale-110"
                  >
                    {form.is_active ? (
                      <ToggleRight className="w-10 h-10 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || form.price <= 0}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/25"
              >
                {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ───────────────────────────────────────────── */}
      {showViewModal && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowViewModal(false)}>
          <div
            className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Category Strip */}
            <div className={`h-2 rounded-t-2xl ${CATEGORY_COLORS[viewProduct.category] || 'bg-slate-500'}`} />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-400" />
                Ürün Detayı
              </h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {[
                  { label: 'Ürün Adı', value: viewProduct.name },
                  { label: 'Kategori', value: viewProduct.category },
                  { label: 'Marka', value: viewProduct.brand || '—' },
                  { label: 'Model', value: viewProduct.model || '—' },
                  { label: 'Kalite', value: viewProduct.qualityLabel },
                  { label: 'Satış Fiyatı', value: formatCurrency(viewProduct.price) },
                  { label: 'Maliyet Fiyatı', value: formatCurrency(viewProduct.cost_price) },
                  { label: 'Kar Marjı', value: profitMargin(viewProduct) !== '—' ? `%${profitMargin(viewProduct)}` : '—' },
                  { label: 'Stok', value: `${viewProduct.stock_count} adet` },
                  { label: 'IMEI', value: viewProduct.imei || '—' },
                  { label: 'Durum', value: viewProduct.is_active ? 'Aktif' : 'Pasif' },
                  { label: 'Açıklama', value: viewProduct.description || '—' },
                  { label: 'Oluşturulma', value: new Date(viewProduct.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between py-2 border-b border-white/5 last:border-b-0">
                    <span className="text-xs text-slate-400 font-medium">{row.label}</span>
                    <span className="text-sm text-white text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => {
                  setShowViewModal(false)
                  openEdit(viewProduct)
                }}
                className="px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" /> Düzenle
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ürünü Sil</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
