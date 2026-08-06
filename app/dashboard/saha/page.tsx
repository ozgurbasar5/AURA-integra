'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Calendar, Clock, Navigation, CheckCircle2, User, Phone, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import type { FieldOrder } from '@/lib/store'

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Planlandı', cls: 'bg-slate-100 text-slate-700' },
  en_route: { label: 'Yolda', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'İşlemde', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Tamamlandı', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'İptal', cls: 'bg-red-100 text-red-700' },
}

export default function FieldServicePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/field-orders')
      const json = await res.json()
      if (json.ok) {
        setOrders(json.items || [])
      }
    } catch {
      toast.error('Saha görevleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <PageShell className="max-w-6xl mx-auto">
      <PageHeader
        title="Saha Servis Operasyonları"
        description="Müşteri adresindeki servis ve kurulum taleplerini yönetin."
        icon={MapPin}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Görev ekleme dialogu hazırlanıyor')}>
            <Plus size={16} /> Yeni Saha Görevi
          </button>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sol Panel: Liste */}
        <div className="md:col-span-1 space-y-4">
          <PageCard className="h-[calc(100vh-14rem)] flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 text-sm flex items-center justify-between">
              Görev Listesi
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{orders.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="py-8"><LoadingCenter /></div>
              ) : orders.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm">
                  Planlanmış görev yok
                </div>
              ) : (
                orders.map(order => {
                  const st = STATUS_INFO[order.status] || STATUS_INFO.scheduled
                  return (
                    <div key={order.id} className="p-3 border border-slate-200 rounded-xl hover:border-sky-300 transition-colors cursor-pointer bg-white group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800 text-sm">{order.job_no || 'Yeni Görev'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-700 mb-1">{order.customer_name || 'Müşteri'}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                        <MapPin size={12} className="shrink-0" />
                        <span className="line-clamp-1">{order.address}</span>
                      </div>
                      {order.scheduled_at && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-600 font-medium bg-sky-50 px-2 py-1 rounded-lg w-max">
                          <Calendar size={12} />
                          {new Date(order.scheduled_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </PageCard>
        </div>

        {/* Sağ Panel: Harita Görünümü (Mock) */}
        <div className="md:col-span-2">
          <PageCard className="h-[calc(100vh-14rem)] p-0 overflow-hidden relative border-slate-200 shadow-sm">
            {/* Burada gerçek bir Google Maps veya Leaflet eklenecek. Mock harita arka planı */}
            <div className="absolute inset-0 bg-sky-50 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-4 text-sky-500 opacity-50" />
                <h3 className="font-bold text-slate-700 mb-2">Harita Görünümü Aktif Değil</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Saha personeli rotaları ve konum takibi için Google Maps API anahtarınızı yapılandırın.
                </p>
                <button className="btn-secondary mt-4 mx-auto" onClick={() => toast.info('Ayarlara yönlendiriliyor...')}>
                  API Anahtarı Ekle
                </button>
              </div>
            </div>
          </PageCard>
        </div>
      </div>
    </PageShell>
  )
}
