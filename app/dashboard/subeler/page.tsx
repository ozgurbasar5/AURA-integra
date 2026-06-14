'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import {
  getBranches, getActiveBranchId, addBranch, setActiveBranchId, onStoreChange, type Branch,
} from '@/lib/store'

export default function SubelerPage() {
  const [mounted, setMounted] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [maxBranches, setMaxBranches] = useState(5)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })

  const refresh = useCallback(() => {
    setBranches(getBranches())
    setActiveId(getActiveBranchId())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    fetch('/api/tenant/limits', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(j => { if (j.limits?.max_branches) setMaxBranches(j.limits.max_branches) })
      .catch(() => {})
    return onStoreChange(m => { if (!m || m === 'branches') refresh() })
  }, [refresh])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('Şube adı zorunlu'); return }
    if (branches.length >= maxBranches) {
      toast.error(`Paket limiti: en fazla ${maxBranches} şube. Plan yükseltin.`)
      return
    }
    addBranch({ name: form.name, address: form.address, phone: form.phone, is_main: branches.length === 0 })
    toast.success('Şube eklendi')
    setForm({ name: '', address: '', phone: '' })
    refresh()
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Yönetim"
        title="Şubeler"
        description="Çok noktalı işletme — aktif şube seçimi ve lokasyon yönetimi."
        icon={Building2}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <PageCard title="Şube Listesi" noPadding>
          <div className="divide-y divide-slate-100">
            {branches.map(b => (
              <div key={b.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{b.name}</p>
                    {b.is_main && <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">Merkez</span>}
                    {activeId === b.id && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{b.address || '—'} · {b.phone || '—'}</p>
                </div>
                {activeId !== b.id && (
                  <button type="button" onClick={() => { setActiveBranchId(b.id); refresh(); toast.success('Aktif şube değiştirildi') }} className="btn-secondary btn-sm">
                    Aktif Yap
                  </button>
                )}
              </div>
            ))}
          </div>
        </PageCard>

        <PageCard title="Yeni Şube">
          <form onSubmit={handleAdd} className="space-y-3">
            <input className="input" placeholder="Şube adı *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Adres" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <input className="input" placeholder="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={16} /> Ekle
            </button>
          </form>
        </PageCard>
      </div>
    </PageShell>
  )
}
