'use client'

import { useState, useEffect } from 'react'
import { X, Scale, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import { formatCurrency } from '@/lib/validators'
import { useActionLock } from '@/hooks/useActionLock'
import type { FinanceAccount } from '@/lib/finance-accounts'

interface ReconciliationModalProps {
  isOpen: boolean
  accounts: FinanceAccount[]
  selectedAccount?: FinanceAccount | null
  onClose: () => void
  onSuccess: () => void
}

export function ReconciliationModal({
  isOpen,
  accounts,
  selectedAccount,
  onClose,
  onSuccess,
}: ReconciliationModalProps) {
  const { locked, lockAction } = useActionLock()

  const [accountId, setAccountId] = useState('')
  const [countedStr, setCountedStr] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      const defaultAcc = selectedAccount || accounts.find(a => a.is_default) || accounts[0]
      setAccountId(defaultAcc?.id || '')
      setCountedStr('')
      setNotes('')
    }
  }, [isOpen, selectedAccount, accounts])

  if (!isOpen) return null

  const activeAccount = accounts.find(a => a.id === accountId)
  const systemBalance = activeAccount ? Number(activeAccount.balance) || 0 : 0
  const countedBalance = parseLocaleNumber(countedStr)
  const hasCountedValue = countedStr.trim() !== '' && Number.isFinite(countedBalance)
  const difference = hasCountedValue ? Math.round((countedBalance - systemBalance) * 100) / 100 : 0
  const isMatch = hasCountedValue && Math.abs(difference) < 0.01

  const handleAuditOnly = async () => {
    if (!hasCountedValue) {
      toast.error('Lütfen sayılan tutarı girin')
      return
    }

    await lockAction(async () => {
      try {
        const res = await fetch('/api/tenant/finance/reconcile', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: accountId,
            counted_balance: countedBalance,
            action: 'audit',
            notes: notes.trim() || undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Mutabakat kaydedilemedi')

        toast.success(`Mutabakat sayımı kaydedildi (Fark: ${formatCurrency(difference)})`)
        onSuccess()
        onClose()
      } catch (err: any) {
        toast.error(err.message || 'Hata oluştu')
      }
    })
  }

  const handleAdjustBalance = async () => {
    if (!hasCountedValue) {
      toast.error('Lütfen sayılan tutarı girin')
      return
    }

    if (isMatch) {
      toast.info('Sistem ve sayım bakiyesi zaten eşit. Düzeltmeye gerek yok.')
      return
    }

    await lockAction(async () => {
      try {
        const res = await fetch('/api/tenant/finance/reconcile', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: accountId,
            counted_balance: countedBalance,
            action: 'adjust',
            notes: notes.trim() || 'Mutabakat sayım farkı düzeltmesi',
          }),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Bakiye düzeltilemedi')

        toast.success(`Hesap bakiyesi düzeltildi: ${formatCurrency(json.new_balance || countedBalance)}`)
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
        <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Kasa / Hesap Mutabakatı (Sayım)
              </h3>
              <p className="text-xs text-slate-500">
                Fiziksel sayım tutarı ile sistem bakiyesini karşılaştırın.
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

        {/* İçerik */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Hesap Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sayım Yapılan Hesap
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="input w-full"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Sistem Bakiyesi (READ-ONLY) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Sistem Bakiyesi (Defter)
              </label>
              <div className="input w-full bg-slate-100 dark:bg-slate-800/80 font-bold tabular-nums text-slate-700 dark:text-slate-300 cursor-not-allowed flex items-center">
                {formatCurrency(systemBalance)}
              </div>
            </div>

            {/* Fiziksel Sayım */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fiziksel Sayım (Kasadaki)
              </label>
              <input
                type="text"
                autoFocus
                placeholder="0,00"
                value={countedStr}
                onChange={e => setCountedStr(e.target.value)}
                className="input w-full font-bold text-lg tabular-nums"
              />
            </div>
          </div>

          {/* Fark Göstergesi */}
          {hasCountedValue && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${isMatch ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : difference > 0 ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}
            >
              <div className="flex items-center gap-2">
                {isMatch ? <Check size={16} /> : <AlertTriangle size={16} />}
                <span className="text-xs font-semibold">
                  {isMatch ? 'Bakiye tam eşleşiyor' : difference > 0 ? 'Kasa Fazlası Var' : 'Kasa Açığı Var'}
                </span>
              </div>
              <span className="text-sm font-black tabular-nums">
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </span>
            </div>
          )}

          {/* Not */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sayım Notu / Açıklama
            </label>
            <input
              type="text"
              placeholder="Örn: Akşam sayımı yapıldı, eksik madeni para var"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input w-full text-sm"
            />
          </div>

          {/* Aksiyon Butonları (Ayrık Sayım vs Düzeltme) */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-3.5 rounded-xl text-xs font-semibold order-last sm:order-first"
            >
              Kapat
            </button>

            <button
              type="button"
              disabled={locked || !hasCountedValue}
              onClick={handleAuditOnly}
              title="Sadece sayım logunu kaydeder, bakiye değiştirmez"
              className="btn-secondary py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              {locked ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
              Sayımı Kaydet (Log)
            </button>

            {!isMatch && hasCountedValue && (
              <button
                type="button"
                disabled={locked}
                onClick={handleAdjustBalance}
                title="Sayım farkı kadar defter düzeltmesi uygular"
                className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30"
              >
                {locked ? <Loader2 className="animate-spin" size={13} /> : <Scale size={13} />}
                Farkı Kasaya Düzelt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
