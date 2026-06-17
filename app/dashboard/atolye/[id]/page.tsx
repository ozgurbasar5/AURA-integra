'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Printer, MessageCircle, Phone, User, Wrench,
  Package, Loader2, CheckCircle2, Plus, Trash2, X, Lock, EyeOff, Eye, FileText,
} from 'lucide-react'
import { buildServisWhatsappMessage } from '@/utils/servisWhatsappMesaji'
import { getBusinessBranding } from '@/lib/business-branding'
import ServicePrintSheet from '@/components/atolye/ServicePrintSheet'
import WhatsappPreviewModal from '@/components/branding/WhatsappPreviewModal'
import {
  updateServiceStatus, updateServiceOrder,
  addServiceExpense, removeServiceExpense, getServiceExpenses, getServiceProfitPreview,
  getStock, usePartsForService, getPersonnel, getStatusHistory,
  deliverService, getServiceDelivery, canDeliverService,
  type StoreServiceOrder,
} from '@/lib/store'
import ExpertiseModal from '@/components/atolye/ExpertiseModal'
import { QC_CHECKLIST, qcProgress, getCompatibleParts, buildApprovalUrl } from '@/lib/erp-features'
import { fetchServiceOrderById, updateServiceOrderRemote } from '@/lib/service-order-bridge'
import { useUserRole } from '@/lib/role-context'

