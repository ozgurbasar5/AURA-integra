'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2, Printer, CheckCircle2, MessageCircle, ExternalLink, Copy, History } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import { createServiceOrderRemote, updateServiceOrderRemote } from '@/lib/service-order-bridge'
import { onStoreChange } from '@/lib/store'
import { buildTrackingUrl as trackUrl, mapDbStatusToStore } from '@/lib/erp-features'
import { getPortalSlug } from '@/lib/business-branding'
import ServicePrintSheet, { type ServicePrintData } from '@/components/atolye/ServicePrintSheet'
import DevicePhotoGallery from '@/components/atolye/DevicePhotoGallery'
import { getBusinessBranding } from '@/lib/business-branding'
import { buildServisWhatsappMessage } from '@/utils/servisWhatsappMesaji'
import WhatsappPreviewModal from '@/components/branding/WhatsappPreviewModal'
import { uploadDevicePhoto } from '@/lib/device-photo-storage'

type HistoryRow = {
  id: string
  order_no: string
  device_brand: string
  device_model: string
  status: string
  created_at: string
  customer_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  waiting_diagnosis: 'Bekliyor',
  in_repair: 'Tamirde',
  customer_approval_pending: 'Onay',
  ready_for_pickup: 'Hazır',
  delivered: 'Teslim',
  cancelled: 'İptal',
  parts_waiting: 'Parça',
}

async function dataUrlToFile(dataUrl: string, index: number): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], `kabul-${index}.jpg`, { type: blob.type || 'image/jpeg' })
}

