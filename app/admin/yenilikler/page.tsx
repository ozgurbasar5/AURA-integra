'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, Plus, Trash2, Eye, EyeOff, Save, Loader2, Edit3, Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

interface Yenilik {
  id: string
  title: string
  summary: string
  content: string
  category: string
  published: boolean
  published_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: 'ozellik', label: 'Yeni Özellik' },
  { value: 'iyilestirme', label: 'İyileştirme' },
  { value: 'duzeltme', label: 'Düzeltme' },
  { value: 'duyuru', label: 'Duyuru' },
]

const CATEGORY_BADGE: Record<string, string> = {
  ozellik: 'bg-sky-50 text-sky-700',
  iyilestirme: 'bg-emerald-50 text-emerald-700',
  duzeltme: 'bg-amber-50 text-amber-700',
  duyuru: 'bg-violet-50 text-violet-700',
}

export default function AdminYeniliklerPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Yenilik[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Yenilik | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'ozellik',
    published: true,
    published_at: new Date().toISOString().slice(0, 16),
  })

  function setField(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await (supabase.from('platform_yenilikler') as any)
        .select('*')
        .order('published_at', { ascending: false })
      if (!error && data) setItems(data)
      else setItems([])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setIsNew(true)
    setSelected(null)
    setPreview(false)
    setForm({
      title: '',
      summary: '',
      content: '',
      category: 'ozellik',
      published: true,
      published_at: new Date().toISOString().slice(0, 16),
    })
  }

  function openEdit(item: Yenilik) {
    setIsNew(false)
    setSelected(item)
    setPreview(false)
    setForm({
      title: item.title,
      summary: item.summary,
      content: item.content,
      category: item.category,
      published: item.published,
      published_at: item.published_at
        ? new Date(item.published_at).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    })
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error('Başlık zorunludur')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content,
      category: form.category,
      published: form.published,
      published_at: new Date(form.published_at).toISOString(),
      updated_at: new Date().toISOString(),
    }
    try {
      if (isNew) {
        const { data, error } = await (supabase.from('platform_yenilikler') as any)
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        setItems(prev => [data, ...prev])
        setSelected(data)
        setIsNew(false)
        toast.success('Yenilik yayınlandı — bayiler görebilir')
      } else if (selected) {
        const { data, error } = await (supabase.from('platform_yenilikler') as any)
          .update(payload)
          .eq('id', selected.id)
          .select()
          .single()
        if (error) throw error
        setItems(prev => prev.map(i => (i.id === selected.id ? data : i)))
        setSelected(data)
        toast.success('Yenilik güncellendi')
      }
    } catch (e: any) {
      toast.error('Hata: ' + (e.message || 'Kaydedilemedi'))
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(item: Yenilik) {
    try {
      const next = !item.published
      await (supabase.from('platform_yenilikler') as any)
        .update({ published: next, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, published: next } : i)))
      if (selected?.id === item.id) setSelected({ ...selected, published: next })
      toast.success(next ? 'Yayına alındı' : 'Yayından kaldırıldı')
    } catch {
      toast.error('Güncellenemedi')
    }
  }

  async function deleteItem(item: Yenilik) {
    if (!confirm(`"${item.title}" kaydını silmek istediğinize emin misiniz?`)) return
    setDeleting(item.id)
    try {
      await (supabase.from('platform_yenilikler') as any).delete().eq('id', item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      if (selected?.id === item.id) setSelected(null)
      toast.success('Silindi')
    } catch {
      toast.error('Silinemedi')
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <AdminPageHeader
        title="Yenilikler Yönetimi"
        description="Her ürün yeniliğini buraya ekleyin — bayiler panelde anında görür"
        icon={Sparkles}
        actions={(
          <button onClick={openNew} className="btn-primary gap-2" style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={15} /> Yeni Yenilik
          </button>
        )}
      />

      <div className="flex gap-5">
        <div className="w-80 flex-shrink-0 space-y-1">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Yükleniyor...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <Sparkles size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Henüz yenilik yok</p>
              <p className="text-xs text-slate-400 mt-1">&quot;Yeni Yenilik&quot; ile ilk kaydı ekleyin</p>
            </div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                onClick={() => openEdit(item)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                  selected?.id === item.id ? 'text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={selected?.id === item.id ? { backgroundColor: 'var(--accent)' } : {}}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      selected?.id === item.id
                        ? 'bg-white/20 text-white'
                        : CATEGORY_BADGE[item.category] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                  </span>
                  {!item.published && (
                    <EyeOff size={11} className={selected?.id === item.id ? 'text-white/70' : 'text-slate-400'} />
                  )}
                </div>
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className={`text-[11px] mt-0.5 ${selected?.id === item.id ? 'text-white/70' : 'text-slate-400'}`}>
                  {formatDate(item.published_at)}
                </p>
              </button>
            ))
          )}
        </div>

        {(isNew || selected) ? (
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">
                  {isNew ? 'Yeni Yenilik' : 'Yenilik Düzenle'}
                </h2>
                {selected && (
                  <span className={`badge text-xs ${selected.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {selected.published ? '✓ Yayında' : 'Taslak'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setPreview(!preview)} className="btn-secondary btn-sm gap-1.5">
                  <Eye size={13} /> {preview ? 'Düzenle' : 'Önizle'}
                </button>
                {selected && (
                  <button onClick={() => togglePublish(selected)} className="btn-secondary btn-sm gap-1.5">
                    {selected.published ? <EyeOff size={13} /> : <Globe size={13} />}
                    {selected.published ? 'Yayından Kaldır' : 'Yayına Al'}
                  </button>
                )}
                {selected && (
                  <button
                    onClick={() => deleteItem(selected)}
                    disabled={deleting === selected.id}
                    className="btn-secondary btn-sm gap-1.5 text-red-600 hover:bg-red-50"
                  >
                    {deleting === selected.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Sil
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-primary btn-sm gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>

            {preview ? (
              <div className="card p-8">
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded mb-3 ${CATEGORY_BADGE[form.category]}`}>
                  {CATEGORIES.find(c => c.value === form.category)?.label}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{form.title || 'Başlıksız'}</h2>
                {form.summary && <p className="text-slate-600 mb-6">{form.summary}</p>}
                <div
                  className="prose prose-slate max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card p-5 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Başlık *</label>
                    <input
                      value={form.title}
                      onChange={e => setField('title', e.target.value)}
                      className="input text-base font-semibold"
                      placeholder="Örn. Stok sayım ekranı yenilendi"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Kısa özet</label>
                    <input
                      value={form.summary}
                      onChange={e => setField('summary', e.target.value)}
                      className="input"
                      placeholder="Bayilerin listede göreceği tek cümlelik özet"
                    />
                  </div>
                  <div>
                    <label className="label">Kategori</label>
                    <select
                      value={form.category}
                      onChange={e => setField('category', e.target.value)}
                      className="select"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Yayın tarihi</label>
                    <input
                      type="datetime-local"
                      value={form.published_at}
                      onChange={e => setField('published_at', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-5 col-span-2">
                    <button
                      type="button"
                      onClick={() => setField('published', !form.published)}
                      className="relative w-11 h-6 rounded-full transition-all"
                      style={form.published ? { backgroundColor: 'var(--accent)' } : { backgroundColor: '#e2e8f0' }}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700">{form.published ? 'Yayında (bayiler görür)' : 'Taslak'}</span>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Detay içerik (HTML)</label>
                    <span className="text-xs text-slate-400">İsteğe bağlı — boş bırakılabilir</span>
                  </div>
                  <textarea
                    value={form.content}
                    onChange={e => setField('content', e.target.value)}
                    rows={14}
                    className="input font-mono text-xs resize-y w-full leading-relaxed"
                    placeholder="<p>Ne değişti, bayiler ne yapmalı...</p>"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Edit3 size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Düzenlemek için bir yenilik seçin</p>
              <p className="text-slate-400 text-sm mt-1">veya yeni kayıt oluşturun</p>
              <button
                onClick={openNew}
                className="mt-4 btn-primary gap-2"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus size={14} /> Yeni Yenilik
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .prose h2 { font-size:1.2rem; font-weight:700; color:#0f172a; margin:1.5rem 0 0.75rem; }
        .prose h3 { font-size:1rem; font-weight:600; color:#334155; margin:1.25rem 0 0.5rem; }
        .prose p  { color:#475569; margin:0.5rem 0; }
        .prose ul, .prose ol { padding-left:1.25rem; margin:0.5rem 0; }
        .prose li { color:#475569; margin:0.25rem 0; }
        .prose strong { color:#0f172a; }
      `}</style>
    </div>
  )
}
