'use client'

import { memo, useCallback } from 'react'
import { AlertTriangle, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import { stockLabelFromItem } from '@/lib/barcode-labels'
import type { StockItem } from '@/lib/store'

export type StockRowProps = {
  item: StockItem
  onReceive: (item: StockItem) => void
  onPrint: (labels: ReturnType<typeof stockLabelFromItem>[]) => void
}

function StockRowInner({ item, onReceive, onPrint }: StockRowProps) {
  const isCritical = item.stock_qty <= item.min_stock
  const profitMargin = item.sell_price > 0
    ? ((item.sell_price - item.buy_price) / item.sell_price * 100).toFixed(0)
    : '0'

  const handlePrint = useCallback(() => {
    onPrint([stockLabelFromItem(item)])
    setTimeout(() => window.print(), 100)
  }, [item, onPrint])

  const handleReceive = useCallback(() => {
    onReceive(item)
  }, [item, onReceive])

  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${isCritical ? 'bg-red-50/40' : ''}`}>
      <td className="py-3 px-4">
        <p className="text-xs font-semibold text-slate-900">{item.name}</p>
        <p className="text-[9px] font-mono text-slate-400">{item.barcode}</p>
      </td>
      <td className="py-3 px-4 text-xs text-slate-600">{item.category}</td>
      <td className="py-3 px-4 text-center">
        <span className={`text-sm font-black tabular-nums ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
          {item.stock_qty}
        </span>
        {isCritical && <AlertTriangle size={10} className="inline ml-1 text-red-400" />}
      </td>
      <td className="py-3 px-4 text-center text-xs text-slate-400">{item.min_stock}</td>
      <td className="py-3 px-4 text-right text-xs text-slate-500 tabular-nums">{formatCurrency(item.buy_price)}</td>
      <td className="py-3 px-4 text-right text-xs font-semibold text-slate-900 tabular-nums">{formatCurrency(item.sell_price)}</td>
      <td className="py-3 px-4 text-right">
        <span className={`text-xs font-bold ${parseInt(profitMargin) >= 30 ? 'text-emerald-600' : parseInt(profitMargin) >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
          %{profitMargin}
        </span>
      </td>
      <td className="py-3 px-4 text-[10px] text-slate-500">{item.supplier}</td>
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg"
            title="Barkod / QR etiket"
          >
            <Printer size={14} />
          </button>
          <button
            type="button"
            onClick={handleReceive}
            data-tour="stok-giris-btn"
            className="px-2 py-1 text-[10px] font-bold bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
          >
            + Giriş
          </button>
        </div>
      </td>
    </tr>
  )
}

const StockRow = memo(StockRowInner)
export default StockRow
