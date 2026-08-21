'use client'

import React, { useState } from 'react'
import {
  Palette,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Zap,
  Bookmark,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useUserPreferences } from '@/lib/useUserPreferences'
import { toast } from 'sonner'

const ACCENT_COLORS = [
  { name: 'AURA Mavi', hex: '#0284c7' },
  { name: 'Zümrüt Yeşil', hex: '#10b981' },
  { name: 'Kraliyet Moru', hex: '#6366f1' },
  { name: 'Altın Kehribar', hex: '#f59e0b' },
  { name: 'Neon Fuşya', hex: '#ec4899' },
  { name: 'Koyu Menekşe', hex: '#8b5cf6' },
]

const STARTUP_ROUTES = [
  { label: 'Ana Panel (Dashboard)', path: '/dashboard' },
  { label: 'Teknik Servis & Atölye', path: '/dashboard/atolye' },
  { label: 'Kasa & Finans 2.0', path: '/dashboard/kasa' },
  { label: 'Satış / Hızlı POS', path: '/dashboard/satis' },
  { label: 'Stok & Parça Yönetimi', path: '/dashboard/stok' },
  { label: 'Müşteri CRM', path: '/dashboard/musteriler' },
  { label: 'Admin Kontrol Merkezi', path: '/dashboard/ayarlar?tab=control_center' },
]

const WIDGET_LABELS: Record<string, { title: string; desc: string }> = {
  hero: { title: 'Ana Özet & İstatistikler', desc: 'Genel ciro ve aktif servis sayaçları' },
  quick_actions: { title: 'Hızlı İşlem Butonları', desc: 'Yeni servis, satış, kasa ve parça ekleme' },
  pipeline: { title: 'Servis Durum Hattı', desc: 'Aşamalara göre bekleyen onarım boru hattı' },
  cash_summary: { title: 'Kasa & Likidite Kartı', desc: 'Anlık kasa bakiyesi ve son hareketler' },
  today_activity: { title: 'Bugünkü Servis Hareketleri', desc: 'Son kabul edilen ve teslim edilen işler' },
  critical_stock: { title: 'Kritik Stok Uyarısı', desc: 'Tükenmek üzere olan yedek parçalar' },
  today_sales_breakdown: { title: 'Günlük Satış Dağılımı', desc: 'Nakit, kart ve cari satış oranları' },
  last_shift_summary: { title: 'Son Kasa Vardiya Raporu', desc: 'Z raporu ve son vardiya durumu' },
  quick_notes: { title: 'Hızlı Operasyon Notları', desc: 'Kişisel ve ekip içi kısa hatırlatmalar' },
}

