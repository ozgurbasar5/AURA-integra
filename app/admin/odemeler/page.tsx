'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Download, Filter, Check, X, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/utils'
import type { TenantPayment } from '@/types/database'
import * as XLSX from 'xlsx'

export default function OdemelerPage() {
  const [payments, setPayments] = useState<TenantPayment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter
        ? `/api/admin/payments?status=${encodeURIComponent(statusFilter)}`
        : '/api/admin/payments'
      const res = await fetch(url, { credentials: 'same-origin' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Veri yüklenemedi')
      setPayments(json.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Veri yüklenemedi')
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const markAsPaid = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark_paid', extend_days: 30 }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Güncellenemedi')
      toast.success(result.message || 'Ödeme alındı, abonelik 30 gün uzatıldı')
      fetchPayments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi')
    } finally {
      setProcessingId(null)
    }
  }

  const syncOverdue = async () => {
    const res = await fetch('/api/admin/payments', { method: 'PUT' })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error); return }
    toast.success(`${result.updated ?? 0} kayıt gecikmiş olarak işaretlendi`)
    fetchPayments()
  }

  const exportExcel = () => {
    const rows = payments.map(p => ({
      'Bayi':       (p.tenants as any)?.company_name,
      'E-posta':    (p.tenants as any)?.email,
      'Paket':      (p.subscription_plans as any)?.name,
      'Tutar (₺)':  Number(p.amount),
      'Vade':       formatDate(p.due_date),
      'Ödeme Tarihi': p.paid_at ? formatDate(p.paid_at) : '',
      'Durum':      PAYMENT_STATUS_LABELS[p.status],
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Ödemeler')
    XLSX.writeFile(wb, `AURA_Odemeler_${new Date().toLocaleDateString('tr-TR')}.xlsx`)
    toast.success('Excel dosyası indiriliyor...')
  }

  const stats = {
    total:   payments.reduce((s, p) => s + Number(p.amount), 0),
    paid:    payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
    overdue: payments.filter(p => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0),
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-black">Abonelik & Ödemeler</h1>
          <p className="text-zinc-500 text-sm mt-1">{payments.length} ödeme kaydı</p>
        </div>
        <button onClick={exportExcel} className="btn-secondary">
          <Download size={16} /> Excel İndir
        </button>
        <button onClick={syncOverdue} className="btn-secondary">
          Gecikmişleri Güncelle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Toplam', value: formatCurrency(stats.total), color: 'text-white' },
          { label: 'Tahsil Edilen', value: formatCurrency(stats.paid), color: 'text-emerald-400' },
          { label: 'Bekleyen', value: formatCurrency(stats.pending), color: 'text-amber-400' },
          { label: 'Gecikmiş', value: formatCurrency(stats.overdue), color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-zinc-500" />
        <div className="flex gap-2">
          {['', 'pending', 'overdue', 'paid', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-sky-600 text-white'
                  : 'bg-[#18181b] text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {s ? PAYMENT_STATUS_LABELS[s] : 'Tümü'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-sky-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Bayi</th>
                  <th>Paket</th>
                  <th>Tutar</th>
                  <th>Vade</th>
                  <th>Ödeme Tarihi</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const tenant = p.tenants as any
                  const plan   = p.subscription_plans as any
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-white">{tenant?.company_name ?? '—'}</p>
                        <p className="text-xs text-zinc-500">{tenant?.email}</p>
                      </td>
                      <td>
                        <span className="badge border bg-sky-500/10 text-sky-400 border-sky-500/20">
                          {plan?.name ?? '—'}
                        </span>
                      </td>
                      <td className="font-mono font-semibold text-white">{formatCurrency(Number(p.amount))}</td>
                      <td>
                        <span className={`flex items-center gap-1 text-xs font-mono ${
                          p.status === 'overdue' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          <Calendar size={10} />
                          {formatDate(p.due_date)}
                        </span>
                      </td>
                      <td className="font-mono text-zinc-400 text-xs">
                        {p.paid_at ? formatDate(p.paid_at) : '—'}
                      </td>
                      <td>
                        <span className={`badge border ${PAYMENT_STATUS_COLORS[p.status]}`}>
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td>
                        {(p.status === 'pending' || p.status === 'overdue') && (
                          <button
                            onClick={() => markAsPaid(p.id)}
                            disabled={processingId === p.id}
                            className="btn btn-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                          >
                            {processingId === p.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Check size={12} />
                            }
                            Ödendi İşle
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-500">
                      <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                      Ödeme kaydı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
