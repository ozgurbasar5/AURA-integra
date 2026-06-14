'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Users, Search, Plus, X, Wrench, Clock, CheckCircle, MapPin, CalendarDays, Target, TrendingUp
} from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useStoreSlice } from '@/hooks/useStoreSlice'
import { getPersonnel, setPersonnel, addPersonnel, type PersonnelMember } from '@/lib/store'
import { formatDate } from '@/lib/validators'
import { ROLES } from '@/lib/constants'

const emptyForm = {
  full_name: '', role: 'teknisyen', position: '', phone: '', email: '',
  branch_name: 'Merkez Şube', hire_date: new Date().toISOString().split('T')[0],
  salary: 25000, commission_rate: 3, daily_target: 6, is_active: true,
  completed_today: 0, completed_month: 0, avg_repair_time_hours: 0, return_rate: 0, satisfaction_avg: 0,
}

export default function PersonelPage() {
  const { items: staff, saveAll, mounted } = useStoreSlice(getPersonnel, setPersonnel, 'personnel')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = staff.filter(s => {
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && s.role !== roleFilter) return false
    return true
  })

  const technicians = staff.filter(s => s.role === 'teknisyen' && s.is_active)
  const avgRepairTime = technicians.length > 0 ? technicians.reduce((s, t) => s + t.avg_repair_time_hours, 0) / technicians.length : 0

  function handleSave() {
    if (!form.full_name.trim()) { toast.error('Ad soyad zorunlu'); return }
    addPersonnel(form)
    toast.success('Personel eklendi')
    setForm(emptyForm)
    setShowModal(false)
  }

  function toggleActive(id: string) {
    saveAll(staff.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={Users}
        title="Personel Yönetimi"
        description="Ekip, performans ve yetki yönetimi"
        actions={<button onClick={() => setShowModal(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} /> Yeni Personel</button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Personel', val: staff.length, bg: 'bg-sky-50', color: 'text-sky-600', icon: Users },
          { label: 'Aktif Teknisyen', val: technicians.length, bg: 'bg-blue-50', color: 'text-blue-600', icon: Wrench },
          { label: 'Ort. Tamir Süresi', val: `${avgRepairTime.toFixed(1)} sa`, bg: 'bg-amber-50', color: 'text-amber-600', icon: Clock },
          { label: 'Bugün Tamamlanan', val: staff.reduce((s, t) => s + t.completed_today, 0), bg: 'bg-emerald-50', color: 'text-emerald-600', icon: CheckCircle },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}><m.icon size={14} className={m.color} /></div>
            <p className="text-xl font-black text-slate-900">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Personel ara..." className="input pl-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Roller</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const roleConf = ROLES[s.role as keyof typeof ROLES] || { label: s.role, color: 'bg-slate-100 text-slate-600' }
          const targetPercent = s.daily_target > 0 ? Math.min(100, Math.round(s.completed_today / s.daily_target * 100)) : 0
          return (
            <div key={s.id} className={`card p-5 hover:shadow-lg transition-all ${!s.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{s.full_name}</h4>
                    <p className="text-[10px] text-slate-400">{s.position}</p>
                  </div>
                </div>
                <button onClick={() => toggleActive(s.id)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.is_active ? 'Aktif' : 'Pasif'}
                </button>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-3 ${roleConf.color}`}>{roleConf.label}</span>
              <div className="space-y-1.5 mb-4 text-xs text-slate-500">
                {s.branch_name && <div className="flex items-center gap-1.5"><MapPin size={10} /> {s.branch_name}</div>}
                <div className="flex items-center gap-1.5"><CalendarDays size={10} /> İşe başlama: {formatDate(s.hire_date)}</div>
              </div>
              {s.role === 'teknisyen' && s.daily_target > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-500 flex items-center gap-1"><Target size={9} /> Günlük Hedef</span>
                    <span className="font-bold text-slate-700">{s.completed_today}/{s.daily_target}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${targetPercent}%` }} />
                  </div>
                </div>
              )}
              {s.role === 'teknisyen' && s.return_rate > 5 && (
                <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center gap-1.5 text-[10px] text-red-600 font-semibold">
                  <TrendingUp size={10} /> Geri dönüş oranı yüksek: %{s.return_rate}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Yeni Personel</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="label">Ad Soyad *</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Rol</label><select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="label">Pozisyon</label><input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">E-posta</label><input className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Şube</label><input className="input" value={form.branch_name} onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))} /></div>
                <div><label className="label">İşe Başlama</label><input type="date" className="input" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
              </div>
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