export default function WorkspaceCustomizer() {
  const {
    preferences,
    loading,
    syncing,
    isCustomized,
    updatePreferences,
    resetToDefaults,
    deleteView,
  } = useUserPreferences()

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Kişisel çalışma alanı yükleniyor…</span>
      </div>
    )
  }

  const handleThemeMode = async (mode: 'system' | 'light' | 'dark') => {
    try {
      await updatePreferences({
        theme: {
          ...(preferences.theme || {}),
          color_mode: mode,
        },
      })
      toast.success(`Tema "${mode.toUpperCase()}" olarak ayarlandı`)
    } catch {
      toast.error('Tema kaydedilemedi')
    }
  }

  const handleAccentColor = async (hex: string) => {
    try {
      await updatePreferences({
        theme: {
          ...(preferences.theme || {}),
          accent_color: hex,
        },
      })
      toast.success('Vurgu rengi güncellendi')
    } catch {
      toast.error('Vurgu rengi kaydedilemedi')
    }
  }

  const handleDensity = async (density: 'comfortable' | 'compact') => {
    try {
      await updatePreferences({ density })
      toast.success(`Görünüm yoğunluğu "${density === 'compact' ? 'Kompakt' : 'Ferah'}" yapıldı`)
    } catch {
      toast.error('Yoğunluk kaydedilemedi')
    }
  }

  const handleStartupRoute = async (startup_route: string) => {
    try {
      await updatePreferences({ startup_route })
      toast.success('Başlangıç sayfası güncellendi')
    } catch {
      toast.error('Başlangıç sayfası kaydedilemedi')
    }
  }

  const toggleWidget = async (widgetId: string) => {
    const current = preferences.dashboard?.widgets || []
    const updated = current.map(w => (w.id === widgetId ? { ...w, visible: !w.visible } : w))
    try {
      await updatePreferences({ dashboard: { widgets: updated } })
    } catch {
      toast.error('Widget durumu güncellenemedi')
    }
  }

  const moveWidget = async (idx: number, direction: 'up' | 'down') => {
    const list = [...(preferences.dashboard?.widgets || [])]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= list.length) return

    const temp = list[idx]
    list[idx] = list[targetIdx]
    list[targetIdx] = temp

    const reindexed = list.map((item, i) => ({ ...item, order: i + 1 }))
    try {
      await updatePreferences({ dashboard: { widgets: reindexed } })
      toast.success('Widget sıralaması güncellendi')
    } catch {
      toast.error('Sıralama güncellenemedi')
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetToDefaults()
      setResetConfirmOpen(false)
      toast.success('Tüm tercihler varsayılan ayarlara sıfırlandı')
    } catch {
      toast.error('Sıfırlama başarısız oldu')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Kişisel Çalışma Alanım (User Customization 2.0)
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ekran düzeninizi, widget'larınızı, tablonuzu ve başlangıç deneyiminizi tamamen kendinize göre özelleştirin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {syncing && (
            <span className="flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Senkronize ediliyor…
            </span>
          )}
          {isCustomized && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Varsayılanlara Sıfırla
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 1. TEMA & RENK PALETİ ────────────────────────────────────────── */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Tema & Görünüm</h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Renk Modu
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleThemeMode(mode)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold capitalize transition-all ${
                    preferences.theme?.color_mode === mode
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {mode === 'system' ? '💻 Sistem' : mode === 'light' ? '☀️ Açık' : '🌙 Koyu'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Vurgu Rengi Paleti
            </label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map(color => {
                const isSelected = preferences.theme?.accent_color === color.hex
                return (
                  <button
                    key={color.hex}
                    onClick={() => handleAccentColor(color.hex)}
                    style={{ backgroundColor: color.hex }}
                    className={`w-9 h-9 rounded-xl transition-transform flex items-center justify-center shadow-sm ${
                      isSelected ? 'ring-4 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    title={color.name}
                  >
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white drop-shadow" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 2. YOĞUNLUK & BAŞLANGIÇ EKRANI ─────────────────────────────── */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Arayüz Yoğunluğu & Başlangıç</h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Tablo ve Kart Yoğunluğu (Density)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDensity('comfortable')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  preferences.density === 'comfortable'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Maximize2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="font-bold text-sm">Ferah (Comfortable)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Geniş satırlar, ferah boşluklar</div>
                </div>
              </button>

              <button
                onClick={() => handleDensity('compact')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  preferences.density === 'compact'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Minimize2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="font-bold text-sm">Kompakt (Compact)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Daha fazla satır, yoğun veri</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Giriş Sonrası Açılış Sayfası (Startup Route)
            </label>
            <select
              value={preferences.startup_route || '/dashboard'}
              onChange={e => handleStartupRoute(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {STARTUP_ROUTES.map(r => (
                <option key={r.path} value={r.path}>
                  {r.label} ({r.path})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. DASHBOARD WIDGET YÖNETİCİSİ ─────────────────────────────────── */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-sky-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Dashboard Widget Düzeni</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ana panelinizde görünmesini istediğiniz widget'ları seçin ve sıralayın.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {preferences.dashboard?.widgets?.map((w, idx) => {
            const meta = WIDGET_LABELS[w.id] || { title: w.id, desc: 'Özel widget bileşeni' }
            return (
              <div
                key={w.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  w.visible
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100/40 dark:bg-slate-900/30 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-lg">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{meta.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{meta.desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveWidget(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Yukarı Taşı"
                  >
                    <ArrowUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <button
                    onClick={() => moveWidget(idx, 'down')}
                    disabled={idx === (preferences.dashboard?.widgets?.length || 0) - 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Aşağı Taşı"
                  >
                    <ArrowDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                  <button
                    onClick={() => toggleWidget(w.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      w.visible
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                    }`}
                  >
                    {w.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Görünür
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Gizli
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 4. KAYITLI GÖRÜNÜMLER (SAVED VIEWS) ───────────────────────────── */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Kayıtlı Filtre & Görünümler ({preferences.saved_views?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sık kullandığınız tablo filtrelerini ve sütun yapılandırmalarını buradan yönetin.
              </p>
            </div>
          </div>
        </div>

        {preferences.saved_views && preferences.saved_views.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preferences.saved_views.map(v => (
              <div
                key={v.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{v.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Modül: {v.module}</div>
                </div>
                <button
                  onClick={() => {
                    deleteView(v.id)
                    toast.success(`"${v.name}" görünümü silindi`)
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Görünümü Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Henüz kaydedilmiş özel görünümünüz bulunmuyor. Tablolardan filtreleri kaydedebilirsiniz.
          </div>
        )}
      </div>

      {/* Confirmation Reset Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Varsayılanlara Sıfırlansın mı?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tüm kişiselleştirilmiş widget sıralamalarınız, tema ve başlangıç tercihleriniz kurumun varsayılan ayarlarına dönecektir.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
