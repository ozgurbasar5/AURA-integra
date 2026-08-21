'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { toast } from 'sonner'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import { useActionLock } from '@/hooks/useActionLock'
import type { FinanceAccount } from '@/lib/finance-accounts'

interface TransactionModalProps {
  isOpen: boolean
  type: 'gelir' | 'gider'
  accounts: FinanceAccount[]
  selectedAccount?: FinanceAccount | null
  onClose: () => void
  onSuccess: () => void
}

export function TransactionModal({
  isOpen,
  type,
  accounts,
  selectedAccount,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const { locked, lockAction } = useActionLock()
  const isIncome = type === 'gelir'

  const [accountId, setAccountId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('nakit')

  useEffect(() => {
    if (isOpen) {
      const defaultAcc = selectedAccount || accounts.find(a => a.is_default) || accounts[0]
      setAccountId(defaultAcc?.id || '')
      setCategory(isIncome ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
      setDescription('')
      setAmountStr('')
      // Set payment method according to account type
      if (defaultAcc?.type === 'pos') setPaymentMethod('kredi_karti')
      else if (defaultAcc?.type === 'banka') setPaymentMethod('havale')
      else setPaymentMethod('nakit')
    }
  }, [isOpen, selectedAccount, accounts, isIncome])

  if (!isOpen) return null

  const activeAccount = accounts.find(a => a.id === accountId)
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseLocaleNumber(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin (örn: 250,50)')
      return
    }

    if (!description.trim()) {
      toast.error('Lütfen bir açıklama girin')
      return
    }

    if (!accountId) {
      toast.error('Lütfen bir hesap seçin')
      return
    }

    await lockAction(async () => {
      try {
        const res = await fetch('/api/tenant/transactions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            amount,
            category: category.trim(),
            description: description.trim(),
            payment_method: paymentMethod,
            account_id: accountId,
            transaction_date: new Date().toISOString(),
          }),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'İşlem kaydedilemedi')

        toast.success(`${isIncome ? 'Para girişi' : 'Para çıkışı'} kaydedildi: ₺${amount}`)
        onSuccess()
        onClose()
      } catch (err: any) {
        toast.error(err.message || 'Hata oluştu')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="surface w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Başlık */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${isIncome ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40' : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isIncome ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {isIncome ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isIncome ? 'Para Girişi' : 'Para Çıkışı'}
              </h3>
              <p className="text-xs text-slate-500">
                {isIncome ? 'Kasaya veya hesaba nakit/gelir ekleyin.' : 'Masraf veya ödeme kaydedin.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Hesap Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              İlgili Hesap
            </label>
            <select
              value={accountId}
              onChange={e => {
                const id = e.target.value
                setAccountId(id)
                const acc = accounts.find(a => a.id === id)
                if (acc?.type === 'pos') setPaymentMethod('kredi_karti')
                else if (acc?.type === 'banka') setPaymentMethod('havale')
                else setPaymentMethod('nakit')
              }}
              className="input w-full"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type.toUpperCase()}) — Bakiye: ₺{acc.balance.toLocaleString('tr-TR')}
                </option>
              ))}
            </select>
          </div>

          {/* Tutar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tutar (₺)
            </label>
            <input
              type="text"
              autoFocus
              placeholder="0,00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              className="input w-full text-lg font-bold tabular-nums"
              required
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input w-full"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Açıklama / Not
            </label>
            <input
              type="text"
              placeholder="Örn: Günlük yemek masrafı / Müşteri ek ödemesi"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input w-full text-sm"
              required
            />
          </div>

          {/* Butonlar */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 rounded-xl text-xs font-semibold"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={locked}
              className={`py-2 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30' : 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/30'}`}
            >
              {locked ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> İşleniyor…
                </>
              ) : isIncome ? (
                <>
                  <Plus size={15} /> Girişi Onayla
                </>
              ) : (
                <>
                  <Minus size={15} /> Çıkışı Onayla
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
