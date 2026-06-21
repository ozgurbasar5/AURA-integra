'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ShoppingCart, Plus, Search, DollarSign, CreditCard,
  Banknote, Building2, Package, Trash2, Minus, X,
  TrendingUp, Calendar, Users, Receipt, Wallet, AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import confetti from 'canvas-confetti'
import { PAYMENT_METHODS } from '@/lib/constants'
import { completePosSaleViaApi } from '@/lib/pos-bridge'
import {
  getStock, getSales, getFinanceSummary,
  getCampaigns,
  onStoreChange, type StockItem, type Sale
} from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CartItem {
  stock_id: string
  name: string
  barcode: string
  qty: number
  unit_price: number
  max_stock: number
}

export default function SatisPage() {
  const [stock, setStockItems] = useState<StockItem[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('nakit')
  const [customerName, setCustomerName] = useState('')
  const [vatRate, setVatRate] = useState(20)
  const [mounted, setMounted] = useState(false)
  const [summary, setSummary] = useState({ kasaBakiye: 0, totalGelir: 0, totalGider: 0, netKar: 0, totalStockValue: 0, criticalStockCount: 0, totalStockItems: 0, totalStockQty: 0 })
  const [recentSales, setRecentSales] = useState<Sale[]>([])

  const refresh = useCallback(() => {
    setStockItems(getStock())
    setSummary(getFinanceSummary())
    const sales = getSales()
    setRecentSales(sales.slice(-5).reverse())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    const unsub = onStoreChange((mod) => {
      if (mod === 'stock' || mod === 'sales' || mod === 'finance') refresh()
    })
    return unsub
  }, [refresh])

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filteredProducts = search.length >= 2
    ? stock.filter(p =>
        p.stock_qty > 0 && (
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.includes(search) ||
          p.category.toLowerCase().includes(search.toLowerCase())
        )
      )
    : []

  // Barkod okuyucu: tam eşleşmede sepete ekle
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !search.trim()) return
    const exact = stock.find(p => p.barcode === search.trim() && p.stock_qty > 0)
    if (exact) {
      e.preventDefault()
      addToCart(exact)
      toast.success(`${exact.name} sepete eklendi`)
    }
  }

  const addToCart = (product: StockItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.stock_id === product.id)
      if (existing) {
        if (existing.qty >= product.stock_qty) {
          toast.error(`Stokta sadece ${product.stock_qty} adet var`)
          return prev
        }
        return prev.map(i => i.stock_id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { stock_id: product.id, name: product.name, barcode: product.barcode, qty: 1, unit_price: product.sell_price, max_stock: product.stock_qty }]
    })
    setSearch('')
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.stock_id === id) {
        const newQty = i.qty + delta
        if (newQty <= 0) return i
        if (newQty > i.max_stock) { toast.error(`Stokta sadece ${i.max_stock} adet var`); return i }
        return { ...i, qty: newQty }
      }
      return i
    }))
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.stock_id !== id))

  // ─── Calculations ──────────────────────────────────────────────────────────
  const subtotalRaw = cart.reduce((s, i) => s + i.unit_price * i.qty, 0)
  const today = new Date().toISOString().slice(0, 10)
  const activeCampaign = getCampaigns().find(c =>
    c.is_active && c.type === 'indirim' && c.start_date <= today && (!c.end_date || c.end_date >= today)
  )
  const discountRate = activeCampaign?.discount_percent ?? 0
  const discountAmount = discountRate > 0 ? subtotalRaw * (discountRate / 100) : 0
  const subtotal = subtotalRaw - discountAmount
  const kdv = subtotal * (vatRate / 100)
  const total = subtotal + kdv

  const costPrice = cart.reduce((s, c) => {
    const stockItem = stock.find(p => p.id === c.stock_id)
    return s + (stockItem?.buy_price || 0) * c.qty
  }, 0)
  const grossProfit = subtotal - costPrice
  const profitMargin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0
  const isLoss = costPrice > subtotal

  const handleCompleteSale = async () => {
    if (cart.length === 0) { toast.error('Sepet boş'); return }

    const saleItems = cart.map(c => ({
      stock_id: c.stock_id,
      name: c.name,
      qty: c.qty,
      unit_price: discountRate > 0 ? c.unit_price * (1 - discountRate / 100) : c.unit_price,
    }))

    try {
      await completePosSaleViaApi(saleItems, customerName || 'Walk-in', paymentMethod, vatRate)
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } })
      toast.success(`Satış tamamlandı! ${formatCurrency(total)} — Stok güncellendi, gelir finansa yansıdı ✅`)
      setCart([])
      setCustomerName('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Satış tamamlanamadı')
    }
  }

  // Today totals from recent sales
  const todayTotal = recentSales
    .filter(s => new Date(s.date).toDateString() === new Date().toDateString())
    .reduce((s, sale) => s + (sale.total_with_vat ?? sale.total ?? 0), 0)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div data-tour="satis-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-sky-600" /> Satış & POS
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Satış otomatik olarak stok ve finansa yansır</p>
        </div>
      </div>

      {/* Metrics */}
      <div data-tour="satis-metrikler" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bugünkü Satış', val: formatCurrency(todayTotal), icon: DollarSign, bg: 'from-sky-500 to-purple-600' },
          { label: 'Kasa Bakiye', val: formatCurrency(summary.kasaBakiye), icon: Wallet, bg: 'from-blue-500 to-cyan-600' },
          { label: 'Toplam Gelir', val: formatCurrency(summary.totalGelir), icon: TrendingUp, bg: 'from-emerald-500 to-green-600' },
          { label: 'Net Kâr', val: formatCurrency(summary.netKar), icon: Receipt, bg: 'from-amber-500 to-orange-600' },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.bg} flex items-center justify-center shadow-sm mb-3`}>
              <m.icon size={16} className="text-white" />
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* POS Panel */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Product Search + Recent Sales */}
        <div className="lg:col-span-3 space-y-3">
          <div data-tour="satis-arama" className="card p-4">
            <label className="label mb-2">Ürün / Barkod Ara</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
                className="input pl-10" placeholder="Barkod okut veya ürün ara (Enter)" autoFocus />
            </div>

            {filteredProducts.length > 0 && (
              <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50/60 transition-colors text-left border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.category} • Stok: {p.stock_qty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-sky-600">{formatCurrency(p.sell_price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sales */}
          {recentSales.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Son Satışlar</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase">Müşteri</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase">Ürünler</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase">Ödeme</th>
                    <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase">Tutar</th>
                    <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase">Kâr Marjı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-900">{s.customer_name}</td>
                      <td className="py-2.5 px-4 text-center text-xs text-slate-500">{s.items.reduce((sum, i) => sum + i.qty, 0)} ürün</td>
                      <td className="py-2.5 px-4 text-center text-[10px] font-semibold text-slate-500">
                        {PAYMENT_METHODS[s.payment_method as keyof typeof PAYMENT_METHODS]?.label || s.payment_method}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(s.total_with_vat ?? s.total ?? 0)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`text-xs font-bold tabular-nums ${(s.profit_margin ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          %{(s.profit_margin ?? 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cart */}
        <div data-tour="satis-sepet" className="lg:col-span-2 card flex flex-col h-fit sticky top-4">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ShoppingCart size={14} className="text-sky-600" /> Sepet
              {cart.length > 0 && (
                <span className="ml-auto text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-bold">
                  {cart.reduce((s, i) => s + i.qty, 0)} ürün
                </span>
              )}
            </h3>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Sepet boş</p>
              <p className="text-[11px] mt-1">Ürün arayarak sepete ekleyin</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.stock_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{formatCurrency(item.unit_price)} / adet</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.stock_id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Minus size={12} /></button>
                      <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.stock_id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={12} /></button>
                    </div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums w-20 text-right">{formatCurrency(item.unit_price * item.qty)}</p>
                    <button onClick={() => removeFromCart(item.stock_id)}
                      className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>

              <div data-tour="satis-ozet" className="p-4 border-t border-slate-100 space-y-2">
                <div><label className="label text-[10px]">Müşteri Adı</label>
                  <input className="input text-xs" placeholder="Walk-in" value={customerName}
                    onChange={e => setCustomerName(e.target.value)} />
                </div>

                {/* KDV Oranı Seçimi */}
                <div>
                  <label className="label text-[10px]">KDV Oranı</label>
                  <select value={vatRate} onChange={e => setVatRate(Number(e.target.value))}
                    className="input text-xs">
                    <option value={0}>KDV Yok (%0)</option>
                    <option value={10}>%10 KDV</option>
                    <option value={20}>%20 KDV</option>
                  </select>
                </div>

                {/* Sepet Özeti */}
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Ara Toplam (KDV Hariç)</span><span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Maliyet</span><span className="font-semibold">{formatCurrency(costPrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Brüt Kâr</span>
                  <span className={`font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(grossProfit)} <span className="text-[10px]">(%{profitMargin.toFixed(1)})</span>
                  </span>
                </div>

                {isLoss && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-red-600">
                      Zarar! Maliyet satış fiyatını aşıyor ({formatCurrency(costPrice - subtotal)} zarar)
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-slate-500">
                  <span>KDV (%{vatRate})</span><span className="font-semibold">{formatCurrency(kdv)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-dashed border-slate-200">
                  <span>TOPLAM</span><span className="text-sky-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 space-y-3">
                <div data-tour="satis-odeme-yontemi" className="grid grid-cols-3 gap-1.5">
                  {(['nakit', 'kredi_karti', 'havale'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${
                        paymentMethod === m ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-200 text-slate-500'
                      }`}>
                      {m === 'nakit' && <Banknote size={14} className="mx-auto mb-0.5" />}
                      {m === 'kredi_karti' && <CreditCard size={14} className="mx-auto mb-0.5" />}
                      {m === 'havale' && <Building2 size={14} className="mx-auto mb-0.5" />}
                      {PAYMENT_METHODS[m]?.label}
                    </button>
                  ))}
                </div>
                <button data-tour="satis-tamamla-btn" onClick={handleCompleteSale}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                  💳 Satışı Tamamla — {formatCurrency(total)}
                </button>
                <p className="text-[9px] text-slate-400 text-center">Stok otomatik düşer • Gelir finansa yansır</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
