'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wallet, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, EmptyState } from '@/components/ui/PageShell'
import { formatCurrency } from '@/lib/validators'

type Balance = { customer_name: string; borc: number; tahsilat: number; bakiye: number }

export default function CariPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    action: 'tahsilat' as 'borc' | 'tahsilat',
    customer_name: '',
    amount: '',
    description: '',
    payment_method: 'nakit',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/cari', { credentials: 'same-origin' })
      const json = await res.json() as { balances?: Balance[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'Yüklenemedi')
      setBalances(json.balances ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cari yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/tenant/cari', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: form.action,
          customer_name: form.customer_name.trim(),
          amount: Number(form.amount),
          description: form.description.trim() || undefined,
          payment_method: form.payment_method,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Kayıt başarısız')
      toast.success(form.action === 'tahsilat' ? 'Tahsilat kaydedildi' : 'Borç kaydedildi')
      setShowForm(false)
      setForm({ action: 'tahsilat', customer_name: '', amount: '', description: '', payment_method: 'nakit' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        data-tour="cari-baslik"
        eyebrow="Finans"
        title="Cari / Veresiye"
        description="Müşteri bakiyeleri, borç ve tahsilat — rakip ERP kalıbı."
        icon={Wallet}
        actions={
          <button type="button" className="btn-primary btn-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Yeni hareket
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-sky-500" /></div>
      ) : balances.length === 0 ? (
        <PageCard><EmptyState icon={Wallet} title="Cari hareket yok" description="Veresiye teslim veya tahsilat kaydı burada görünür." /></PageCard>
      ) : (
        <PageCard noPadding data-tour="cari-liste">
          <div className="divide-y divide-slate-100">
            {balances.map(b => (
              <div key={b.customer_name} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{b.customer_name}</p>
                  <p className="text-xs text-slate-500">Borç {formatCurrency(b.borc)} · Tahsilat {formatCurrency(b.tahsilat)}</p>
                </div>
                <p className={`font-black tabular-nums ${b.bakiye > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(b.bakiye)}
                </p>
                {b.bakiye > 0 && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setForm({
                        action: 'tahsilat',
                        customer_name: b.customer_name,
                        amount: String(b.bakiye),
                        description: 'Cari tahsilat',
                        payment_method: 'nakit',
                      })
                      setShowForm(true)
                    }}
                  >
                    Tahsil et
                  </button>
                )}
              </div>
            ))}
          </div>
        </PageCard>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header py-4 px-5"><h3 className="font-bold">Cari hareket</h3></div>
            <form onSubmit={submit} className="modal-body space-y-3 py-4 px-5">
              <select className="input" value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value as 'borc' | 'tahsilat' }))}>
                <option value="tahsilat">Tahsilat</option>
                <option value="borc">Borç</option>
              </select>
              <input className="input" required placeholder="Müşteri adı" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              <input className="input" required type="number" min="1" step="0.01" placeholder="Tutar" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="nakit">Nakit</option>
                <option value="havale">Havale</option>
                <option value="kredi_karti">Kart</option>
                <option value="veresiye">Veresiye</option>
              </select>
              <input className="input" placeholder="Açıklama" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>İptal</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? '…' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