export default function KabulPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastJob, setLastJob] = useState<string | null>(null)
  const [lastPrint, setLastPrint] = useState<ServicePrintData | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'fis' | 'wa'>('fis')
  const [showWaPreview, setShowWaPreview] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [trackingLink, setTrackingLink] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    device_brand: 'Samsung',
    device_model: '',
    imei: '',
    description: '',
    pre_checks: [] as string[],
  })
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PRE_CHECKS = ['Ekran kırık', 'Su teması', 'Şifre var', 'Aksesuar teslim edildi', 'Yedek alındı']

  useEffect(() => {
    setMounted(true)
    return onStoreChange(() => {})
  }, [])

  // Rakip kalıbı: telefonda müşteri geçmişi
  useEffect(() => {
    const digits = form.customer_phone.replace(/\D/g, '')
    if (historyTimer.current) clearTimeout(historyTimer.current)
    if (digits.length < 10) {
      setHistory([])
      return
    }
    historyTimer.current = setTimeout(async () => {
      setHistoryLoading(true)
      try {
        const q = encodeURIComponent(digits.slice(-10))
        const res = await fetch(`/api/service-orders?search=${q}&limit=8`, { credentials: 'same-origin' })
        if (!res.ok) {
          setHistory([])
          return
        }
        const json = await res.json() as { data?: Array<Record<string, unknown>> }
        const rows = (json.data ?? []).map(r => ({
          id: String(r.id),
          order_no: String(r.order_no ?? ''),
          device_brand: String(r.device_brand ?? ''),
          device_model: String(r.device_model ?? ''),
          status: mapDbStatusToStore(String(r.status ?? '')),
          created_at: String(r.created_at ?? ''),
          customer_name: r.customer_name ? String(r.customer_name) : undefined,
        }))
        setHistory(rows)
        const firstName = rows.find(r => r.customer_name)?.customer_name
        if (firstName && !form.customer_name.trim()) {
          setForm(f => ({ ...f, customer_name: firstName }))
        }
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    }, 400)
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-lookup on phone
  }, [form.customer_phone])

  function toggleCheck(item: string) {
    setForm(f => ({
      ...f,
      pre_checks: f.pre_checks.includes(item)
        ? f.pre_checks.filter(x => x !== item)
        : [...f.pre_checks, item],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name || !form.customer_phone) {
      toast.error('Müşteri adı ve telefon zorunlu')
      return
    }
    setSaving(true)
    const { order: created, synced, error } = await createServiceOrderRemote({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      device_brand: form.device_brand,
      device_model: form.device_model || '—',
      imei: form.imei || undefined,
      description: [form.description, ...form.pre_checks].filter(Boolean).join('; '),
      status: 'waiting_diagnosis',
    })
    if (!created) {
      toast.error(error || 'Kayıt oluşturulamadı')
      setSaving(false)
      return
    }
    const slug = getPortalSlug()
    const track = trackUrl(created.job_no, slug)
    setTrackingLink(track)

    let uploadedImages: string[] = []
    if (pendingPhotos.length && created.id) {
      for (let i = 0; i < Math.min(pendingPhotos.length, 3); i++) {
        try {
          const file = await dataUrlToFile(pendingPhotos[i], i)
          const url = await uploadDevicePhoto(created.id, file)
          uploadedImages.push(url)
        } catch {
          /* devam */
        }
      }
      if (uploadedImages.length) {
        await updateServiceOrderRemote(created.id, { images: uploadedImages })
      }
    }

    const smsMsg = `${getBusinessBranding().shopName}: Cihazınız alındı. Takip: ${track}`
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: form.customer_phone, message: smsMsg }),
    }).catch(() => {})
    setLastJob(created.job_no)
    setLastOrderId(created.id)
    setLastPrint({
      jobNo: created.job_no,
      customerName: form.customer_name,
      customerPhone: form.customer_phone,
      deviceBrand: form.device_brand,
      deviceModel: form.device_model || '—',
      imei: form.imei || '-',
      description: form.description,
      status: 'Bekliyor',
      createdAt: new Date().toISOString(),
      trackingUrl: track,
    })
    setPendingPhotos([])
    if (synced) {
      toast.success(`${created.job_no} oluşturuldu`)
    } else {
      toast.warning(`${created.job_no} yerelde oluşturuldu — portalda görünmeyebilir`)
    }
    setSaving(false)
    setPreviewTab('fis')
  }

  function buildKabulWaMessage() {
    if (!lastPrint) return ''
    return buildServisWhatsappMessage({
      customer: lastPrint.customerName,
      device: `${lastPrint.deviceBrand} ${lastPrint.deviceModel}`,
      tracking_code: lastPrint.jobNo,
      status: 'Bekliyor',
      issue: lastPrint.description,
    }, getBusinessBranding())
  }

  function kabulWaUrl() {
    if (!lastPrint) return '#'
    const phone = lastPrint.customerPhone.replace(/\D/g, '').slice(-10)
    return `https://wa.me/90${phone}?text=${encodeURIComponent(buildKabulWaMessage())}`
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  return (
    <>
    <PageShell className="no-print">
      <PageHeader
        eyebrow="Hızlı İşlem"
        title="Hızlı Kabul"
        description="Tablet/kasa ekranı — 30 saniyede servis kaydı açın."
        icon={ClipboardCheck}
        data-tour="kabul-baslik"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <PageCard title="Yeni Kabul" data-tour="kabul-form">
          <form onSubmit={handleSubmit} className="space-y-4" data-tour="kabul-musteri-alanlari">
            <input className="input text-lg py-3" placeholder="Müşteri adı *" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            <input className="input text-lg py-3 font-mono" placeholder="Telefon *" required value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            {(historyLoading || history.length > 0) && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3 space-y-2" data-tour="kabul-musteri-gecmisi">
                <p className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                  <History size={13} />
                  {historyLoading ? 'Geçmiş aranıyor…' : `Bu müşteri · ${history.length} önceki iş`}
                </p>
                {!historyLoading && history.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/atolye/${h.id}`)}
                    className="w-full text-left flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs hover:bg-white border border-sky-100/80"
                  >
                    <span className="font-mono font-bold text-slate-800">{h.order_no}</span>
                    <span className="text-slate-600 truncate flex-1">{h.device_brand} {h.device_model}</span>
                    <span className="text-slate-400 shrink-0">{STATUS_LABEL[h.status] || h.status}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3" data-tour="kabul-cihaz-alanlari">
              <select className="input" value={form.device_brand} onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))}>
                {['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer'].map(b => <option key={b}>{b}</option>)}
              </select>
              <input className="input" placeholder="Model" value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} />
            </div>
            <input className="input font-mono" placeholder="IMEI" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} />
            <textarea className="input resize-none" rows={3} placeholder="Arıza / not" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div data-tour="kabul-on-kontrol">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Ön kontrol</p>
              <div className="flex flex-wrap gap-2">
                {PRE_CHECKS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCheck(c)}
                    className={`filter-chip ${form.pre_checks.includes(c) ? 'filter-chip-active' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div data-tour="kabul-foto">
              <DevicePhotoGallery
                images={pendingPhotos}
                onChange={setPendingPhotos}
                disabled={saving}
              />
            </div>
            <button type="submit" disabled={saving} data-tour="kabul-kayit-btn" className="btn-primary w-full py-4 text-base rounded-2xl">
              {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Kaydı Oluştur & Atölyeye Git'}
            </button>
          </form>
        </PageCard>

        <PageCard title="Son Kayıt & Önizleme" data-tour="kabul-onizleme">
          {lastJob && lastPrint ? (
            <div className="space-y-4">
              <div className="text-center py-4 border-b border-slate-100">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-mono text-xl font-black text-slate-900">{lastJob}</p>
                <code className="block text-[10px] bg-slate-100 p-2 rounded-lg break-all mt-2 text-slate-600">
                  {trackingLink ?? (typeof window !== 'undefined' ? trackUrl(lastJob, getPortalSlug()) : `/takip?q=${lastJob}`)}
                </code>
                <button
                  type="button"
                  className="mt-2 btn-secondary btn-sm inline-flex items-center gap-1.5"
                  onClick={() => {
                    const link = trackingLink ?? trackUrl(lastJob, getPortalSlug())
                    void navigator.clipboard.writeText(link).then(() => toast.success('Portal linki kopyalandı'))
                  }}
                >
                  <Copy size={14} /> Portal linkini kopyala
                </button>
              </div>

              <div className="flex gap-2">
                {(['fis', 'wa'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPreviewTab(tab)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      previewTab === tab ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab === 'fis' ? 'Servis Fişi' : 'WhatsApp'}
                  </button>
                ))}
              </div>

              {previewTab === 'fis' ? (
                <ServicePrintSheet data={lastPrint} mode="preview" />
              ) : (
                <div className="rounded-xl bg-[#e5ddd5] p-4">
                  <div className="bg-white rounded-lg p-3 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {buildKabulWaMessage().replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1')}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={() => window.print()} className="btn-secondary btn-sm flex items-center gap-2">
                  <Printer size={14} /> Yazdır
                </button>
                <button type="button" onClick={() => setShowWaPreview(true)} className="btn-secondary btn-sm flex items-center gap-2">
                  <MessageCircle size={14} /> WA Önizle
                </button>
                <a href={kabulWaUrl()} target="_blank" rel="noreferrer" className="btn-sm rounded-xl bg-[#25D366] text-white px-3 py-2 text-sm font-semibold flex items-center gap-1.5">
                  <MessageCircle size={14} /> Gönder
                </a>
                {lastOrderId && (
                  <button type="button" onClick={() => router.push(`/dashboard/atolye/${lastOrderId}`)} className="btn-primary btn-sm ml-auto flex items-center gap-1.5">
                    <ExternalLink size={14} /> Atölyeye Git
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Kayıt oluşturunca fiş ve WhatsApp önizlemesi burada görünür</p>
          )}
        </PageCard>
      </div>
    </PageShell>

    {lastPrint && <ServicePrintSheet data={lastPrint} />}

    <WhatsappPreviewModal
      open={showWaPreview}
      onClose={() => setShowWaPreview(false)}
      message={buildKabulWaMessage()}
      phone={lastPrint?.customerPhone}
      waUrl={kabulWaUrl()}
    />
    </>
  )
}
