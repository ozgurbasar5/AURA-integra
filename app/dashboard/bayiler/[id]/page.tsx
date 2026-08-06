'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowLeft, Mail, Phone, MapPin, Receipt, Package, Wallet, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import type { Dealer, DealerOrder, DealerInvoice } from '@/lib/store'

const STATUS_INFO: Record<string, { label: string; text: string; bg: string; icon: any }> = {
  active: { label: 'Aktif', text: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  pending: { label: 'Onay Bekliyor', text: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  suspended: { label: 'Askıya Alındı', text: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
}

export default function DealerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [dealer, setDealer] = useState<Dealer | null>(null)
  const [orders, setOrders] = useState<DealerOrder[]>([])
  const [invoices, setInvoices] = useState<DealerInvoice[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      // B2B detaylarını yükle
      // (Şu an MVP için sadece dealer bilgisini listelemeden çekip buluyoruz veya tekil API eklenebilir)
      const res = await fetch('/api/tenant/dealers')
      const json = await res.json()
      if (json.ok) {
        const d = (json.items as Dealer[]).find(x => x.id === params.id)
        if (d) setDealer(d)
        else toast.error('Bayi bulunamadı')
      }
    } catch {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) return <PageShell><LoadingCenter /></PageShell>
  if (!dealer) return <PageShell>Bayi bulunamadı.</PageShell>

  const st = STATUS_INFO[dealer.status] || STATUS_INFO.pending
  const Icon = st.icon

  return (
    <PageShell className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/bayiler')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={24} className="text-sky-600" />
              {dealer.company_name}
            </h1>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${st.bg} ${st.text}`}>
              <Icon size={12} /> {st.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
            {dealer.contact_name && <span className="font-medium text-slate-700">{dealer.contact_name}</span>}
            {dealer.email && <span className="flex items-center gap-1"><Mail size={14} /> {dealer.email}</span>}
            {dealer.phone && <span className="flex items-center gap-1"><Phone size={14} /> {dealer.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => toast.info('Düzenleme formu hazırlanıyor')}>Düzenle</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Sol: Bayi Finansal Özeti */}
        <div className="md:col-span-1 space-y-6">
          <PageCard title="Ticari Koşullar" icon={Wallet}>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">İskonto Oranı</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">% {dealer.discount_rate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Kredi Limiti</span>
                <span className="font-bold text-slate-700">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(dealer.credit_limit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">Ödeme Vadesi</span>
                <span className="font-semibold text-slate-700">{dealer.payment_terms} Gün</span>
              </div>
              {dealer.tax_no && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Vergi No</span>
                  <span className="font-mono text-sm text-slate-700">{dealer.tax_no}</span>
                </div>
              )}
            </div>
          </PageCard>

          {dealer.address && (
            <PageCard title="Adres Bilgileri" icon={MapPin}>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{dealer.address}</p>
            </PageCard>
          )}

          {dealer.notes && (
            <PageCard title="Özel Notlar" icon={FileText}>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{dealer.notes}</p>
            </PageCard>
          )}
        </div>

        {/* Sağ: İşlemler (Siparişler ve Faturalar) */}
        <div className="md:col-span-2 space-y-6">
          
          <PageCard 
            title="Bayi Siparişleri (B2B)" 
            icon={Package}
            actions={<button className="btn-secondary btn-sm" onClick={() => toast.info('Yeni sipariş ekranı eklenecek')}>+ Sipariş</button>}
          >
            {orders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Henüz B2B siparişi bulunmuyor.
              </div>
            ) : (
              <p>Sipariş listesi...</p> // İleride eklenecek
            )}
          </PageCard>

          <PageCard 
            title="Cari Hesap & Faturalar" 
            icon={Receipt}
            actions={<button className="btn-secondary btn-sm" onClick={() => toast.info('Tahsilat ekle ekranı eklenecek')}>+ Tahsilat</button>}
          >
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Henüz fatura veya cari hareket bulunmuyor.
              </div>
            ) : (
              <p>Cari döküm...</p> // İleride eklenecek
            )}
          </PageCard>

        </div>
      </div>
    </PageShell>
  )
}