const STATUSES: Record<string, { label: string; cls: string }> = {
  waiting_diagnosis: { label: 'Bekliyor', cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  in_repair: { label: 'Tamirde', cls: 'bg-sky-500/15 text-sky-800 dark:text-sky-300' },
  customer_approval_pending: { label: 'Onay Bekliyor', cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  ready_for_pickup: { label: 'Teslime Hazır', cls: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' },
  delivered: { label: 'Teslim Edildi', cls: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200' },
  cancelled: { label: 'İptal', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' },
}

const STATUS_OPTIONS = Object.keys(STATUSES)

interface Part { id: string; name: string; quantity: number; unit_cost: number; unit_price: number }

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

export default function AtolyeDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { canDeliver, canEditPricing, canSeeFinance } = useUserRole()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<StoreServiceOrder | undefined>(undefined)
  const [parts, setParts] = useState<Part[]>([])
  const [notes, setNotes] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [price, setPrice] = useState(0)
  const [status, setStatus] = useState('waiting_diagnosis')
  const [showPartForm, setShowPartForm] = useState(false)
  const [partForm, setPartForm] = useState({ stock_id: '', qty: '1' })
  const [profit, setProfit] = useState({ netProfit: 0, totalExpense: 0, profitMargin: 0 })
  const [finalChecks, setFinalChecks] = useState<string[]>([])
  const [compatible, setCompatible] = useState<ReturnType<typeof getCompatibleParts>>([])
  const [showWaPreview, setShowWaPreview] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showExpertise, setShowExpertise] = useState(false)
  const [technician, setTechnician] = useState<string>('')
  const personnel = getPersonnel().filter(p => p.is_active)
  const statusTimeline = getStatusHistory(id)

  const load = useCallback(async () => {
    setLoading(true)
    const o = await fetchServiceOrderById(id)
    if (o) {
      setOrder(o)
      setNotes(o.notes || '')
      setPrivateNote(o.private_note || '')
      setPrice(o.actual_cost || o.estimated_cost || 0)
      setStatus(o.status || 'waiting_diagnosis')
      setTechnician(o.technician || '')
      setParts((o.used_parts || []).map(p => ({
        id: p.id, name: p.name, quantity: p.qty,
        unit_cost: p.unit_buy, unit_price: p.unit_sell,
      })))
      setFinalChecks(o.final_checks || [])
      setCompatible(getCompatibleParts(getStock(), o.device_brand, o.device_model))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (order) setProfit(getServiceProfitPreview(id, price))
  }, [order, id, price, parts])

  const isDone = status === 'delivered'

  async function handleSave() {
    if (!order) return
    setSaving(true)
    updateServiceOrder(id, {
      notes, private_note: privateNote, actual_cost: price, estimated_cost: price, status,
      technician: technician || null,
      final_checks: finalChecks,
      used_parts: parts.map(p => ({
        id: p.id, name: p.name, qty: p.quantity,
        unit_buy: p.unit_cost, unit_sell: p.unit_price,
      })),
    })
    await updateServiceOrderRemote(id, {
      status, actual_cost: price, estimated_cost: price, notes,
    })
    setOrder(prev => prev ? { ...prev, notes, private_note: privateNote, actual_cost: price, status, technician: technician || null } : prev)
    toast.success('Kaydedildi')
    setSaving(false)
  }

  function handleStatusChange(v: string) {
    if (v === 'delivered') {
      handleDeliver()
      return
    }
    setStatus(v)
    updateServiceStatus(id, v)
    void updateServiceOrderRemote(id, { status: v })
    toast.success(`Durum: ${STATUSES[v]?.label || v}`)
  }

  function addPart() {
    if (!partForm.stock_id || !order) return
    const stockItem = compatible.find(s => s.id === partForm.stock_id) || getStock().find(s => s.id === partForm.stock_id)
    if (!stockItem) { toast.error('Parça seçin'); return }
    const qty = Number(partForm.qty) || 1
    if (stockItem.stock_qty < qty) {
      toast.error(`Yetersiz stok (${stockItem.stock_qty} adet)`)
      return
    }
    const unitCost = stockItem.buy_price
    const unitSell = stockItem.sell_price || stockItem.buy_price
    const p: Part = {
      id: stockItem.id,
      name: stockItem.name,
      quantity: qty,
      unit_cost: unitCost,
      unit_price: unitSell,
    }
    usePartsForService(
      [{ stock_id: stockItem.id, name: stockItem.name, qty, unit_buy: unitCost, unit_sell: unitSell }],
      order.job_no,
      order.customer_name,
    )
    setParts(prev => [...prev, p])
    setCompatible(getCompatibleParts(getStock(), order.device_brand, order.device_model))
    setPartForm({ stock_id: '', qty: '1' })
    setShowPartForm(false)
    toast.success('Parça eklendi — stok düşüldü, maliyet güncellendi')
  }

  function removePart(partId: string) {
    setParts(prev => prev.filter(p => p.id !== partId))
    const exp = getServiceExpenses(id).find(e => e.reference_id === partId)
    if (exp) removeServiceExpense(id, exp.id)
  }

  function toggleQc(item: string) {
    if (isDone) return
    setFinalChecks(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  function handleDeliver() {
    if (!order || price <= 0) { toast.warning('Ücret girin'); return }
    const check = canDeliverService(id)
    if (!check.ok) { toast.error(check.reason || 'Teslim edilemez'); return }
    updateServiceOrder(id, { final_checks: finalChecks })
    const result = deliverService(id, price, order.job_no, order.customer_name, 'nakit')
    if (!result) { toast.error('Teslim kaydedilemedi'); return }
    setStatus('delivered')
    updateServiceStatus(id, 'delivered')
    void updateServiceOrderRemote(id, { status: 'delivered' })
    toast.success(`Teslim edildi · Kâr: ${fmt(profit.netProfit)}`)
  }

  function buildWaMessage() {
    if (!order) return ''
    return buildServisWhatsappMessage({
      customer: order.customer_name,
      device: `${order.device_brand} ${order.device_model}`,
      tracking_code: order.job_no,
      status: STATUSES[status]?.label || status,
      price,
      serial_no: order.imei,
      notes,
    }, getBusinessBranding())
  }

  function waUrl() {
    if (!order) return '#'
    const phone = order.customer_phone.replace(/\D/g, '').slice(-10)
    return `https://wa.me/90${phone}?text=${encodeURIComponent(buildWaMessage())}`
  }

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }
  if (!order) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500 mb-4">Kayıt bulunamadı</p>
        <Link href="/dashboard/atolye" className="btn-primary text-sm">Atölyeye dön</Link>
      </div>
    )
  }

  const st = STATUSES[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  const delivery = getServiceDelivery(id)
  const qc = qcProgress(finalChecks)
  const approvalLink = order.approval_token ? buildApprovalUrl(order.approval_token) : null

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-5 pb-12 no-print">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button type="button" onClick={() => router.back()} className="btn-ghost btn-sm mt-1">
          <ArrowLeft size={16} /> Geri
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black font-mono text-[var(--text-primary)]">{order.job_no}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{order.device_brand} {order.device_model}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowExpertise(true)} className="btn-secondary btn-sm">
            <FileText size={14} /> Ekspertiz
          </button>
          <button type="button" onClick={() => setShowWaPreview(true)} className="btn-secondary btn-sm">
            <Eye size={14} /> WA Önizle
          </button>
          <a href={waUrl()} target="_blank" rel="noreferrer" className="btn-sm rounded-xl bg-[#25D366] text-white hover:opacity-90 px-3 py-2 font-semibold text-sm flex items-center gap-1.5">
            <MessageCircle size={14} /> WhatsApp
          </a>
          <button type="button" onClick={() => setShowPrintPreview(v => !v)} className="btn-secondary btn-sm">
            <Eye size={14} /> {showPrintPreview ? 'Fiş Gizle' : 'Fiş Önizle'}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-secondary btn-sm"><Printer size={14} /> Yazdır</button>
          {!isDone && canDeliver && (
            <button type="button" onClick={handleDeliver} className="btn-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 font-semibold text-sm">
              <CheckCircle2 size={14} /> Teslim Et
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Kaydet
          </button>
        </div>
      </div>

      {showPrintPreview && (
        <div className="surface p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Servis Fişi Önizleme</p>
          <ServicePrintSheet
            mode="preview"
            data={{
              jobNo: order.job_no,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              deviceBrand: order.device_brand,
              deviceModel: order.device_model,
              imei: order.imei,
              description: order.description,
              status: st.label,
              price,
              notes,
              createdAt: order.created_at,
            }}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Müşteri & Cihaz */}
        <div className="surface p-5 space-y-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><User size={15} className="text-sky-500" /> Müşteri</h2>
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">{order.customer_name}</p>
            <a href={`tel:${order.customer_phone}`} className="text-sm text-sky-600 flex items-center gap-1 mt-1">
              <Phone size={13} /> {order.customer_phone}
            </a>
          </div>
          <hr className="border-[var(--bg-border)]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><Wrench size={15} className="text-sky-500" /> Cihaz</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-[var(--text-muted)]">Marka / Model</dt>
            <dd className="font-medium text-[var(--text-primary)]">{order.device_brand} {order.device_model}</dd>
            {order.imei && <><dt className="text-[var(--text-muted)]">IMEI</dt><dd className="font-mono text-[var(--text-primary)]">{order.imei}</dd></>}
            {order.color && <><dt className="text-slate-400">Renk</dt><dd>{order.color}</dd></>}
            {order.password && <><dt className="text-slate-400">Şifre</dt><dd className="font-mono">{order.password}</dd></>}
          </dl>
          {order.description && (
            <div className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm text-[var(--text-secondary)]">{order.description}</div>
          )}

          {/* Özel not — sadece ekip görür */}
          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
            <label className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-300 uppercase tracking-wider mb-2">
              <Lock size={13} /> Özel Not
              <span className="font-normal normal-case text-[var(--text-muted)]">— müşteri görmez</span>
            </label>
            <textarea
              rows={3}
              className="input resize-none border-violet-500/20 bg-[var(--bg-card)] focus:ring-violet-500/30"
              value={privateNote}
              onChange={e => setPrivateNote(e.target.value)}
              placeholder="Ekip içi gizli not: parça kaynağı, müşteri hassasiyeti, tekrar arıza..."
              disabled={isDone}
            />
          </div>
        </div>

        {/* İşlem */}
        <div className="space-y-4">
          <div className="surface p-5 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Durum & Ücret</h2>
            <select className="select" value={status} onChange={e => handleStatusChange(e.target.value)} disabled={isDone}>
              {STATUS_OPTIONS.map(k => <option key={k} value={k}>{STATUSES[k].label}</option>)}
            </select>
            <div>
              <label className="label">Teknisyen</label>
              <select
                className="select"
                value={technician}
                onChange={e => {
                  const name = e.target.value
                  setTechnician(name)
                  updateServiceOrder(id, { technician: name || null })
                }}
                disabled={isDone}
              >
                <option value="">Atanmadı</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.full_name}>{p.full_name} — {p.position}</option>
                ))}
              </select>
            </div>
            {canEditPricing && (
              <>
                <div>
                  <label className="label">Toplam Ücret (₺)</label>
                  <input type="number" className="input text-lg font-bold" value={price || ''} onChange={e => setPrice(Number(e.target.value))} disabled={isDone} />
                </div>
                {canSeeFinance && (
                  <div className="rounded-xl bg-[var(--bg-muted)] p-3 flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Net kâr</span>
                    <span className={`font-bold ${profit.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(profit.netProfit)}</span>
                  </div>
                )}
              </>
            )}
            {!canEditPricing && price > 0 && (
              <p className="text-sm text-[var(--text-secondary)]">Ücret: <strong>{fmt(price)}</strong></p>
            )}
            {delivery?.financial_posted && (
              <p className="text-xs text-emerald-600 font-medium">Finansa yazıldı</p>
            )}
            {approvalLink && status === 'customer_approval_pending' && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs">
                <p className="font-bold text-amber-800 mb-1">Müşteri onay linki</p>
                <code className="block break-all text-amber-900">{approvalLink}</code>
              </div>
            )}
            <Link href="/dashboard/tedarik" className="text-xs font-bold text-sky-600 hover:underline block">Parça siparişi oluştur →</Link>
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Kalite Kontrol</h2>
              <span className="text-xs font-bold text-slate-500">{qc.done}/{qc.total}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {QC_CHECKLIST.map(item => (
                <label key={item} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={finalChecks.includes(item)} onChange={() => toggleQc(item)} disabled={isDone} className="rounded border-slate-300" />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {statusTimeline.length > 0 && (
            <div className="surface p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Durum Geçmişi</h2>
              <ol className="space-y-2 max-h-48 overflow-y-auto">
                {statusTimeline.map(entry => (
                  <li key={entry.id} className="text-xs border-l-2 border-sky-400 pl-3 py-0.5">
                    <span className="font-bold text-[var(--text-primary)]">{STATUSES[entry.status]?.label ?? entry.status}</span>
                    {entry.note && <span className="text-[var(--text-muted)]"> — {entry.note}</span>}
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {new Date(entry.created_at).toLocaleString('tr-TR')}
                      {entry.user ? ` · ${entry.user}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {compatible.length > 0 && (
            <div className="surface p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Uyumlu Stok</h2>
              <ul className="space-y-1">
                {compatible.slice(0, 4).map(p => (
                  <li key={p.id} className="flex justify-between text-xs text-slate-600">
                    <span>{p.name}</span>
                    <span className="font-bold">{p.stock_qty} adet</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Package size={15} className="text-sky-500" /> Parçalar</h2>
              {!isDone && (
                <button type="button" onClick={() => setShowPartForm(true)} className="text-xs font-bold text-sky-600 flex items-center gap-1">
                  <Plus size={12} /> Ekle
                </button>
              )}
            </div>
            {parts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Parça yok</p>
            ) : (
              <ul className="space-y-2">
                {parts.map(p => (
                  <li key={p.id} className="flex justify-between items-center text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span>{p.name} ×{p.quantity}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmt(p.quantity * p.unit_price)}</span>
                      {!isDone && <button type="button" onClick={() => removePart(p.id)} className="text-red-400"><Trash2 size={13} /></button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-5">
            <label className="label flex items-center gap-1.5">
              <EyeOff size={12} /> Servis Notu
              <span className="font-normal normal-case text-[var(--text-muted)]">— müşteriye gösterilebilir</span>
            </label>
            <textarea rows={3} className="input resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tamir detayı, yapılan işlem..." disabled={isDone} />
          </div>
        </div>
      </div>

      {showPartForm && (
        <div className="modal-overlay" onClick={() => setShowPartForm(false)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header py-4 px-5">
              <h3 className="font-bold">Parça Ekle</h3>
              <button type="button" onClick={() => setShowPartForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3 py-4 px-5">
              {compatible.length === 0 ? (
                <p className="text-sm text-slate-500">Bu cihaz için uyumlu stok parçası yok. Önce stok modülünden parça ekleyin.</p>
              ) : (
                <>
                  <div>
                    <label className="label">Stoktan parça seç *</label>
                    <select
                      className="select w-full"
                      value={partForm.stock_id}
                      onChange={e => setPartForm(f => ({ ...f, stock_id: e.target.value }))}
                    >
                      <option value="">— Seçin —</option>
                      {compatible.map(s => (
                        <option key={s.id} value={s.id} disabled={s.stock_qty <= 0}>
                          {s.name} ({s.stock_qty} adet · Alış {fmt(s.buy_price)} · Satış {fmt(s.sell_price)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input type="number" className="input" placeholder="Adet" min={1} value={partForm.qty} onChange={e => setPartForm(f => ({ ...f, qty: e.target.value }))} />
                </>
              )}
            </div>
            <div className="modal-footer py-4 px-5">
              <button type="button" onClick={() => setShowPartForm(false)} className="btn-secondary flex-1">İptal</button>
              <button type="button" onClick={addPart} disabled={!partForm.stock_id} className="btn-primary flex-1">Ekle</button>
            </div>
          </div>
        </div>
      )}
    </div>

    <ServicePrintSheet
      data={{
        jobNo: order.job_no,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deviceBrand: order.device_brand,
        deviceModel: order.device_model,
        imei: order.imei,
        description: order.description,
        status: st.label,
        price,
        notes,
        createdAt: order.created_at,
      }}
    />

    <WhatsappPreviewModal
      open={showWaPreview}
      onClose={() => setShowWaPreview(false)}
      message={buildWaMessage()}
      phone={order.customer_phone}
      waUrl={waUrl()}
    />

    <ExpertiseModal
      open={showExpertise}
      onClose={() => setShowExpertise(false)}
      jobNo={order.job_no}
      customerName={order.customer_name}
    />
    </>
  )
}
