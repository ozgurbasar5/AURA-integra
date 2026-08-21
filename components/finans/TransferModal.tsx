'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import { formatCurrency } from '@/lib/validators'
import { useActionLock } from '@/hooks/useActionLock'
import type { FinanceAccount } from '@/lib/finance-accounts'

interface TransferModalProps {
  isOpen: boolean
  accounts: FinanceAccount[]
  fromAccount?: FinanceAccount | null
  onClose: () => void
  onSuccess: () => void
}

export function TransferModal({
  isOpen,
  accounts,
  fromAccount,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const { locked, lockAction } = useActionLock()

  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isOpen) {
      const source = fromAccount || accounts[0]
      setFromAccountId(source?.id || '')

      // Find a different target account
      const target = accounts.find(a => a.id !== source?.id) || accounts[1]
      setToAccountId(target?.id || '')
      setAmountStr('')
      setDescription('Hesaplar arası bakiye transferi')
    }
  }, [isOpen, fromAccount, accounts])

  if (!isOpen) return null

  const sourceAcc = accounts.find(a => a.id === fromAccountId)
  const targetAcc = accounts.find(a => a.id === toAccountId)
  const amount = parseLocaleNumber(amountStr) || 0
  const isSourceTargetSame = fromAccountId === toAccountId
  const isInsufficientBalance = Boolean(sourceAcc && amount > sourceAcc.balance)

  const handleQuickSelect = (srcType: 'kasa' | 'pos' | 'banka', tgtType: 'kasa' | 'pos' | 'banka') => {
    const src = accounts.find(a => a.type === srcType)
    const tgt = accounts.find(a => a.type === tgtType)
    if (src && tgt && src.id !== tgt.id) {
      setFromAccountId(src.id)
      setToAccountId(tgt.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSourceTargetSame) {
      toast.error('Kaynak ve hedef hesap aynı olamaz')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Geçerli bir transfer tutarı girin')
      return
    }

    if (isInsufficientBalance) {
      toast.error(`Yetersiz bakiye. Kaynak hesap bakiyesi: ₺${sourceAcc?.balance.toLocaleString('tr-TR')}`)
      return
    }

    await lockAction(async () => {
      try {
        const res = await fetch('/api/tenant/accounts/transfer', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_account_id: fromAccountId,
            target_account_id: toAccountId,
            amount,
            description: description.trim() || undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Transfer gerçekleştirilemedi')

        toast.success(`Transfer tamamlandı: ${formatCurrency(amount)}`)
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
        className="surface w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Başlık */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-sky-50/60 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-600 text-white">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Hesaplar Arası Transfer
              </h3>
              <p className="text-xs text-slate-500">
                Nakit, POS ve Banka hesapları arasında bakiye aktarımı yapın.
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

        {/* Hızlı Seçim Butonları */}
        <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect('kasa', 'banka')}
            className="text-[11px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            Nakit → Banka
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('pos', 'banka')}
            className="text-[11px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            POS → Banka
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('banka', 'kasa')}
            className="text-[11px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            Banka → Nakit
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Kaynak Hesap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kaynak Hesap (Çıkış)
              </label>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                className="input w-full text-xs font-medium"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (₺{acc.balance.toLocaleString('tr-TR')})
                  </option>
                ))}
              </select>
            </div>

            {/* Hedef Hesap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hedef Hesap (Giriş)
              </label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                className="input w-full text-xs font-medium"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (₺{acc.balance.toLocaleString('tr-TR')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isSourceTargetSame && (
            <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle size={13} /> Kaynak ve hedef hesap farklı olmalıdır.
            </p>
          )}

          {/* Tutar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Transfer Tutarı (₺)
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

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Transfer Açıklaması
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input w-full text-sm"
              placeholder="Örn: Günlük POS cirosunun bankaya aktarımı"
            />
          </div>

          {/* Canlı Önizleme */}
          {sourceAcc && targetAcc && amount > 0 && !isSourceTargetSame && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{sourceAcc.name} yeni bakiye:</span>
                <span className={`font-bold tabular-nums ${isInsufficientBalance ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                  {formatCurrency(sourceAcc.balance - amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{targetAcc.name} yeni bakiye:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(targetAcc.balance + amount)}
                </span>
              </div>
            </div>
          )}

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
              disabled={locked || isSourceTargetSame || isInsufficientBalance}
              className="btn-primary py-2 px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-sm shadow-sky-600/30"
            >
              {locked ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Aktarılıyor…
                </>
              ) : (
                <>
                  <ArrowRightLeft size={15} /> Transferi Tamamla
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
