'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, Loader2, Megaphone, Wrench, Zap, Bug, ChevronDown, ChevronUp,
} from 'lucide-react'
import { DEFAULT_PLATFORM_YENILIKLER } from '@/lib/default-yenilikler'

interface Yenilik {
  id: string
  title: string
  summary: string
  content: string
  category: string
  published_at: string
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ozellik: {
    label: 'Yeni Özellik',
    icon: <Zap size={14} />,
    color: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  iyilestirme: {
    label: 'İyileştirme',
    icon: <Wrench size={14} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  duzeltme: {
    label: 'Düzeltme',
    icon: <Bug size={14} />,
    color: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  duyuru: {
    label: 'Duyuru',
    icon: <Megaphone size={14} />,
    color: 'bg-violet-50 text-violet-700 border-violet-100',
  },
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function isNew(iso: string) {
  const d = new Date(iso).getTime()
  return Date.now() - d < 7 * 24 * 60 * 60 * 1000
}

export default function YeniliklerPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Yenilik[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: auth }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        (supabase.from('platform_yenilikler') as any)
          .select('id, title, summary, content, category, published_at')
          .eq('published', true)
          .order('published_at', { ascending: false }),
      ])

      const uid = auth?.user?.id ?? null
      setUserId(uid)

      if (!error && Array.isArray(data) && data.length > 0) {
        setItems(data as Yenilik[])
      } else {
        setItems(DEFAULT_PLATFORM_YENILIKLER as Yenilik[])
      }

      if (uid) {
        const { data: reads } = await (supabase.from('platform_yenilik_reads') as any)
          .select('yenilik_id')
          .eq('user_id', uid)
        if (reads) setReadIds(new Set(reads.map((r: { yenilik_id: string }) => r.yenilik_id)))
      }
    } catch {
      setItems(DEFAULT_PLATFORM_YENILIKLER as Yenilik[])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    if (!userId || readIds.has(id)) return
    setReadIds(prev => new Set([...prev, id]))
    try {
      await (supabase.from('platform_yenilik_reads') as any).upsert({
        user_id: userId,
        yenilik_id: id,
        read_at: new Date().toISOString(),
      })
    } catch { /* ignore */ }
  }

  function toggleExpand(item: Yenilik) {
    const next = expanded === item.id ? null : item.id
    setExpanded(next)
    if (next) markRead(item.id)
  }

  const filtered = filter ? items.filter(i => i.category === filter) : items
  const unreadCount = items.filter(i => !readIds.has(i.id)).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={20} style={{ color: 'var(--accent)' }} />
          Yenilikler
          {unreadCount > 0 && (
            <span
              className="text-xs font-semibold text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {unreadCount} yeni
            </span>
          )}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Platformdaki yeni özellikler, iyileştirmeler ve duyurular
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            !filter ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          style={!filter ? { backgroundColor: 'var(--accent)' } : {}}
        >
          Tümü
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1 ${
              filter === key ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={filter === key ? { backgroundColor: 'var(--accent)' } : {}}
          >
            {meta.icon}
            {meta.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-16">
          <Loader2 size={18} className="animate-spin" /> Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Henüz yenilik yok</p>
          <p className="text-slate-400 text-sm mt-1">Yeni sürümler burada listelenecek</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.duyuru
            const open = expanded === item.id
            const unread = !readIds.has(item.id)
            return (
              <article
                key={item.id}
                className={`card overflow-hidden transition-shadow ${
                  unread ? 'ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(item)}
                  className="w-full text-left p-5 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        {isNew(item.published_at) && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-white px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            Yeni
                          </span>
                        )}
                        {unread && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{formatDate(item.published_at)}</span>
                      </div>
                      <h2 className={`text-base font-semibold text-slate-900 ${unread ? '' : 'font-medium'}`}>
                        {item.title}
                      </h2>
                      {item.summary && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                    <span className="text-slate-400 mt-1 flex-shrink-0">
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </div>
                </button>

                {open && item.content && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <div
                      className="prose prose-slate max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <style jsx global>{`
        .prose h2 { font-size:1.1rem; font-weight:700; color:#0f172a; margin:1.25rem 0 0.5rem; }
        .prose h3 { font-size:1rem; font-weight:600; color:#334155; margin:1rem 0 0.4rem; }
        .prose p  { color:#475569; margin:0.4rem 0; }
        .prose ul, .prose ol { padding-left:1.25rem; margin:0.4rem 0; }
        .prose li { color:#475569; margin:0.2rem 0; }
        .prose strong { color:#0f172a; }
      `}</style>
    </div>
  )
}
