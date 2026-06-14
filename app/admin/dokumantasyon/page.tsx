'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Trash2, Eye, EyeOff, Save, Loader2, Edit3, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface DocPage {
  id: string
  slug: string
  title: string
  content: string
  module: string
  sort_order: number
  published: boolean
  updated_at: string
}

const MODULES = [
  { value: 'teknik-servis', label: 'Teknik Servis' },
  { value: 'stok',          label: 'Stok & Tedarik' },
  { value: 'finans',        label: 'Finans' },
  { value: 'portal',        label: 'Müşteri Portali' },
  { value: 'kullanici',     label: 'Kullanıcılar' },
  { value: 'admin',         label: 'Admin' },
  { value: 'genel',         label: 'Genel' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}

export default function AdminDokumantasyonPage() {
  const supabase = createClient()
  const [docs, setDocs]           = useState<DocPage[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<DocPage | null>(null)
  const [isNew, setIsNew]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [preview, setPreview]     = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '', slug: '', content: '', module: 'genel', sort_order: 0, published: true
  })

  function setField(key: string, value: any) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'title' && isNew) next.slug = slugify(value)
      return next
    })
  }

  // Load all docs
  async function loadDocs() {
    setLoading(true)
    try {
      const { data, error } = await (supabase.from('documentation_pages') as any)
        .select('*').order('module').order('sort_order')
      if (!error && data) setDocs(data)
      else setDocs([])
    } catch { setDocs([]) } finally { setLoading(false) }
  }

  useEffect(() => { loadDocs() }, [])

  function openNew() {
    setIsNew(true)
    setSelected(null)
    setPreview(false)
    setForm({ title: '', slug: '', content: '', module: 'genel', sort_order: docs.length, published: true })
  }

  function openEdit(doc: DocPage) {
    setIsNew(false)
    setSelected(doc)
    setPreview(false)
    setForm({
      title: doc.title, slug: doc.slug, content: doc.content,
      module: doc.module, sort_order: doc.sort_order, published: doc.published
    })
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Başlık ve slug zorunludur')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const { data, error } = await (supabase.from('documentation_pages') as any)
          .insert([{ ...form, updated_at: new Date().toISOString() }])
          .select().single()
        if (error) throw error
        setDocs(prev => [...prev, data])
        setSelected(data)
        setIsNew(false)
        toast.success('Sayfa oluşturuldu')
      } else if (selected) {
        const { data, error } = await (supabase.from('documentation_pages') as any)
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', selected.id)
          .select().single()
        if (error) throw error
        setDocs(prev => prev.map(d => d.id === selected.id ? data : d))
        setSelected(data)
        toast.success('Değişiklikler kaydedildi')
      }
    } catch (e: any) {
      toast.error('Hata: ' + (e.message || 'Kaydedilemedi'))
    } finally { setSaving(false) }
  }

  async function togglePublish(doc: DocPage) {
    try {
      await (supabase.from('documentation_pages') as any)
        .update({ published: !doc.published, updated_at: new Date().toISOString() })
        .eq('id', doc.id)
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, published: !d.published } : d))
      if (selected?.id === doc.id) setSelected({ ...selected, published: !doc.published })
      toast.success(doc.published ? 'Yayından kaldırıldı' : 'Yayına alındı')
    } catch { toast.error('Güncellenemedi') }
  }

  async function deletePage(doc: DocPage) {
    if (!confirm(`"${doc.title}" sayfasını silmek istediğinize emin misiniz?`)) return
    setDeleting(doc.id)
    try {
      await (supabase.from('documentation_pages') as any).delete().eq('id', doc.id)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
      if (selected?.id === doc.id) setSelected(null)
      toast.success('Sayfa silindi')
    } catch { toast.error('Silinemedi') } finally { setDeleting(null) }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
            Dokümantasyon Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Bayilerin göreceği dokümantasyon içeriklerini buradan oluşturun ve düzenleyin
          </p>
        </div>
        <button onClick={openNew}
          className="btn-primary gap-2"
          style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={15} /> Yeni Sayfa
        </button>
      </div>

      <div className="flex gap-5">
        {/* Doc List */}
        <div className="w-72 flex-shrink-0 space-y-1">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> Yükleniyor...
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Henüz sayfa yok</p>
              <p className="text-xs text-slate-400 mt-1">SQL migration'ı çalıştırın veya "Yeni Sayfa" ekleyin</p>
            </div>
          ) : MODULES.map(mod => {
            const modDocs = docs.filter(d => d.module === mod.value)
            if (!modDocs.length) return null
            return (
              <div key={mod.value}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">{mod.label}</p>
                {modDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => openEdit(doc)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 group ${
                      (selected?.id === doc.id || (isNew === false && selected?.id === doc.id))
                        ? 'text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    style={selected?.id === doc.id ? { backgroundColor: 'var(--accent)' } : {}}
                  >
                    <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                    {!doc.published && (
                      <EyeOff size={11} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Editor */}
        {(isNew || selected) ? (
          <div className="flex-1 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">
                  {isNew ? 'Yeni Sayfa' : 'Sayfa Düzenle'}
                </h2>
                {selected && (
                  <span className={`badge text-xs ${selected.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {selected.published ? '✓ Yayında' : 'Taslak'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreview(!preview)}
                  className="btn-secondary btn-sm gap-1.5">
                  <Eye size={13} /> {preview ? 'Düzenle' : 'Önizle'}
                </button>
                {selected && (
                  <button onClick={() => togglePublish(selected)}
                    className="btn-secondary btn-sm gap-1.5">
                    {selected.published ? <EyeOff size={13} /> : <Globe size={13} />}
                    {selected.published ? 'Yayından Kaldır' : 'Yayına Al'}
                  </button>
                )}
                {selected && (
                  <button onClick={() => deletePage(selected)} disabled={deleting === selected.id}
                    className="btn-secondary btn-sm gap-1.5 text-red-600 hover:bg-red-50">
                    {deleting === selected.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Sil
                  </button>
                )}
                <button onClick={save} disabled={saving}
                  className="btn-primary btn-sm gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>

            {preview ? (
              /* Preview Mode */
              <div className="card p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{form.title || 'Başlıksız'}</h2>
                <div
                  className="prose prose-slate max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="card p-5 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Başlık *</label>
                    <input value={form.title} onChange={e => setField('title', e.target.value)}
                      className="input text-base font-semibold" placeholder="Sayfa başlığı..." />
                  </div>
                  <div>
                    <label className="label">Slug (URL) *</label>
                    <input value={form.slug} onChange={e => setField('slug', e.target.value)}
                      className="input font-mono text-sm" placeholder="sayfa-url-slug" />
                  </div>
                  <div>
                    <label className="label">Modül</label>
                    <select value={form.module} onChange={e => setField('module', e.target.value)} className="select">
                      {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sıra Numarası</label>
                    <input type="number" value={form.sort_order}
                      onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
                      className="input" min={0} />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <button onClick={() => setField('published', !form.published)}
                      className={`relative w-11 h-6 rounded-full transition-all`}
                      style={form.published ? { backgroundColor: 'var(--accent)' } : { backgroundColor: '#e2e8f0' }}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700">{form.published ? 'Yayında' : 'Taslak'}</span>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">İçerik (HTML)</label>
                    <span className="text-xs text-slate-400">HTML etiketleri kullanabilirsiniz</span>
                  </div>
                  <textarea
                    value={form.content}
                    onChange={e => setField('content', e.target.value)}
                    rows={20}
                    className="input font-mono text-xs resize-y w-full leading-relaxed"
                    placeholder="<h2>Başlık</h2>&#10;<p>İçerik...</p>"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Kullanılabilir etiketler: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;code&gt;, &lt;table&gt;, &lt;blockquote&gt;
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Edit3 size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Düzenlemek için bir sayfa seçin</p>
              <p className="text-slate-400 text-sm mt-1">veya yeni sayfa oluşturun</p>
              <button onClick={openNew} className="mt-4 btn-primary gap-2"
                style={{ backgroundColor: 'var(--accent)' }}>
                <Plus size={14} /> Yeni Sayfa
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
        .prose code { background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:.85em; color:#334155; }
        .prose blockquote { border-left:3px solid var(--accent); padding-left:1rem; color:#64748b; margin:1rem 0; }
        .prose table { width:100%; border-collapse:collapse; font-size:.875rem; margin:.75rem 0; }
        .prose strong { color:#0f172a; }
      `}</style>
    </div>
  )
}
