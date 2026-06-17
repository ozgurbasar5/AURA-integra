'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2, Printer, CheckCircle2, MessageCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import { createServiceOrderRemote } from '@/lib/service-order-bridge'
import {
  generateNextJobNo, onStoreChange,
} from '@/lib/store'
import { buildTrackingUrl as trackUrl } from '@/lib/erp-features'
import { getPortalSlug } from '@/lib/business-branding'
import ServicePrintSheet, { type ServicePrintData } from '@/components/atolye/ServicePrintSheet'
import { getBusinessBranding } from '@/lib/business-branding'
import { buildServisWhatsappMessage } from '@/utils/servisWhatsappMesaji'
import WhatsappPreviewModal from '@/components/branding/WhatsappPreviewModal'

export default function KabulPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastJob, setLastJob] = useState<string | null>(null)
  const [lastPrint, setLastPrint] = useState<ServicePrintData | null>(null)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'fis' | 'wa'>('fis')
  const [showWaPreview, setShowWaPreview] = useState(false)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    device_brand: 'Samsung',
    device_model: '',
    imei: '',
    description: '',
    pre_checks: [] as string[],
  })

  const PRE_CHECKS = ['Ekran kırık', 'Su teması', 'Şifre var', 'Aksesuar teslim edildi', 'Yedek alındı']

  useEffect(() => {
    setMounted(true)
    return onStoreChange(() => {})
  }, [])

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
    const jobNo = generateNextJobNo()
    const { order: created, synced } = await createServiceOrderRemote({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      device_brand: form.device_brand,
      device_model: form.device_model || '—',
      imei: form.imei || undefined,
      description: [form.description, ...form.pre_checks].filter(Boolean).join('; '),
      status: 'waiting_diagnosis',
    })
    const slug = getPortalSlug()
    const track = trackUrl(created.job_no, slug)
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
    })
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
        title="Kasa Kabul"
        description="Tablet/kasa ekranı — 30 saniyede servis kaydı açın."
        icon={ClipboardCheck}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <PageCard title="Yeni Kabul">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="input text-lg py-3" placeholder="Müşteri adı *" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            <input className="input text-lg py-3 font-mono" placeholder="Telefon *" required value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={form.device_brand} onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))}>
                {['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer'].map(b => <option key={b}>{b}</option>)}
              </select>
              <input className="input" placeholder="Model" value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} />
            </div>
            <input className="input font-mono" placeholder="IMEI" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} />
            <textarea className="input resize-none" rows={3} placeholder="Arıza / not" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div>
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
            <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base rounded-2xl">
              {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Kaydı Oluştur & Atölyeye Git'}
            </button>
          </form>
        </PageCard>

        <PageCard title="Son Kayıt & Önizleme">
          {lastJob && lastPrint ? (
            <div className="space-y-4">
              <div className="text-center py-4 border-b border-slate-100">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-mono text-xl font-black text-slate-900">{lastJob}</p>
                <code className="block text-[10px] bg-slate-100 p-2 rounded-lg break-all mt-2 text-slate-600">
                  {typeof window !== 'undefined' ? trackUrl(lastJob, getPortalSlug()) : `/takip?q=${lastJob}`}
                </code>
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
