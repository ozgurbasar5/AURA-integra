'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Package, Plus, Search, AlertTriangle, X,
  Download, BarChart3, TrendingDown, ArrowDownCircle, Printer, ArrowRightLeft
} from 'lucide-react'
import { PART_CATEGORIES } from '@/lib/constants'
import { formatCurrency } from '@/lib/validators'
import {
  getStock, getFinanceSummary, onStoreChange, getBranches,
  type StockItem
} from '@/lib/store'
import {
  loadStockFromApi, addStockItemViaApi, receiveStockViaApi,
} from '@/lib/stock-bridge'
import { stockLabelFromItem, generateStockBarcode } from '@/lib/barcode-labels'

const BarcodeLabelSheet = dynamic(() => import('@/components/labels/BarcodeLabelSheet'), { ssr: false })

export default function StokPage() {
  const [stock, setStockData] = useState<StockItem[]>([])
  const [summary, setSummary] = useState({ totalStockValue: 0, criticalStockCount: 0, totalStockItems: 0, totalStockQty: 0, totalGelir: 0, totalGider: 0, netKar: 0, kasaBakiye: 0 })
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<'' | 'critical' | 'ok'>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [receiveQty, setReceiveQty] = useState('')
  const [mounted, setMounted] = useState(false)
  const [printLabels, setPrintLabels] = useState<ReturnType<typeof stockLabelFromItem>[] | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transfers, setTransfers] = useState<Array<{
    id: string; qty: number; note?: string; created_at: string
    from_branch?: { name: string }; to_branch?: { name: string }; part?: { name: string }
  }>>([])
  const [transferForm, setTransferForm] = useState({ from_branch_id: '', to_branch_id: '', part_id: '', qty: '', note: '' })
  const branches = getBranches()

  // Add part form
  const [newPart, setNewPart] = useState({ name: '', barcode: generateStockBarcode(), category: PART_CATEGORIES[0], buy_price: '', sell_price: '', min_stock: '5', supplier: '' })

  const refresh = useCallback(() => {
    setStockData(getStock())
    setSummary(getFinanceSummary())
  }, [])

  useEffect(() => {
    setMounted(true)
    void loadStockFromApi().then(() => refresh())
    void fetch('/api/tenant/stock/transfer', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(j => { if (j.items) setTransfers(j.items) })
      .catch(() => {})
    const unsub = onStoreChange((mod) => {
      if (mod === 'stock' || mod === 'finance') refresh()
    })
    return unsub
  }, [refresh])

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = stock.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
    const matchCat = !categoryFilter || p.category === categoryFilter
    const matchStock = !stockFilter || (stockFilter === 'critical' ? p.stock_qty <= p.min_stock : p.stock_qty > p.min_stock)
    return matchSearch && matchCat && matchStock
  })

  const categories = [...new Set(stock.map(p => p.category))]

  const handleAddPart = async () => {
    if (!newPart.name.trim()) {
      toast.error('Parça adı zorunlu')
      return
    }
    const buyPrice = parseFloat(newPart.buy_price) || 0
    const sellPrice = newPart.sell_price ? parseFloat(newPart.sell_price) : buyPrice
    try {
      const created = await addStockItemViaApi({
        name: newPart.name.trim(),
        barcode: newPart.barcode || generateStockBarcode(),
        category: newPart.category,
        compatible_brands: [],
        stock_qty: 0,
        min_stock: parseInt(newPart.min_stock) || 5,
        buy_price: buyPrice,
        sell_price: sellPrice,
        supplier: newPart.supplier.trim(),
      })
      setPrintLabels([stockLabelFromItem(created)])
      toast.success(`"${newPart.name}" parça eklendi`)
      setShowAddModal(false)
      setNewPart({ name: '', barcode: generateStockBarcode(), category: PART_CATEGORIES[0], buy_price: '', sell_price: '', min_stock: '5', supplier: '' })
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Parça eklenemedi')
    }
  }

  const handleReceiveStock = async () => {
    if (!selectedItem || !receiveQty) return
    const qty = parseInt(receiveQty)
    if (qty <= 0) { toast.error('Geçerli bir adet girin'); return }
    const totalCost = qty * selectedItem.buy_price
    try {
      await receiveStockViaApi(selectedItem.id, qty, totalCost, selectedItem.supplier, selectedItem.name)
      toast.success(`${qty} adet "${selectedItem.name}" stoğa eklendi. Maliyet: ${formatCurrency(totalCost)} → Finansa gider olarak yansıdı ✅`)
      setShowReceiveModal(false)
      setSelectedItem(null)
      setReceiveQty('')
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stok girişi başarısız')
    }
  }

  async function handleTransfer() {
    const qty = parseInt(transferForm.qty)
    if (!transferForm.from_branch_id || !transferForm.to_branch_id || !transferForm.part_id) {
      toast.error('Kaynak, hedef şube ve parça seçin')
      return
    }
    if (!qty || qty <= 0) {
      toast.error('Geçerli adet girin')
      return
    }
    try {
      const res = await fetch('/api/tenant/stock/transfer', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transferForm, qty }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Transfer başarısız')
      toast.success('Şubeler arası transfer tamamlandı')
      setShowTransferModal(false)
      setTransferForm({ from_branch_id: '', to_branch_id: '', part_id: '', qty: '', note: '' })
      const listRes = await fetch('/api/tenant/stock/transfer', { credentials: 'same-origin' })
      const listJson = await listRes.json()
      if (listJson.items) setTransfers(listJson.items)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transfer başarısız')
    }
  }

  return (
    <>
    <div className="space-y-6 pb-8 no-print">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-tour="stok-baslik">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package size={20} className="text-sky-600" /> Stok & Yedek Parça
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Stok değişiklikleri otomatik olarak finansa yansır</p>
        </div>
        <div className="flex gap-2">
          {branches.length >= 2 && (
            <button onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all">
              <ArrowRightLeft size={14} /> Şube Transferi
            </button>
          )}
          <a href="/dashboard/stok/sayim" data-tour="stok-sayim-link" className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all">
            Stok Sayım
          </a>
          <button onClick={() => setShowAddModal(true)} data-tour="stok-yeni-parca-btn"
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all">
            <Plus size={14} /> Yeni Parça
          </button>
        </div>
      </div>

      {/* Metrics — CANLI VERİ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-tour="stok-metrikler">
        {[
          { label: 'Toplam Çeşit', val: summary.totalStockItems.toString(), icon: Package, bg: 'from-sky-500 to-purple-600' },
          { label: 'Toplam Adet', val: summary.totalStockQty.toLocaleString('tr-TR'), icon: BarChart3, bg: 'from-blue-500 to-cyan-600' },
          { label: 'Kritik Stok', val: summary.criticalStockCount.toString(), icon: AlertTriangle, bg: 'from-red-500 to-rose-600', alert: summary.criticalStockCount > 0 },
          { label: 'Stok Değeri', val: formatCurrency(summary.totalStockValue), icon: TrendingDown, bg: 'from-emerald-500 to-green-600' },
        ].map(m => (
          <div key={m.label} className={`card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${'alert' in m && m.alert ? 'ring-1 ring-red-200' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.bg} flex items-center justify-center shadow-sm`}>
                <m.icon size={16} className="text-white" />
              </div>
              {'alert' in m && m.alert && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">DİKKAT</span>}
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-3" data-tour="stok-filtreler">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-xs" placeholder="Parça adı veya barkod ara..." />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="select text-xs py-2 w-auto min-w-[120px]">
          <option value="">Tüm Kategoriler</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[{ key: '', label: 'Tümü' }, { key: 'critical', label: '⚠ Kritik' }, { key: 'ok', label: '✓ Yeterli' }].map(f => (
            <button key={f.key} onClick={() => setStockFilter(f.key as typeof stockFilter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${stockFilter === f.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} parça</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden" data-tour="stok-tablo">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Parça Adı</th>
                <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Kategori</th>
                <th className="text-center py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Stok</th>
                <th className="text-center py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Min</th>
                <th className="text-right py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Alış</th>
                <th className="text-right py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Satış</th>
                <th className="text-right py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Kâr Marjı</th>
                <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">Tedarikçi</th>
                <th className="text-center py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const isCritical = p.stock_qty <= p.min_stock
                const profitMargin = p.sell_price > 0 ? ((p.sell_price - p.buy_price) / p.sell_price * 100).toFixed(0) : '0'
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${isCritical ? 'bg-red-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                      <p className="text-[9px] font-mono text-slate-400">{p.barcode}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-black tabular-nums ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
                        {p.stock_qty}
                      </span>
                      {isCritical && <AlertTriangle size={10} className="inline ml-1 text-red-400" />}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-400">{p.min_stock}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 tabular-nums">{formatCurrency(p.buy_price)}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-slate-900 tabular-nums">{formatCurrency(p.sell_price)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-xs font-bold ${parseInt(profitMargin) >= 30 ? 'text-emerald-600' : parseInt(profitMargin) >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                        %{profitMargin}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-500">{p.supplier}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintLabels([stockLabelFromItem(p)])
                            setTimeout(() => window.print(), 100)
                          }}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
                          title="Barkod / QR etiket"
                        >
                          <Printer size={14} />
                        </button>
                        <button onClick={() => { setSelectedItem(p); setShowReceiveModal(true) }} data-tour="stok-giris-btn"
                          className="px-2 py-1 text-[10px] font-bold bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors">
                          + Giriş
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {transfers.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <ArrowRightLeft size={14} className="text-sky-500" /> Son Şube Transferleri
          </h3>
          <div className="space-y-2">
            {transfers.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-50 pb-2">
                <span className="font-semibold">{t.part?.name ?? 'Parça'}</span>
                <span>{t.from_branch?.name} → {t.to_branch?.name}</span>
                <span className="font-bold">{t.qty} adet</span>
                <span className="text-slate-400">{new Date(t.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">📦 Yeni Parça Ekle</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Parça Adı *</label>
                <input className="input" placeholder="Parça adı" value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kategori *</label>
                  <select className="select text-xs" value={newPart.category} onChange={e => setNewPart(p => ({ ...p, category: e.target.value }))}>
                    {PART_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Barkod (otomatik)</label>
                  <div className="flex gap-2">
                    <input className="input font-mono text-xs bg-slate-50" readOnly value={newPart.barcode} />
                    <button type="button" className="btn-secondary text-xs shrink-0" onClick={() => setNewPart(p => ({ ...p, barcode: generateStockBarcode() }))}>Yenile</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Alış (₺) *</label>
                  <input type="number" className="input" placeholder="0" value={newPart.buy_price} onChange={e => setNewPart(p => ({ ...p, buy_price: e.target.value }))} />
                </div>
                <div><label className="label">Satış (₺) <span className="text-slate-400 normal-case font-normal">(ops.)</span></label>
                  <input type="number" className="input" placeholder="Boş = alış fiyatı" value={newPart.sell_price} onChange={e => setNewPart(p => ({ ...p, sell_price: e.target.value }))} />
                </div>
                <div><label className="label">Min. Stok</label>
                  <input type="number" className="input" placeholder="5" value={newPart.min_stock} onChange={e => setNewPart(p => ({ ...p, min_stock: e.target.value }))} />
                </div>
              </div>
              <div><label className="label">Tedarikçi</label>
                <input className="input" placeholder="Tedarikçi adı" value={newPart.supplier} onChange={e => setNewPart(p => ({ ...p, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleAddPart} className="btn-primary flex-1">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">📥 Stok Girişi</h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-900">{selectedItem.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Mevcut: {selectedItem.stock_qty} adet | Birim maliyet: {formatCurrency(selectedItem.buy_price)}</p>
              </div>
              <div>
                <label className="label">Eklenecek Adet *</label>
                <input type="number" className="input" placeholder="0" value={receiveQty}
                  onChange={e => setReceiveQty(e.target.value)} autoFocus />
              </div>
              {receiveQty && parseInt(receiveQty) > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 text-xs">
                  <p className="font-bold text-amber-800">💡 Maliyet hesabı:</p>
                  <p className="text-amber-700 mt-1">
                    {receiveQty} adet × {formatCurrency(selectedItem.buy_price)} = <strong>{formatCurrency(parseInt(receiveQty) * selectedItem.buy_price)}</strong>
                  </p>
                  <p className="text-amber-600 mt-1 text-[10px]">Bu tutar otomatik olarak finansa gider olarak yansıyacak</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowReceiveModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleReceiveStock} className="btn-primary flex-1">Stok Girişi Yap</button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Şubeler Arası Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kaynak Şube</label>
                  <select className="select" value={transferForm.from_branch_id} onChange={e => setTransferForm(f => ({ ...f, from_branch_id: e.target.value }))}>
                    <option value="">Seçin</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Hedef Şube</label>
                  <select className="select" value={transferForm.to_branch_id} onChange={e => setTransferForm(f => ({ ...f, to_branch_id: e.target.value }))}>
                    <option value="">Seçin</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Parça</label>
                <select className="select" value={transferForm.part_id} onChange={e => setTransferForm(f => ({ ...f, part_id: e.target.value }))}>
                  <option value="">Seçin</option>
                  {stock.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock_qty} adet)</option>)}
                </select>
              </div>
              <div>
                <label className="label">Adet</label>
                <input type="number" className="input" value={transferForm.qty} onChange={e => setTransferForm(f => ({ ...f, qty: e.target.value }))} min="1" />
              </div>
              <div>
                <label className="label">Not (opsiyonel)</label>
                <input className="input" value={transferForm.note} onChange={e => setTransferForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={() => void handleTransfer()} className="btn-primary flex-1">Transfer Et</button>
            </div>
          </div>
        </div>
      )}
    </div>
    {printLabels && <BarcodeLabelSheet labels={printLabels} />}
    </>
  )
}
