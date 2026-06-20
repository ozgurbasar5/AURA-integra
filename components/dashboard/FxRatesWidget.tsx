'use client'

import { useEffect, useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import type { FxRate } from '@/lib/fx-rates'
import { convertTryToForeign } from '@/lib/fx-rates'

function fmt(n: number, digits = 2) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

export default function FxRatesWidget() {
  const [rates, setRates] = useState<FxRate[]>([])
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [tryAmount, setTryAmount] = useState('1000')
  const [selected, setSelected] = useState<FxRate['code']>('USD')

  useEffect(() => {
    fetch('/api/tenant/fx-rates', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        setRates(json.rates ?? [])
        setDate(json.date ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = rates.find(r => r.code === selected) ?? rates[0]
  const tryNum = parseFloat(tryAmount.replace(',', '.')) || 0
  const converted = active ? convertTryToForeign(tryNum, active.selling) : 0

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
          <ArrowRightLeft size={15} className="text-sky-500" />
          TCMB Döviz
        </h3>
        {date && <span className="text-[10px] text-[var(--text-muted)]">{date}</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-sky-500" />
        </div>
      ) : rates.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Kurlar yüklenemedi</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {rates.map(r => (
              <button
                key={r.code}
                type="button"
                onClick={() => setSelected(r.code)}
                className={`rounded-xl border p-2.5 text-left transition-all ${
                  selected === r.code
                    ? 'border-sky-500/40 bg-sky-500/10'
                    : 'border-[var(--bg-border)] hover:border-[var(--text-muted)]'
                }`}
              >
                <p className="text-[10px] font-bold text-[var(--text-muted)]">{r.code}</p>
                <p className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{fmt(r.selling)}</p>
                <p className="text-[9px] text-[var(--text-muted)]">Alış {fmt(r.buying)}</p>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[var(--bg-muted)] p-3 space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">TRY Çevirici</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={tryAmount}
                onChange={e => setTryAmount(e.target.value)}
                className="input py-1.5 text-sm flex-1"
                min={0}
              />
              <span className="text-xs text-[var(--text-muted)]">TRY</span>
            </div>
            {active && (
              <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                ≈ {fmt(converted, 2)} {active.code}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
