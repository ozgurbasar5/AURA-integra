'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, ChevronDown, MapPin } from 'lucide-react'
import { getBranches, getActiveBranchId, setActiveBranchId, onStoreChange } from '@/lib/store'

type Props = {
  collapsed?: boolean
}

export default function BranchSelector({ collapsed }: Props) {
  const [branches, setBranches] = useState(() => getBranches())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveBranchId())
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    setBranches(getBranches())
    setActiveId(getActiveBranchId())
  }, [])

  useEffect(() => {
    refresh()
    return onStoreChange(mod => {
      if (mod === 'branches' || mod === 'seed') refresh()
    })
  }, [refresh])

  if (branches.length === 0) return null

  const activeBranch = branches.find(b => b.id === activeId)
  const label = activeBranch?.name ?? 'Tüm Şubeler'

  function select(id: string | null) {
    setActiveBranchId(id)
    setOpen(false)
    refresh()
  }

  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        className="mx-auto mb-2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
        onClick={() => setOpen(o => !o)}
      >
        <Building2 size={16} />
      </button>
    )
  }

  return (
    <div className="px-3 mb-2 relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-left hover:bg-white/10 transition-colors"
      >
        <MapPin size={13} className="text-sky-400 shrink-0" />
        <span className="flex-1 text-xs font-semibold text-slate-200 truncate">{label}</span>
        <ChevronDown size={13} className={`text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-label="Kapat" />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-white/10 bg-slate-900 shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full px-3 py-2.5 text-left text-xs hover:bg-white/5 ${!activeId ? 'text-sky-300 font-bold' : 'text-slate-300'}`}
            >
              Tüm Şubeler
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => select(b.id)}
                className={`w-full px-3 py-2.5 text-left text-xs hover:bg-white/5 border-t border-white/5 ${
                  activeId === b.id ? 'text-sky-300 font-bold' : 'text-slate-300'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
