'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays, Plus, X, Phone, Clock, User,
  ChevronLeft, ChevronRight, CheckCircle, ArrowRight
} from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useStoreSlice } from '@/hooks/useStoreSlice'
import {
  getAppointments, setAppointments, addAppointment, addServiceOrder,
  type Appointment
} from '@/lib/store'

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  bekliyor:   { label: 'Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700' },
  onaylandi:  { label: 'Onaylandı', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  iptal:      { label: 'İptal', bg: 'bg-red-100', text: 'text-red-700' },
  tamamlandi: { label: 'Tamamlandı', bg: 'bg-blue-100', text: 'text-blue-700' },
  gelmedi:    { label: 'Gelmedi', bg: 'bg-slate-100', text: 'text-slate-600' },
}

const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)
const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  customer_name: '', customer_phone: '', device_brand: '', device_model: '',
  fault_description: '', appointment_date: today, appointment_time: '09:00',
  duration_minutes: 30, technician_name: '',
}

export default function RandevuPage() {
  const router = useRouter()
  const { items: appointments, saveAll, mounted } = useStoreSlice(getAppointments, setAppointments, 'appointments')
  const [selectedDate, setSelectedDate] = useState(today)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const dateApps = appointments.filter(a => a.appointment_date === selectedDate)
  const stats = {
    today: appointments.filter(a => a.appointment_date === today).length,
    upcoming: appointments.filter(a => a.appointment_date >= today && a.status === 'bekliyor').length,
  }

  function changeDay(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - d.getDay() + 1 + i)
    return { date: d.toISOString().split('T')[0], dayName: d.toLocaleDateString('tr-TR', { weekday: 'short' }), dayNum: d.getDate(), isToday: d.toISOString().split('T')[0] === today }
  })

  function handleSave() {
    if (!form.customer_name || !form.customer_phone) {
      toast.error('Müşteri adı ve telefon zorunlu')
      return
    }
    addAppointment({ ...form, status: 'bekliyor' })
    toast.success('Randevu oluşturuldu')
    setForm(emptyForm)
    setShowModal(false)
  }

  function convertToService(a: Appointment) {
    const jobNo = `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    addServiceOrder({
      job_no: jobNo,
      customer_name: a.customer_name,
      customer_phone: a.customer_phone,
      device_brand: a.device_brand,
      device_model: a.device_model,
      imei: '',
      status: 'waiting_diagnosis',
      technician: a.technician_name || null,
      estimated_cost: 0,
      description: a.fault_description,
      created_at: new Date().toISOString(),
      eta: a.appointment_date,
    })
    saveAll(appointments.map(x => x.id === a.id ? { ...x, status: 'tamamlandi' as const } : x))
    toast.success(`İş emri oluşturuldu: ${jobNo}`)
    router.push('/dashboard/atolye')
  }

  function updateStatus(id: string, status: Appointment['status']) {
    saveAll(appointments.map(a => a.id === id ? { ...a, status } : a))
    toast.success('Durum güncellendi')
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        data-tour="randevu-baslik"
        icon={CalendarDays}
        title="Randevu Yönetimi"
        description="Günlük ve haftalık teknisyen ajandası"
        actions={<button data-tour="randevu-yeni-btn" onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} /> Yeni Randevu</button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bugünkü', val: stats.today, bg: 'bg-sky-50', color: 'text-sky-600', icon: CalendarDays },
          { label: 'Bekleyen', val: stats.upcoming, bg: 'bg-amber-50', color: 'text-amber-600', icon: Clock },
          { label: 'Bu Hafta', val: appointments.length, bg: 'bg-blue-50', color: 'text-blue-600', icon: CalendarDays },
          { label: 'Tamamlanan', val: appointments.filter(a => a.status === 'tamamlandi').length, bg: 'bg-emerald-50', color: 'text-emerald-600', icon: CheckCircle },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}><m.icon size={14} className={m.color} /></div>
            <p className="text-xl font-black text-slate-900">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      <div data-tour="randevu-takvim" className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeDay(-7)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={16} /></button>
          <h3 className="font-bold text-slate-900 text-sm">{new Date(selectedDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => changeDay(7)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map(d => {
            const dayCount = appointments.filter(a => a.appointment_date === d.date).length
            return (
              <button key={d.date} onClick={() => setSelectedDate(d.date)}
                className={`rounded-xl p-2 text-center transition-all border ${d.date === selectedDate ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : d.isToday ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'}`}>
                <p className="text-[10px] font-semibold uppercase">{d.dayName}</p>
                <p className="text-lg font-black">{d.dayNum}</p>
                {dayCount > 0 && <div className={`text-[9px] font-bold mt-0.5 ${d.date === selectedDate ? 'text-white/80' : 'text-sky-500'}`}>{dayCount} randevu</div>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</h3>
          <span className="text-xs text-slate-400">{dateApps.length} randevu</span>
        </div>
        {dateApps.length === 0 ? (
          <div className="py-16 text-center text-slate-400"><CalendarDays size={36} className="mx-auto mb-3 opacity-30" /><p className="font-semibold">Bu gün randevu yok</p></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {dateApps.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map(a => {
              const sc = STATUS_MAP[a.status]
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors group">
                  <div className="w-14 text-center shrink-0">
                    <p className="text-lg font-black text-sky-600">{a.appointment_time}</p>
                    <p className="text-[10px] text-slate-400">{a.duration_minutes} dk</p>
                  </div>
                  <div className="w-0.5 h-12 bg-sky-200 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.customer_name}</p>
                    <p className="text-xs text-slate-500">{a.device_brand} {a.device_model} — {a.fault_description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={9} /> {a.customer_phone}</span>
                      {a.technician_name && <span className="text-[10px] text-slate-400 flex items-center gap-1"><User size={9} /> {a.technician_name}</span>}
                    </div>
                  </div>
                  <select value={a.status} onChange={e => updateStatus(a.id, e.target.value as Appointment['status'])} className="select text-xs py-1">
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {(a.status === 'bekliyor' || a.status === 'onaylandi') && (
                    <button onClick={() => convertToService(a)} className="p-2 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 shrink-0" title="İş Emrine Dönüştür">
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Yeni Randevu</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Müşteri Adı *</label><input className="input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Ad Soyad" /></div>
                <div><label className="label">Telefon *</label><input className="input" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="0532..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Marka</label><input className="input" value={form.device_brand} onChange={e => setForm(f => ({ ...f, device_brand: e.target.value }))} /></div>
                <div><label className="label">Model</label><input className="input" value={form.device_model} onChange={e => setForm(f => ({ ...f, device_model: e.target.value }))} /></div>
              </div>
              <div><label className="label">Arıza</label><textarea className="input min-h-[60px] resize-none" value={form.fault_description} onChange={e => setForm(f => ({ ...f, fault_description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Tarih</label><input type="date" className="input" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} /></div>
                <div><label className="label">Saat</label><select className="select" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}>{HOURS.map(h => <option key={h}>{h}</option>)}</select></div>
              </div>
              <div><label className="label">Teknisyen</label><input className="input" value={form.technician_name} onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))} placeholder="Opsiyonel" /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleSave} className="btn-primary flex-1">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
