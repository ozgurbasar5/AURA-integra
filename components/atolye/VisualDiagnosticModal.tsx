'use client'

import { DEVICE_PARTS_SVG } from '@/lib/atolye-constants'
import { Check, X } from 'lucide-react'

interface VisualDiagnosticModalProps {
  open: boolean
  selected: string[]
  onClose: () => void
  onChange: (parts: string[]) => void
  onSave: () => void
}

export function VisualDiagnosticModal({
  open,
  selected,
  onClose,
  onChange,
  onSave,
}: VisualDiagnosticModalProps) {
  if (!open) return null

  function toggle(partId: string) {
    onChange(
      selected.includes(partId)
        ? selected.filter(id => id !== partId)
        : [...selected, partId],
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900">Görsel Teşhis</h3>
            <p className="text-xs text-slate-500 mt-0.5">Arızalı parçaları telefon şeması üzerinde işaretleyin</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 grid lg:grid-cols-2 gap-6">
          <div className="flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <svg viewBox="0 0 300 600" className="w-full max-w-[220px] h-auto drop-shadow-md">
              <rect x="0" y="0" width="300" height="600" rx="36" fill="#1e293b" stroke="#334155" strokeWidth="4" />
              {DEVICE_PARTS_SVG.map(part => {
                const active = selected.includes(part.id)
                return (
                  <path
                    key={part.id}
                    d={part.path}
                    fill={active ? '#ef4444' : (part.baseColor || '#334155')}
                    fillOpacity={active ? 0.85 : (part.id === 'screen' ? 0.15 : 0.9)}
                    fillRule={part.fillRule}
                    stroke={active ? '#dc2626' : '#475569'}
                    strokeWidth={active ? 2.5 : 1}
                    className="cursor-pointer transition-all hover:opacity-90"
                    onClick={() => toggle(part.id)}
                  />
                )
              })}
            </svg>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Parça Listesi</p>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_PARTS_SVG.map(part => {
                const active = selected.includes(part.id)
                const Icon = part.icon
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => toggle(part.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      active
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={14} className={active ? 'text-red-500' : 'text-slate-400'} />
                    <span className="flex-1 truncate">{part.name}</span>
                    {active && <Check size={12} className="text-red-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
            {selected.length > 0 && (
              <p className="mt-4 text-xs text-red-600 font-semibold">
                {selected.length} parça arızalı olarak işaretlendi
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">İptal</button>
          <button type="button" onClick={onSave} className="btn-primary flex-1">Kaydet</button>
        </div>
      </div>
    </div>
  )
}
