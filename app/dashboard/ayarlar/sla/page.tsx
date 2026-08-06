'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Clock, Plus, Save, Trash2, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import PageHeader from '@/components/dashboard/PageHeader'
import type { SlaConfig } from '@/lib/store'
import { DEVICE_CATEGORIES } from '@/lib/atolye-constants'

export default function SlaSettingsPage() {
  const router = useRouter()
  const [configs, setConfigs] = useState<SlaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/sla')
      const data = await res.json()
      if (res.ok) setConfigs(data.items || [])
    } catch {
      toast.error('SLA ayarları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleAddConfig() {
    try {
      const res = await fetch('/api/tenant/sla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'Yeni Kategori',
          standard_days: 3,
          legal_max_days: 20,
          warning_at_percent: 80,
          auto_notify_customer: true,
        })
      })
      const data = await res.json()
      if (res.ok) {
        setConfigs(prev => [...prev, data.item])
        toast.success('Yeni yapılandırma eklendi')
      } else throw new Error(data.error)
    } catch (e: any) {
      toast.error(e.message || 'Eklenemedi')
    }
  }

  async function handleUpdate(id: string, field: keyof SlaConfig, value: any) {
    // Optimistic update
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
    
    try {
      const res = await fetch('/api/tenant/sla', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value })
      })
      if (!res.ok) {
        // revert if failed, but for simplicity just reload
        await load()
        toast.error('Güncelleme başarısız')
      }
    } catch {
      await load()
      toast.error('Ağ hatası')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <button onClick={() => router.push('/dashboard/ayarlar')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-semibold">
        <ArrowLeft size={16} /> Ayarlara Dön
      </button>

      <PageHeader 
        icon={Clock}
        title="Gelişmiş SLA Yönetimi"
        description="Farklı cihaz kategorileri için servis bekleme ve azami tamir sürelerini ayarlayın."
        actions={
          <button onClick={handleAddConfig} className="btn-primary text-sm flex items-center gap-1">
            <Plus size={16} /> Yeni Kural Ekle
          </button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-amber-900">6502 Sayılı Kanun Hatırlatması</h4>
          <p className="text-sm text-amber-800 mt-1">
            Tüketici elektroniğinde (cep telefonu, bilgisayar vb.) azami tamir süresi <strong>20 iş günüdür</strong>. 
            Ticari araçlar, binek otomobiller gibi kategorilerde bu süre 30 veya 45 güne kadar çıkabilir. Yasal sınırları bu sayede cihaz tipine göre ayrıştırabilirsiniz.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {configs.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
            Henüz SLA kuralı tanımlanmamış. Varsayılan süreler kullanılacaktır.
          </div>
        )}
        
        {configs.map(config => (
          <div key={config.id} className="card p-5 border-l-4 border-l-sky-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="md:col-span-1 space-y-3">
                <div>
                  <label className="label">Kategori</label>
                  <select 
                    className="select"
                    value={config.category}
                    onChange={e => handleUpdate(config.id, 'category', e.target.value)}
                  >
                    <option value="Genel">Genel (Varsayılan)</option>
                    {DEVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-4">
                    <input 
                      type="checkbox" 
                      className="rounded text-sky-600 focus:ring-sky-500"
                      checked={config.is_active}
                      onChange={e => handleUpdate(config.id, 'is_active', e.target.checked)}
                    />
                    Kuralı Aktif Et
                  </label>
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label text-sky-700">Hedef Süre (Gün)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Müşteri beklentisi</p>
                  <input 
                    type="number" 
                    className="input" 
                    value={config.standard_days}
                    onChange={e => handleUpdate(config.id, 'standard_days', parseInt(e.target.value) || 3)}
                  />
                </div>
                <div>
                  <label className="label text-red-700">Yasal Limit (Gün)</label>
                  <p className="text-[10px] text-slate-400 mb-1">6502 Max Süre</p>
                  <input 
                    type="number" 
                    className="input border-red-200 focus:border-red-500 focus:ring-red-500/20" 
                    value={config.legal_max_days}
                    onChange={e => handleUpdate(config.id, 'legal_max_days', parseInt(e.target.value) || 20)}
                  />
                </div>
                <div>
                  <label className="label text-amber-700">Uyarı Yüzdesi (%)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Hedef sürenin % kaçında uyarsın?</p>
                  <input 
                    type="number" 
                    className="input border-amber-200 focus:border-amber-500 focus:ring-amber-500/20" 
                    value={config.warning_at_percent}
                    onChange={e => handleUpdate(config.id, 'warning_at_percent', parseInt(e.target.value) || 80)}
                  />
                </div>
                
                <div className="sm:col-span-3 border-t border-slate-100 pt-3 mt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={config.auto_notify_customer}
                      onChange={e => handleUpdate(config.id, 'auto_notify_customer', e.target.checked)}
                    />
                    <span className="font-semibold">Müşteriyi Otomatik Bilgilendir</span>
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      (Süre yaklaşırken veya yasal süre aşılırsa müşteriye SMS gider)
                    </span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
