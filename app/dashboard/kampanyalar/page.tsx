'use client'

import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Plus, Edit3, Trash2, Search, X, Tag, Calendar, BarChart3, Zap } from 'lucide-react'

interface Campaign {
  id: string; name: string; description: string
  type: 'indirim' | 'hediye' | '2al1ode' | 'kupon' | 'ozel_fiyat'
  discount_percent?: number; discount_amount?: number
  target_categories: string[]; start_date: string; end_date: string
  is_active: boolean; usage_count: number; max_usage?: number; created_at: string
}

const TYPE_CFG: Record<string,{label:string;color:string;bg:string}> = {
  indirim:   {label:'İndirim',     color:'text-emerald-400', bg:'bg-emerald-500/20'},
  hediye:    {label:'Hediye',      color:'text-purple-400',  bg:'bg-purple-500/20'},
  '2al1ode': {label:'2 Al 1 Öde', color:'text-blue-400',    bg:'bg-blue-500/20'},
  kupon:     {label:'Kupon',       color:'text-amber-400',   bg:'bg-amber-500/20'},
  ozel_fiyat:{label:'Özel Fiyat', color:'text-sky-400',  bg:'bg-sky-500/20'},
}
const CATEGORIES = ['Telefon','Aksesuar','Yedek Parça','Hizmet']

