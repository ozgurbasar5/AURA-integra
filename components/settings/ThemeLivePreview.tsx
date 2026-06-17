'use client'

import { THEMES, type ThemeKey } from '@/lib/theme'
import type { RadiusScale, SidebarStyle } from '@/lib/ui-appearance'
import { RADIUS_LABELS, SIDEBAR_STYLE_LABELS } from '@/lib/ui-appearance'

type Props = {
  theme: ThemeKey
  sidebarStyle: SidebarStyle
  radiusScale: RadiusScale
  customAccent?: string | null
}

export default function ThemeLivePreview({ theme, sidebarStyle, radiusScale, customAccent }: Props) {
  const t = THEMES[theme]
  const accent = customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent : t.accent

  const sidebarBg =
    sidebarStyle === 'light'
      ? 'linear-gradient(180deg,#f8fafc,#f1f5f9)'
      : sidebarStyle === 'dark'
        ? 'linear-gradient(180deg,#0f172a,#020617)'
        : `linear-gradient(180deg, ${t.dark}88, ${t.text})`

  const radius =
    radiusScale === 'sharp' ? '6px' : radiusScale === 'pill' ? '20px' : '12px'

  return (
    <div className="rounded-xl border border-[var(--bg-border)] overflow-hidden bg-[var(--bg-muted)]">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-4 pt-4 pb-2">
        Canlı Önizleme — Sidebar + İçerik
      </p>
      <div className="flex mx-4 mb-4 rounded-xl overflow-hidden border border-[var(--bg-border)] shadow-sm min-h-[200px]">
        {/* Mini sidebar */}
        <div
          className="w-28 shrink-0 p-2 flex flex-col gap-1 text-[10px]"
          style={{ background: sidebarBg, borderRadius: `${radius} 0 0 ${radius}` }}
        >
          <div className="font-black text-white/90 text-[9px] mb-2 px-1 truncate">BAYİ ADI</div>
          <div
            className="px-2 py-1.5 font-semibold text-white rounded"
            style={{ background: `${accent}33`, borderLeft: `2px solid ${accent}`, borderRadius: radius }}
          >
            Panel
          </div>
          <div className="px-2 py-1.5 opacity-60 text-white/80" style={{ borderRadius: radius }}>Stok</div>
          <div className="px-2 py-1.5 opacity-60 text-white/80" style={{ borderRadius: radius }}>Atölye</div>
        </div>
        {/* Mini content */}
        <div className="flex-1 p-3 bg-[var(--bg-card)] flex flex-col gap-2">
          <div
            className="h-10 rounded-lg text-white text-[10px] font-bold flex items-center px-3"
            style={{ background: `linear-gradient(135deg, ${accent}, ${t.dark})`, borderRadius: radius }}
          >
            Hoş geldiniz
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-3 py-1.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: accent, borderRadius: radius }}
            >
              Birincil
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[10px] font-semibold border-2"
              style={{ borderColor: accent, color: accent, borderRadius: radius }}
            >
              İkincil
            </button>
            <span
              className="px-2 py-1 text-[9px] font-bold"
              style={{ backgroundColor: t.light, color: t.text, borderRadius: radius }}
            >
              Badge
            </span>
          </div>
          <div
            className="flex-1 min-h-[48px] border border-[var(--bg-border)] p-2 text-[9px] text-[var(--text-muted)]"
            style={{ borderRadius: radius }}
          >
            Kart / tablo alanı
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] px-4 pb-3">
        Panel: {SIDEBAR_STYLE_LABELS[sidebarStyle].label} · Köşe: {RADIUS_LABELS[radiusScale]} · Renk: {t.name}
      </p>
    </div>
  )
}
