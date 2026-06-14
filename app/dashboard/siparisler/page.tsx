'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ShoppingBag, Plus, Search, X, Trash2, Edit3, Eye,
  Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, ChevronUp,
  CreditCard, Banknote, Hash, Phone, User, FileText, Calendar,
  ArrowLeft, ArrowRight, AlertTriangle, MoreVertical, RefreshCw
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface CustomerOrder {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  items: OrderItem[]
  total: number
  status: 'beklemede' | 'onaylandi' | 'hazirlaniyor' | 'kargoda' | 'teslim_edildi' | 'iptal'
  payment_status: 'odenmedi' | 'kismi' | 'odendi'
  payment_method: string
  notes: string
  created_at: string
  updated_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORE_KEY = 'servissoft_store'

const STATUS_CONFIG: Record<CustomerOrder['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  beklemede:     { label: 'Beklemede',     color: 'text-amber-700',   bg: 'bg-amber-100',  icon: Clock },
  onaylandi:     { label: 'Onaylandı',     color: 'text-blue-700',    bg: 'bg-blue-100',   icon: CheckCircle },
  hazirlaniyor:  { label: 'Hazırlanıyor',  color: 'text-sky-700',  bg: 'bg-sky-100', icon: Package },
  kargoda:       { label: 'Kargoda',       color: 'text-purple-700',  bg: 'bg-purple-100', icon: Truck },
  teslim_edildi: { label: 'Teslim Edildi', color: 'text-emerald-700', bg: 'bg-emerald-100',icon: CheckCircle },
  iptal:         { label: 'İptal',         color: 'text-red-700',     bg: 'bg-red-100',    icon: XCircle },
}

const PAYMENT_STATUS_CONFIG: Record<CustomerOrder['payment_status'], { label: string; color: string; bg: string }> = {
  odenmedi: { label: 'Ödenmedi', color: 'text-red-700',     bg: 'bg-red-100' },
  kismi:    { label: 'Kısmi',    color: 'text-amber-700',   bg: 'bg-amber-100' },
  odendi:   { label: 'Ödendi',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

const STATUS_OPTIONS: CustomerOrder['status'][] = ['beklemede', 'onaylandi', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal']
const PAYMENT_OPTIONS: CustomerOrder['payment_status'][] = ['odenmedi', 'kismi', 'odendi']
const PAYMENT_METHODS = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Kapıda Ödeme']

const ITEMS_PER_PAGE = 10

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function generateOrderNo(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `SIP-${digits}`
}

function formatCurrency(val: number): string {
  return val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getStore(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch { return {} }
}

function getOrders(): CustomerOrder[] {
  const store = getStore()
  return (store.customerOrders as CustomerOrder[]) || []
}

function saveOrders(orders: CustomerOrder[]): void {
  const store = getStore()
  store.customerOrders = orders
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

// ─── Empty Form State ───────────────────────────────────────────────────────

const EMPTY_ITEM: OrderItem = { name: '', quantity: 1, price: 0 }

interface OrderForm {
  customer_name: string
  customer_phone: string
  items: OrderItem[]
  payment_method: string
  payment_status: CustomerOrder['payment_status']
  notes: string
}

const EMPTY_FORM: OrderForm = {
  customer_name: '',
  customer_phone: '',
  items: [{ ...EMPTY_ITEM }],
  payment_method: PAYMENT_METHODS[0],
  payment_status: 'odenmedi',
  notes: '',
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SiparislerPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [mounted, setMounted] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [paymentFilter, setPaymentFilter] = useState<string>('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalStep, setModalStep] = useState(1)
  const [form, setForm] = useState<OrderForm>({ ...EMPTY_FORM })

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Status dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ─── Load Data ──────────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    setOrders(getOrders())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORE_KEY) refresh()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refresh])

  // ─── Filtered & Paginated Data ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase()
      const matchSearch = !search ||
        o.order_no.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      const matchStatus = !statusFilter || o.status === statusFilter
      const matchPayment = !paymentFilter || o.payment_status === paymentFilter
      return matchSearch && matchStatus && matchPayment
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orders, search, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, paymentFilter])

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = orders.length
    const bekleyen = orders.filter(o => o.status === 'beklemede' || o.status === 'onaylandi' || o.status === 'hazirlaniyor').length
    const kargoda = orders.filter(o => o.status === 'kargoda').length
    const teslim = orders.filter(o => o.status === 'teslim_edildi').length
    return { total, bekleyen, kargoda, teslim }
  }, [orders])

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const formTotal = form.items.reduce((s, i) => s + (i.quantity * i.price), 0)

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] })
    setModalStep(1)
    setShowModal(true)
  }

  const openEdit = (order: CustomerOrder) => {
    setEditingId(order.id)
    setForm({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      items: order.items.map(i => ({ ...i })),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      notes: order.notes,
    })
    setModalStep(1)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setModalStep(1)
  }

  const validateStep1 = (): boolean => {
    if (!form.customer_name.trim()) { toast.error('Müşteri adı zorunludur'); return false }
    if (!form.customer_phone.trim()) { toast.error('Telefon numarası zorunludur'); return false }
    if (form.customer_phone.replace(/\D/g, '').length < 10) { toast.error('Geçerli bir telefon numarası giriniz'); return false }
    return true
  }

  const validateStep2 = (): boolean => {
    const validItems = form.items.filter(i => i.name.trim())
    if (validItems.length === 0) { toast.error('En az bir ürün eklemelisiniz'); return false }
    for (const item of validItems) {
      if (item.quantity < 1) { toast.error(`"${item.name}" için adet en az 1 olmalıdır`); return false }
      if (item.price <= 0) { toast.error(`"${item.name}" için birim fiyat giriniz`); return false }
    }
    return true
  }

  const handleSave = () => {
    if (!validateStep2()) return
    const validItems = form.items.filter(i => i.name.trim())
    const total = validItems.reduce((s, i) => s + i.quantity * i.price, 0)

    const now = new Date().toISOString()
    const allOrders = getOrders()

    if (editingId) {
      const updated = allOrders.map(o => o.id === editingId ? {
        ...o,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        items: validItems,
        total,
        payment_method: form.payment_method,
        payment_status: form.payment_status,
        notes: form.notes.trim(),
        updated_at: now,
      } : o)
      saveOrders(updated)
      toast.success('Sipariş güncellendi')
    } else {
      const newOrder: CustomerOrder = {
        id: uid(),
        order_no: generateOrderNo(),
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        items: validItems,
        total,
        status: 'beklemede',
        payment_status: form.payment_status,
        payment_method: form.payment_method,
        notes: form.notes.trim(),
        created_at: now,
        updated_at: now,
      }
      saveOrders([...allOrders, newOrder])
      toast.success(`Sipariş ${newOrder.order_no} oluşturuldu`)
    }

    refresh()
    closeModal()
  }

  const handleDelete = (id: string) => {
    const allOrders = getOrders().filter(o => o.id !== id)
    saveOrders(allOrders)
    refresh()
    setDeleteConfirmId(null)
    toast.success('Sipariş silindi')
  }

  const handleStatusChange = (id: string, newStatus: CustomerOrder['status']) => {
    const allOrders = getOrders().map(o => o.id === id ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o)
    saveOrders(allOrders)
    refresh()
    setStatusDropdownId(null)
    toast.success(`Durum "${STATUS_CONFIG[newStatus].label}" olarak güncellendi`)
  }

  // ─── Item Row Handlers ──────────────────────────────────────────────────────

  const addItemRow = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const removeItemRow = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-sky-400" />
            </div>
            Müşteri Siparişleri
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Sipariş oluşturma, takip ve yönetim</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-all hover:scale-105 shadow-lg shadow-sky-500/25">
          <Plus className="w-4 h-4" /> Yeni Sipariş
        </button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Sipariş', value: stats.total, icon: ShoppingBag, color: 'from-sky-500 to-sky-600', iconBg: 'bg-sky-400/20' },
          { label: 'Bekleyen', value: stats.bekleyen, icon: Clock, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-400/20' },
          { label: 'Kargoda', value: stats.kargoda, icon: Truck, color: 'from-purple-500 to-purple-600', iconBg: 'bg-purple-400/20' },
          { label: 'Teslim Edilen', value: stats.teslim, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-400/20' },
        ].map(card => (
          <div key={card.label} className="relative overflow-hidden bg-slate-800 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <card.icon className="w-6 h-6 text-white/80" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Bar ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sipariş no, müşteri adı veya telefon ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all min-w-[160px] appearance-none cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all min-w-[140px] appearance-none cursor-pointer"
          >
            <option value="">Tüm Ödemeler</option>
            {PAYMENT_OPTIONS.map(p => (
              <option key={p} value={p}>{PAYMENT_STATUS_CONFIG[p].label}</option>
            ))}
          </select>
        </div>

        {/* Active filters indicator */}
        {(search || statusFilter || paymentFilter) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            <span className="text-xs text-slate-500">Filtreler:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-lg text-xs">
                &quot;{search}&quot;
                <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-lg text-xs">
                {STATUS_CONFIG[statusFilter as CustomerOrder['status']].label}
                <button onClick={() => setStatusFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {paymentFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-lg text-xs">
                {PAYMENT_STATUS_CONFIG[paymentFilter as CustomerOrder['payment_status']].label}
                <button onClick={() => setPaymentFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={() => { setSearch(''); setStatusFilter(''); setPaymentFilter('') }} className="text-xs text-slate-500 hover:text-white ml-auto flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Temizle
            </button>
          </div>
        )}
      </div>

      {/* ── Orders Table ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Sipariş bulunamadı</p>
            <p className="text-sm mt-1">Yeni sipariş eklemek için yukarıdaki butonu kullanın</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-[120px_1fr_1fr_120px_130px_110px_140px_80px] gap-4 px-6 py-3 bg-slate-900/50 border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Sipariş No</span>
              <span>Müşteri</span>
              <span>Ürünler</span>
              <span className="text-right">Toplam</span>
              <span className="text-center">Durum</span>
              <span className="text-center">Ödeme</span>
              <span>Tarih</span>
              <span className="text-center">İşlem</span>
            </div>

            {/* Table Rows */}
            {paginated.map(order => {
              const stCfg = STATUS_CONFIG[order.status]
              const payCfg = PAYMENT_STATUS_CONFIG[order.payment_status]
              const isExpanded = expandedId === order.id

              return (
                <div key={order.id} className="border-b border-white/5 last:border-0">
                  {/* Main Row */}
                  <div
                    className="grid grid-cols-1 lg:grid-cols-[120px_1fr_1fr_120px_130px_110px_140px_80px] gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {/* Order No */}
                    <div className="flex items-center gap-2">
                      <span className="lg:hidden text-xs text-slate-500 w-20">Sipariş No:</span>
                      <span className="font-mono text-sm font-semibold text-sky-400">{order.order_no}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500 hidden lg:block" /> : <ChevronDown className="w-3 h-3 text-slate-500 hidden lg:block" />}
                    </div>

                    {/* Customer */}
                    <div>
                      <span className="lg:hidden text-xs text-slate-500">Müşteri: </span>
                      <p className="text-sm text-white font-medium">{order.customer_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </p>
                    </div>

                    {/* Items Summary */}
                    <div>
                      <span className="lg:hidden text-xs text-slate-500">Ürünler: </span>
                      <p className="text-sm text-slate-300 truncate">
                        {order.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.items.length} kalem</p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <span className="lg:hidden text-xs text-slate-500">Toplam: </span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(order.total)}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-start lg:justify-center relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setStatusDropdownId(statusDropdownId === order.id ? null : order.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${stCfg.bg} ${stCfg.color} hover:opacity-80 transition-opacity`}
                      >
                        <stCfg.icon className="w-3 h-3" />
                        {stCfg.label}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>

                      {/* Status Dropdown */}
                      {statusDropdownId === order.id && (
                        <div className="absolute top-full mt-1 z-50 bg-slate-800 border border-white/10 rounded-xl shadow-xl py-1 min-w-[160px]">
                          {STATUS_OPTIONS.map(s => {
                            const cfg = STATUS_CONFIG[s]
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(order.id, s)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors ${order.status === s ? 'text-sky-400 font-medium' : 'text-slate-300'}`}
                              >
                                <cfg.icon className="w-3.5 h-3.5" />
                                {cfg.label}
                                {order.status === s && <CheckCircle className="w-3 h-3 ml-auto" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Payment Badge */}
                    <div className="flex justify-start lg:justify-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${payCfg.bg} ${payCfg.color}`}>
                        {payCfg.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div>
                      <span className="lg:hidden text-xs text-slate-500">Tarih: </span>
                      <p className="text-sm text-slate-400">{formatDate(order.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(order)}
                        className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(order.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-slate-900/30 border-t border-white/5">
                      <div className="grid lg:grid-cols-3 gap-6 pt-4">
                        {/* Items Table */}
                        <div className="lg:col-span-2">
                          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-sky-400" /> Sipariş Kalemleri
                          </h4>
                          <div className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/5">
                                  <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Ürün</th>
                                  <th className="text-center px-4 py-2 text-xs text-slate-500 font-medium">Adet</th>
                                  <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Birim Fiyat</th>
                                  <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Ara Toplam</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, idx) => (
                                  <tr key={idx} className="border-b border-white/5 last:border-0">
                                    <td className="px-4 py-2.5 text-white">{item.name}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-300">{item.quantity}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-300">{formatCurrency(item.price)}</td>
                                    <td className="px-4 py-2.5 text-right text-white font-medium">{formatCurrency(item.quantity * item.price)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-900/50">
                                  <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-slate-300">Genel Toplam:</td>
                                  <td className="px-4 py-2.5 text-right text-lg font-bold text-sky-400">{formatCurrency(order.total)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Order Info */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-400" /> Sipariş Detayları
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Ödeme Yöntemi</span>
                              <span className="text-white font-medium">{order.payment_method}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Oluşturulma</span>
                              <span className="text-slate-300">{formatDate(order.created_at)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-white/5">
                              <span className="text-slate-500">Güncelleme</span>
                              <span className="text-slate-300">{formatDate(order.updated_at)}</span>
                            </div>
                            {order.notes && (
                              <div className="pt-2">
                                <p className="text-slate-500 text-xs mb-1">Notlar</p>
                                <p className="text-slate-300 bg-slate-800/50 rounded-lg p-3 text-sm border border-white/5">{order.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-slate-500">
                  Toplam {filtered.length} sipariş, sayfa {currentPage}/{totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3),
                    Math.min(totalPages, currentPage + 2)
                  ).map(p => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === currentPage ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Siparişi Sil</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">Bu siparişi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                İptal
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close status dropdown on outside click ────────────────────────── */}
      {statusDropdownId && (
        <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownId(null)} />
      )}

      {/* ── Add/Edit Modal (Multi-step) ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Siparişi Düzenle' : 'Yeni Sipariş'}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {modalStep === 1 ? 'Adım 1/3 — Müşteri Bilgileri' : modalStep === 2 ? 'Adım 2/3 — Ürün Ekle' : 'Adım 3/3 — Ödeme & Notlar'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className={`flex-1 h-1.5 rounded-full transition-all ${step <= modalStep ? 'bg-sky-500' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* ── Step 1: Customer Info ──────────────────────────── */}
              {modalStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      <User className="w-3.5 h-3.5 inline mr-1.5 text-sky-400" />
                      Müşteri Adı <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                      placeholder="Müşteri adı soyadı"
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      <Phone className="w-3.5 h-3.5 inline mr-1.5 text-sky-400" />
                      Telefon <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.customer_phone}
                      onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                      placeholder="05XX XXX XX XX"
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Items ─────────────────────────────────── */}
              {modalStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-sky-400" />
                      Sipariş Kalemleri
                    </h4>
                    <button onClick={addItemRow} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-all">
                      <Plus className="w-3 h-3" /> Kalem Ekle
                    </button>
                  </div>

                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_120px_36px] gap-2 items-end bg-slate-900/30 p-3 rounded-xl border border-white/5">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Ürün Adı</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          placeholder="Ürün adı"
                          className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Adet</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Birim Fiyat (₺)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price || ''}
                          onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                        />
                      </div>
                      <div>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItemRow(idx)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Total Preview */}
                  <div className="flex items-center justify-between p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl mt-4">
                    <span className="text-sm font-medium text-slate-300">Toplam Tutar</span>
                    <span className="text-xl font-bold text-sky-400">{formatCurrency(formTotal)}</span>
                  </div>
                </div>
              )}

              {/* ── Step 3: Payment & Notes ───────────────────────── */}
              {modalStep === 3 && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 bg-slate-900/30 rounded-xl border border-white/5 space-y-2">
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Müşteri:</span>{' '}
                      <span className="text-white font-medium">{form.customer_name}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Telefon:</span>{' '}
                      <span className="text-white">{form.customer_phone}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Kalem Sayısı:</span>{' '}
                      <span className="text-white">{form.items.filter(i => i.name.trim()).length}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      <span className="text-slate-500">Toplam:</span>{' '}
                      <span className="text-sky-400 font-bold">{formatCurrency(formTotal)}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      <CreditCard className="w-3.5 h-3.5 inline mr-1.5 text-sky-400" />
                      Ödeme Yöntemi
                    </label>
                    <select
                      value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      <Banknote className="w-3.5 h-3.5 inline mr-1.5 text-sky-400" />
                      Ödeme Durumu
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_OPTIONS.map(p => {
                        const cfg = PAYMENT_STATUS_CONFIG[p]
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, payment_status: p }))}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                              form.payment_status === p
                                ? 'bg-sky-500/10 border-sky-500/50 text-sky-400'
                                : 'bg-slate-900/50 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      <FileText className="w-3.5 h-3.5 inline mr-1.5 text-sky-400" />
                      Notlar
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      placeholder="Sipariş ile ilgili notlar..."
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <div>
                {modalStep > 1 && (
                  <button onClick={() => setModalStep(s => s - 1)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <ArrowLeft className="w-4 h-4" /> Geri
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  İptal
                </button>
                {modalStep < 3 ? (
                  <button
                    onClick={() => {
                      if (modalStep === 1 && !validateStep1()) return
                      if (modalStep === 2 && !validateStep2()) return
                      setModalStep(s => s + 1)
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-all"
                  >
                    İleri <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {editingId ? 'Güncelle' : 'Sipariş Oluştur'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