function uid(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
function load():Campaign[]{if(typeof window==='undefined')return[];try{const s=JSON.parse(localStorage.getItem('servissoft_store')||'{}');return s.campaigns||[]}catch{return[]}}
function save(c:Campaign[]){const s=JSON.parse(localStorage.getItem('servissoft_store')||'{}');s.campaigns=c;localStorage.setItem('servissoft_store',JSON.stringify(s))}

export default function KampanyalarPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([])
  const [search,setSearch]=useState('')
  const [showModal,setShowModal]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState({name:'',description:'',type:'indirim' as Campaign['type'],discount_percent:0,discount_amount:0,target_categories:[] as string[],start_date:'',end_date:'',max_usage:0})

  const reload=useCallback(()=>setCampaigns(load()),[])
  useEffect(()=>{reload()},[reload])

  const filtered=campaigns.filter(c=>{if(!search)return true;const s=search.toLowerCase();return c.name.toLowerCase().includes(s)||c.description.toLowerCase().includes(s)})
  const today=new Date().toISOString().split('T')[0]
  const stats={total:campaigns.length,active:campaigns.filter(c=>c.is_active).length,usage:campaigns.reduce((s,c)=>s+c.usage_count,0),ending:campaigns.filter(c=>c.end_date===today).length}

  const openAdd=()=>{setEditId(null);setForm({name:'',description:'',type:'indirim',discount_percent:10,discount_amount:0,target_categories:[],start_date:today,end_date:'',max_usage:0});setShowModal(true)}
  const openEdit=(c:Campaign)=>{setEditId(c.id);setForm({name:c.name,description:c.description,type:c.type,discount_percent:c.discount_percent||0,discount_amount:c.discount_amount||0,target_categories:c.target_categories,start_date:c.start_date,end_date:c.end_date,max_usage:c.max_usage||0});setShowModal(true)}

  const doSave=()=>{
    if(!form.name.trim()||!form.description.trim())return
    const now=new Date().toISOString()
    let u=[...campaigns]
    if(editId){u=u.map(c=>c.id===editId?{...c,...form,discount_percent:form.discount_percent||undefined,discount_amount:form.discount_amount||undefined,max_usage:form.max_usage||undefined}:c)}
    else{u.unshift({id:uid(),...form,discount_percent:form.discount_percent||undefined,discount_amount:form.discount_amount||undefined,max_usage:form.max_usage||undefined,is_active:true,usage_count:0,created_at:now})}
    save(u);setCampaigns(u);setShowModal(false)
  }
  const del=(id:string)=>{if(!confirm('Kampanyayı silmek istediğinize emin misiniz?'))return;const u=campaigns.filter(c=>c.id!==id);save(u);setCampaigns(u)}
  const toggle=(id:string)=>{const u=campaigns.map(c=>c.id===id?{...c,is_active:!c.is_active}:c);save(u);setCampaigns(u)}
  const toggleCat=(cat:string)=>{setForm(f=>({...f,target_categories:f.target_categories.includes(cat)?f.target_categories.filter(c=>c!==cat):[...f.target_categories,cat]}))}

  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Kampanyalar</h1><p className="text-slate-400 text-sm mt-1">İndirim ve promosyon kampanyalarınızı yönetin</p></div></div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{l:'Toplam Kampanya',v:stats.total,icon:Megaphone,c:'text-sky-400',bg:'bg-sky-500/10'},{l:'Aktif',v:stats.active,icon:Zap,c:'text-emerald-400',bg:'bg-emerald-500/10'},{l:'Toplam Kullanım',v:stats.usage,icon:BarChart3,c:'text-amber-400',bg:'bg-amber-500/10'},{l:'Bugün Biten',v:stats.ending,icon:Calendar,c:'text-red-400',bg:'bg-red-500/10'}].map((s,i)=>(
          <div key={i} className={`${s.bg} border border-white/5 rounded-xl p-4`}><div className="flex items-center gap-3"><s.icon className={s.c} size={20}/><div><p className="text-slate-400 text-xs">{s.l}</p><p className="text-white text-xl font-bold">{s.v}</p></div></div></div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kampanya ara..." className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"/></div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16}/>Yeni Kampanya</button>
      </div>

      {/* Cards */}
      {filtered.length===0?(<div className="py-16 text-center"><Megaphone className="mx-auto mb-3 text-slate-600" size={48}/><p className="text-slate-400">Kampanya bulunamadı</p><button onClick={openAdd} className="mt-3 text-sky-400 hover:text-sky-300 text-sm">İlk kampanyayı oluşturun →</button></div>):(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c=>{
            const tc=TYPE_CFG[c.type]||TYPE_CFG.indirim
            const pct=c.max_usage?Math.min((c.usage_count/c.max_usage)*100,100):0
            const isExpired=c.end_date&&new Date(c.end_date)<new Date()
            return(
              <div key={c.id} className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-sky-500/5 ${c.is_active&&!isExpired?'border-white/10':'border-white/5 opacity-60'}`}>
                <div className={`h-1 ${c.is_active&&!isExpired?'bg-gradient-to-r from-sky-500 to-purple-500':'bg-slate-700'}`}/>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div><h3 className="text-white font-semibold">{c.name}</h3><p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{c.description}</p></div>
                    <span className={`${tc.bg} ${tc.color} text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2`}>{tc.label}</span>
                  </div>

                  {(c.discount_percent||c.discount_amount)?<div className="text-lg font-bold text-emerald-400">{c.discount_percent?`%${c.discount_percent} İndirim`:`₺${c.discount_amount} İndirim`}</div>:null}

                  {c.target_categories.length>0&&<div className="flex flex-wrap gap-1">{c.target_categories.map(cat=><span key={cat} className="bg-slate-700/50 text-slate-300 text-xs px-2 py-0.5 rounded">{cat}</span>)}</div>}

                  <div className="flex items-center gap-2 text-xs text-slate-400"><Calendar size={12}/><span>{c.start_date} → {c.end_date||'Süresiz'}</span>{isExpired&&<span className="text-red-400 font-medium">Süresi Doldu</span>}</div>

                  {c.max_usage?(<div><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Kullanım</span><span className="text-white">{c.usage_count}/{c.max_usage}</span></div><div className="h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full transition-all" style={{width:`${pct}%`}}/></div></div>):<div className="text-xs text-slate-400">Kullanım: {c.usage_count}</div>}

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <button onClick={()=>toggle(c.id)} className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${c.is_active?'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{c.is_active?'Aktif':'Pasif'}</button>
                    <div className="flex items-center gap-1"><button onClick={()=>openEdit(c)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><Edit3 size={14}/></button><button onClick={()=>del(c.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={14}/></button></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={()=>setShowModal(false)}>
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editId?'Kampanya Düzenle':'Yeni Kampanya'}</h2><button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button></div>

          <div><label className="text-xs text-slate-400 block mb-1">Kampanya Adı *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
          <div><label className="text-xs text-slate-400 block mb-1">Açıklama *</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none"/></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Tür</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value as Campaign['type']})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none">{Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs text-slate-400 block mb-1">İndirim %</label><input type="number" min={0} max={100} value={form.discount_percent||''} onChange={e=>setForm({...form,discount_percent:Number(e.target.value)||0})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
          </div>

          <div><label className="text-xs text-slate-400 block mb-1">Hedef Kategoriler</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(cat=><button key={cat} onClick={()=>toggleCat(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.target_categories.includes(cat)?'bg-sky-600 text-white':'bg-slate-800 text-slate-400 hover:text-white border border-white/10'}`}>{cat}</button>)}</div></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Başlangıç</label><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Bitiş</label><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"/></div>
          </div>
          <div><label className="text-xs text-slate-400 block mb-1">Maks Kullanım (0 = sınırsız)</label><input type="number" min={0} value={form.max_usage||''} onChange={e=>setForm({...form,max_usage:Number(e.target.value)||0})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>

          <div className="flex justify-end gap-3 pt-2"><button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">İptal</button><button onClick={doSave} className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors">{editId?'Güncelle':'Oluştur'}</button></div>
        </div>
      </div>}
    </div>
  )
}
