'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Shield, FileText, CheckCircle, AlertTriangle, 
  Wrench, Printer, Send, Clock, Ban
} from 'lucide-react'
import { type WarrantyRecord, type WarrantyClaimRequest } from '@/lib/store'
import { formatDate } from '@/lib/validators'

export default function GarantiDetayPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [warranty, setWarranty] = useState<WarrantyRecord | null>(null)
  const [claims, setClaims] = useState<WarrantyClaimRequest[]>([])
  const [mounted, setMounted] = useState(false)
  
  const [issueDesc, setIssueDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenant/warranties/${id}`)
      const data = await res.json()
      if (res.ok) setWarranty(data.item)
      
      const claimsRes = await fetch(`/api/tenant/warranties/${id}/claim`)
      const claimsData = await claimsRes.json()
      if (claimsRes.ok) setClaims(claimsData.items || [])
    } catch {
      toast.error('Veriler yüklenemedi')
    } finally {
      setMounted(true)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
  if (!warranty) return <div className="p-8 text-center text-slate-500">Garanti kaydı bulunamadı.</div>

  const daysLeft = Math.ceil((new Date(warranty.end_date).getTime() - Date.now()) / 86400000)
  const isActive = warranty.status === 'aktif' && daysLeft > 0

  async function handleClaimSubmit() {
    if (!issueDesc.trim()) { toast.error('Lütfen bir sorun açıklaması girin.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tenant/warranties/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_description: issueDesc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast.success('Talep oluşturuldu')
      setIssueDesc('')
      load() // refresh all
    } catch (e: any) {
      toast.error(e.message || 'Talep oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePrintCertificate() {
    window.open(`/api/tenant/warranties/${id}/certificate`, '_blank')
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/dashboard/garanti')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft size={16} /> Geri
        </button>
        <button onClick={handlePrintCertificate} className="btn-secondary flex items-center gap-2 text-sm">
          <Printer size={16} /> Garanti Belgesi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sol Kolon: Garanti Detayları */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6 border-t-4 border-sky-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">{warranty.device_brand} {warranty.device_model}</h1>
                <p className="text-sm font-semibold text-slate-500">Müşteri: {warranty.customer_name}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {warranty.status.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm mb-6">
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">IMEI / Seri No</p>
                <p className="font-mono text-slate-800">{warranty.imei || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Fatura No</p>
                <p className="text-slate-800">{warranty.invoice_no || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Süre</p>
                <p className="text-slate-800">{warranty.warranty_months} Ay</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Başlangıç</p>
                <p className="text-slate-800">{formatDate(warranty.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Bitiş</p>
                <p className={`font-semibold ${daysLeft <= 30 && isActive ? 'text-amber-600' : 'text-slate-800'}`}>
                  {formatDate(warranty.end_date)}
                  {isActive && <span className="ml-1 text-[10px] text-slate-400">({daysLeft} gün)</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase">Servis Kaydı</p>
                <p className="text-sky-600 font-mono font-bold">{warranty.order_no || '-'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Kapsamdaki Parçalar</p>
              <div className="flex flex-wrap gap-2">
                {warranty.covered_parts?.map(p => (
                  <span key={p} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-semibold">{p}</span>
                ))}
              </div>
            </div>

            {warranty.exclusion_reasons && warranty.exclusion_reasons.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-4">
                <p className="text-xs text-slate-400 font-semibold mb-2 uppercase text-red-500">Kapsam Dışı Nedenler</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {warranty.exclusion_reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Yeni Talep Oluştur */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} /> Yeni Garanti Talebi
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Müşteri Şikayeti / Sorun Açıklaması</label>
                <textarea 
                  className="input min-h-[100px]" 
                  placeholder="Cihazın ekranı tepki vermiyor..."
                  value={issueDesc}
                  onChange={e => setIssueDesc(e.target.value)}
                />
              </div>
              <button 
                onClick={handleClaimSubmit} 
                disabled={submitting || !isActive}
                className="btn-primary w-full flex justify-center items-center gap-2"
              >
                {submitting ? 'Değerlendiriliyor...' : 'Talebi İlet ve Değerlendir'}
              </button>
              {!isActive && (
                <p className="text-xs text-red-500 text-center">Bu garanti aktif olmadığı için yeni talep açılamaz.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Talep Geçmişi */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" /> Talep Geçmişi
            </h3>
            
            {claims.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Henüz bir garanti talebi açılmamış.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {claims.map((claim) => (
                  <div key={claim.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-200 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {claim.resolution === 'ret' || claim.resolution === 'ücretli' ? (
                         <Ban size={10} className="text-red-500" />
                      ) : (
                         <CheckCircle size={10} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] card p-3 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 capitalize">{claim.status}</span>
                        <time className="text-[10px] text-slate-400">{new Date(claim.created_at).toLocaleDateString('tr-TR')}</time>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2" title={claim.issue_description}>{claim.issue_description}</p>
                      {claim.resolution && (
                        <div className={`mt-2 text-[10px] font-bold px-2 py-1 rounded w-fit 
                          ${claim.resolution === 'ücretsiz_onarım' || claim.resolution === 'parça_değişimi' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          Çözüm: {claim.resolution.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
