'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Wrench, Users, Package, CreditCard, ShieldCheck,
  Building2, ArrowRight, X, Loader2, Sparkles, Command
} from 'lucide-react'
import type { UniversalSearchResult } from '@/lib/admin-center'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AdminCommandPalette({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UniversalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/center?q=${encodeURIComponent(query.trim())}`, {
          credentials: 'same-origin',
        })
        const json = await res.json()
        if (json.ok && Array.isArray(json.results)) {
          setResults(json.results)
          setSelectedIndex(0)
        }
      } catch {
        /* ignore error */
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  const handleSelect = (item: UniversalSearchResult) => {
    onClose()
    router.push(item.href)
  }

  if (!isOpen) return null

  const getIcon = (type: UniversalSearchResult['type']) => {
    switch (type) {
      case 'service': return <Wrench size={16} className="text-sky-400" />
      case 'customer': return <Users size={16} className="text-emerald-400" />
      case 'part': return <Package size={16} className="text-amber-400" />
      case 'account': return <CreditCard size={16} className="text-purple-400" />
      case 'warranty': return <ShieldCheck size={16} className="text-blue-400" />
      default: return <Building2 size={16} className="text-zinc-400" />
    }
  }

  const QUICK_ACTIONS = [
    { label: 'Yeni Servis Kaydı Aç', href: '/dashboard/kabul', icon: Wrench },
    { label: 'Kasa & Finans Konsolu', href: '/dashboard/kasa', icon: CreditCard },
    { label: 'Yedek Parça & Stok', href: '/dashboard/stok', icon: Package },
    { label: 'Müşteri Rehberi', href: '/dashboard/musteriler', icon: Users },
    { label: 'Garanti & Talepler', href: '/dashboard/garanti', icon: ShieldCheck },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
          <Search size={18} className="text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Servis No, Müşteri, Parça Kodu, Şube ara... (veya menü işlemi)"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500"
          />
          {loading ? (
            <Loader2 size={16} className="animate-spin text-sky-400 mr-2" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300 mr-2">
              <X size={16} />
            </button>
          ) : null}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
            <Command size={10} /> K
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-800/50">
          {query.trim().length >= 2 ? (
            results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Arama Sonuçları ({results.length})
                </div>
                {results.map((item, idx) => (
                  <div
                    key={item.id + idx}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      idx === selectedIndex ? 'bg-sky-500/15 text-white border border-sky-500/30' : 'hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700/60 shrink-0">
                        {getIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-white">{item.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 ml-2 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                &ldquo;{query}&rdquo; için sonuç bulunamadı.
              </div>
            ) : null
          ) : (
            <div className="p-2 space-y-3">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-sky-400" /> Hızlı Navigasyon
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(a => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.href}
                      onClick={() => {
                        onClose()
                        router.push(a.href)
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className="text-sky-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-zinc-200">{a.label}</span>
                      </div>
                      <ArrowRight size={14} className="text-zinc-600 group-hover:text-sky-400 transition-colors" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ ile seç</span>
            <span>↵ git</span>
            <span>ESC kapat</span>
          </div>
          <span>AURA Omnibar 2.0</span>
        </div>
      </div>
    </div>
  )
}
