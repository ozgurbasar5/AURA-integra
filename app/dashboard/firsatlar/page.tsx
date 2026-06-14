'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, Plus, Edit3, Trash2, Search, X, Clock, TrendingUp, Package, Zap } from 'lucide-react'
import { getDeals, setDeals as setDealsStore, onStoreChange, type Deal } from '@/lib/store'

function uid(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
function fmt(n:number){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n)}
function daysLeft(end:string){const d=Math.ceil((new Date(end).getTime()-Date.now())/(86400000));return d}

export default function FirsatlarPage(){
  const [deals,setDeals]=useState<Deal[]>([])
  const [search,setSearch]=useState('')
  const [showModal,setShowModal]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState({title:'',product_name:'',original_price:0,deal_price:0,stock_count:10,category:'Telefon',end_date:'',description:''})

  const reload=useCallback(()=>setDeals(getDeals()),[])
  useEffect(()=>{reload();return onStoreChange(m=>{if(m==='deals'||m==='seed')reload()})},[reload])

  const filtered=deals.filter(d=>{if(!search)return true;const s=search.toLowerCase();return d.title.toLowerCase().includes(s)||d.product_name.toLowerCase().includes(s)})
  const stats={
    total:deals.length,
    active:deals.filter(d=>d.is_active).length,
    sold:deals.reduce((s,d)=>s+d.sold_count,0),
    revenue:deals.reduce((s,d)=>s+d.sold_count*d.deal_price,0),
  }

  const openAdd=()=>{setEditId(null);setForm({title:'',product_name:'',original_price:0,deal_price:0,stock_count:10,category:'Telefon',end_date:'',description:''});setShowModal(true)}
  const openEdit=(d:Deal)=>{setEditId(d.id);setForm({title:d.title,product_name:d.product_name,original_price:d.original_price,deal_price:d.deal_price,stock_count:d.stock_count,category:d.category,end_date:d.end_date,description:d.description||''});setShowModal(true)}

  const doSave=()=>{
    if(!form.title.trim()||!form.product_name.trim()||!form.deal_price)return
    let u=[...deals]
    if(editId){u=u.map(d=>d.id===editId?{...d,...form}:d)}
    else{u.unshift({id:uid(),...form,sold_count:0,is_active:true,created_at:new Date().toISOString()})}
    setDealsStore(u);setDeals(u);setShowModal(false)
  }
  const del=(id:string)=>{if(!confirm('Fırsatı silmek istediğinize emin misiniz?'))return;const u=deals.filter(d=>d.id!==id);setDealsStore(u);setDeals(u)}
  const toggle=(id:string)=>{const u=deals.map(d=>d.id===id?{...d,is_active:!d.is_active}:d);setDealsStore(u);setDeals(u)}

  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Fırsatlar</h1><p className="text-slate-400 text-sm mt-1">Özel teklifler ve indirimli ürünleri yönetin</p></div></div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{l:'Toplam Fırsat',v:stats.total,icon:Tag,c:'text-sky-400',bg:'bg-sky-500/10'},
          {l:'Aktif',v:stats.active,icon:Zap,c:'text-emerald-400',bg:'bg-emerald-500/10'},
          {l:'Satılan',v:stats.sold,icon:Package,c:'text-amber-400',bg:'bg-amber-500/10'},
          {l:'Gelir',v:fmt(stats.revenue),icon:TrendingUp,c:'text-sky-400',bg:'bg-sky-500/10'}
        ].map((s,i)=>(
          <div key={i} className={`${s.bg} border border-white/5 rounded-xl p-4`}><div className="flex items-center gap-3"><s.icon className={s.c} size={20}/><div><p className="text-slate-400 text-xs">{s.l}</p><p className="text-white text-xl font-bold">{typeof s.v==='number'?s.v:s.v}</p></div></div></div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Fırsat ara..." className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"/></div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16}/>Yeni Fırsat</button>
      </div>

      {/* Cards */}
      {filtered.length===0?(
        <div className="py-16 text-center"><Tag className="mx-auto mb-3 text-slate-600" size={48}/><p className="text-slate-400">Fırsat bulunamadı</p><button onClick={openAdd} className="mt-3 text-sky-400 hover:text-sky-300 text-sm">İlk fırsatı oluşturun →</button></div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d=>{
            const saving=d.original_price>0?Math.round((1-d.deal_price/d.original_price)*100):0
            const remaining=d.stock_count-d.sold_count
            const dl=d.end_date?daysLeft(d.end_date):null
            const stockPct=d.stock_count>0?Math.min((d.sold_count/d.stock_count)*100,100):0
            return(
              <div key={d.id} className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-sky-500/5 group ${d.is_active?'border-white/10':'border-white/5 opacity-60'}`}>
                {/* Discount badge */}
                {saving>0&&<div className="relative"><div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg z-10">%{saving} İndirim</div></div>}
                <div className="p-5 space-y-3">
                  <div><span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">{d.category}</span></div>
                  <h3 className="text-white font-semibold text-lg">{d.title}</h3>
                  <p className="text-slate-400 text-sm">{d.product_name}</p>
                  {d.description&&<p className="text-slate-500 text-xs line-clamp-2">{d.description}</p>}

                  {/* Pricing */}
                  <div className="flex items-baseline gap-3">
                    {d.original_price>0&&<span className="text-slate-500 line-through text-sm">{fmt(d.original_price)}</span>}
                    <span className="text-emerald-400 text-2xl font-bold">{fmt(d.deal_price)}</span>
                  </div>

                  {/* Stock progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Satılan / Stok</span><span className="text-white">{d.sold_count} / {d.stock_count}</span></div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{width:`${stockPct}%`}}/></div>
                    {remaining>0&&remaining<5&&<p className="text-red-400 text-xs mt-1 font-semibold animate-pulse">🔥 Son {remaining} adet!</p>}
                    {remaining<=0&&<p className="text-red-500 text-xs mt-1 font-semibold">Tükendi!</p>}
                  </div>

                  {/* Countdown */}
                  {dl!==null&&<div className="flex items-center gap-1.5 text-xs"><Clock size={12} className="text-slate-400"/>{dl>0?<span className="text-slate-400">{dl} gün kaldı</span>:dl===0?<span className="text-amber-400 font-medium">Bugün bitiyor!</span>:<span className="text-red-400 font-medium">Süresi doldu</span>}</div>}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <button onClick={()=>toggle(d.id)} className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${d.is_active?'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{d.is_active?'Aktif':'Pasif'}</button>
                    <div className="flex items-center gap-1"><button onClick={()=>openEdit(d)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><Edit3 size={14}/></button><button onClick={()=>del(d.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={14}/></button></div>
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
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editId?'Fırsatı Düzenle':'Yeni Fırsat'}</h2><button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button></div>

          <div><label className="text-xs text-slate-400 block mb-1">Fırsat Başlığı *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
          <div><label className="text-xs text-slate-400 block mb-1">Ürün Adı *</label><input value={form.product_name} onChange={e=>setForm({...form,product_name:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
          <div><label className="text-xs text-slate-400 block mb-1">Kategori</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"><option>Telefon</option><option>Aksesuar</option><option>Yedek Parça</option><option>Hizmet</option></select></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Normal Fiyat (₺)</label><input type="number" min={0} value={form.original_price||''} onChange={e=>setForm({...form,original_price:Number(e.target.value)||0})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Fırsat Fiyatı (₺) *</label><input type="number" min={0} value={form.deal_price||''} onChange={e=>setForm({...form,deal_price:Number(e.target.value)||0})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
          </div>
          {form.original_price>0&&form.deal_price>0&&<div className="text-sm text-emerald-400 font-medium">Tasarruf: %{Math.round((1-form.deal_price/form.original_price)*100)} → {fmt(form.original_price-form.deal_price)} indirim</div>}

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 block mb-1">Stok Adedi</label><input type="number" min={1} value={form.stock_count} onChange={e=>setForm({...form,stock_count:Number(e.target.value)||1})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"/></div>
            <div><label className="text-xs text-slate-400 block mb-1">Bitiş Tarihi</label><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"/></div>
          </div>
          <div><label className="text-xs text-slate-400 block mb-1">Açıklama</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none"/></div>

          <div className="flex justify-end gap-3 pt-2"><button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">İptal</button><button onClick={doSave} className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors">{editId?'Güncelle':'Oluştur'}</button></div>
        </div>
      </div>}
    </div>
  )
}
