'use client'

import { useMemo, useState } from 'react'
import { X, FileText, Printer } from 'lucide-react'
import { EXPERTISE_DATA, type TestGroup } from '@/components/ExpertiseModal'

type Props = {
  open: boolean
  onClose: () => void
  deviceType?: 'phone' | 'tablet' | 'pc' | 'watch'
  jobNo?: string
  customerName?: string
}

export default function ExpertiseModal({
  open,
  onClose,
  deviceType = 'phone',
  jobNo,
  customerName,
}: Props) {
  const groups = EXPERTISE_DATA[deviceType] ?? EXPERTISE_DATA.phone
  const [selections, setSelections] = useState<Record<string, string>>({})

  const { score, reportLines } = useMemo(() => {
    let total = 0
    let max = 0
    const lines: string[] = []
    for (const group of groups) {
      for (const step of group.steps) {
        max += Math.max(...step.options.map(o => o.score))
        const val = selections[step.id]
        const opt = step.options.find(o => o.value === val)
        if (opt) {
          total += opt.score
          lines.push(`• ${step.label}: ${opt.reportText}`)
        }
      }
    }
    const pct = max > 0 ? Math.round((total / max) * 100) : 0
    return { score: pct, reportLines: lines }
  }, [groups, selections])

  if (!open) return null

  function handlePrint() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Ekspertiz ${jobNo ?? ''}</title></head><body>
      <h1>Ekspertiz Raporu</h1>
      <p>${customerName ?? ''} — ${jobNo ?? ''}</p>
      <p><strong>Skor: ${score}/100</strong></p>
      ${reportLines.map(l => `<p>${l}</p>`).join('')}
    </body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--bg-border)]">
          <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileText size={18} className="text-sky-500" /> Ekspertiz Raporu
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-muted)]">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {groups.map((group: TestGroup) => (
            <div key={group.id}>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">
                {group.icon} {group.title}
              </p>
              <div className="space-y-3">
                {group.steps.map(step => (
                  <div key={step.id}>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{step.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.options.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelections(s => ({ ...s, [step.id]: opt.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selections[step.id] === opt.value
                              ? opt.isBad
                                ? 'bg-red-500/15 border-red-400 text-red-700'
                                : 'bg-sky-500/15 border-sky-400 text-sky-800'
                              : 'border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[var(--bg-border)] flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-[var(--text-primary)]">Skor: {score}/100</span>
          <div className="flex gap-2">
            <button type="button" onClick={handlePrint} className="btn-secondary text-xs flex items-center gap-1">
              <Printer size={14} /> Yazdır
            </button>
            <button type="button" onClick={onClose} className="btn-primary text-xs">Tamam</button>
          </div>
        </div>
      </div>
    </div>
  )
}
