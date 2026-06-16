'use client'

import { useState, useEffect } from 'react'
import { Check, Palette, Bell, Shield, User, Globe, CreditCard, Zap, ChevronRight, Save, Eye, EyeOff, Copy, RefreshCw, Upload, Trash2, Building2, Crop } from 'lucide-react'
import { THEMES, type ThemeKey, applyTheme, getSavedTheme } from '@/lib/theme'
import { getNotificationSettings, setNotificationSettings, type NotificationSettings } from '@/lib/store'
import {
  getNotificationPrefs, saveNotificationPrefs, DEFAULT_NOTIFICATION_PREFS,
  getPortalSettings, savePortalSettings, type NotificationPrefs, type PortalSettings,
  getViewOptions, applyViewOptions, DEFAULT_PORTAL_SETTINGS, type ViewOptions,
} from '@/lib/user-settings'
import { dispatchViewOptionsChanged } from '@/hooks/useViewOptions'
import {
  readLogoFile, saveBusinessBranding, syncBusinessBrandingToSupabase, fetchBusinessBrandingFromSupabase,
  type BusinessBranding,
} from '@/lib/business-branding'
import BrandLivePreview from '@/components/branding/BrandLivePreview'
import LogoCropModal from '@/components/branding/LogoCropModal'
import ColorModeToggle from '@/components/ColorModeToggle'
import { toast } from 'sonner'

type Tab = 'genel' | 'tema' | 'bildirim' | 'guvenlik' | 'entegrasyon' | 'abonelik'

const NOTIFICATION_SETTINGS = [
  { id: 'sms_service',    label: 'Servis Tamamlandı SMS',     desc: 'Servis tamamlandığında müşteriye SMS gönder', default: true },
  { id: 'sms_pickup',     label: 'Teslim Hatırlatma SMS',     desc: 'Servis hazır olduğunda müşteriye SMS gönder', default: true },
  { id: 'stock_alert',    label: 'Kritik Stok Uyarısı',       desc: 'Parça minimum seviyeye düştüğünde bildirim',  default: true },
  { id: 'payment_remind', label: 'Ödeme Hatırlatma',          desc: 'Bekleyen tahsilat için günlük özet',          default: false },
  { id: 'daily_report',   label: 'Günlük Özet Raporu',       desc: 'Her gün saat 09:00\'da günlük özet e-postası', default: false },
  { id: 'new_review',     label: 'Müşteri Portalı Aktivitesi', desc: 'Yeni portal girişi ve KVKK talepleri',       default: true },
]

const INTEGRATIONS = [
  { id: 'whatsapp',  name: 'WhatsApp Business', icon: '💬', status: 'connected', desc: 'Müşteri mesajlaşma' },
  { id: 'mikro',     name: 'Mikro Muhasebe',    icon: '📊', status: 'available', desc: 'Muhasebe entegrasyonu' },
  { id: 'logo',      name: 'Logo Tiger',         icon: '🐯', status: 'available', desc: 'ERP entegrasyonu' },
  { id: 'nes',       name: 'NES Kargo',          icon: '📦', status: 'connected', desc: 'Kargo takip sistemi' },
  { id: 'iyzico',    name: 'İyzico',             icon: '💳', status: 'available', desc: 'Online ödeme altyapısı' },
  { id: 'n11',       name: 'n11 / Trendyol',     icon: '🛍️', status: 'coming',    desc: 'Marketplace entegrasyonu' },
]

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  connected: { label: 'Bağlı',       color: 'badge-green text-green-700' },
  available: { label: 'Kurulabilir', color: 'badge-blue text-blue-700' },
  coming:    { label: 'Yakında',     color: 'badge-slate text-slate-600' },
}

export default function AyarlarPage() {
  const [tab, setTab] = useState<Tab>('genel')
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('indigo')
  const [notifications, setNotifications] = useState<NotificationPrefs>(() => ({ ...DEFAULT_NOTIFICATION_PREFS }))
  const [showPass, setShowPass] = useState(false)
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', company: '', city: '', tax_no: '' })
  const [portal, setPortal] = useState<PortalSettings>(() => ({ ...DEFAULT_PORTAL_SETTINGS }))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewOpts, setViewOpts] = useState<ViewOptions>({
    compact: false,
    noAnim: false,
    highContrast: false,
    sidebarMode: 'classic',
    sidebarPersistCollapse: false,
  })
  const [autoNotify, setAutoNotify] = useState<NotificationSettings>({
    auto_sms: true, auto_whatsapp: true, on_status_change: true, on_delivery: true,
    require_qc_on_delivery: true, shop_address: '', shop_phone: '', shop_name: '', shop_logo: '', portal_slug: '',
    service_warranty_months: 3,
  })
  const [logoUploading, setLogoUploading] = useState(false)
  const [brandDirty, setBrandDirty] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showCrop, setShowCrop] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [notifConfig, setNotifConfig] = useState({ netgsm_user: '', netgsm_pass: '', netgsm_header: '', smtp_email: '', whatsapp_phone: '' })
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  function toggleViewOpt(key: keyof Pick<ViewOptions, 'compact' | 'noAnim' | 'highContrast' | 'sidebarPersistCollapse'>) {
    setViewOpts(prev => {
      const next = { ...prev, [key]: !prev[key] }
      applyViewOptions(next)
      dispatchViewOptionsChanged(next)
      toast.success('Görünüm seçeneği uygulandı')
      return next
    })
  }

  function setSidebarMode(mode: ViewOptions['sidebarMode']) {
    setViewOpts(prev => {
      const next = { ...prev, sidebarMode: mode }
      applyViewOptions(next)
      dispatchViewOptionsChanged(next)
      toast.success(mode === 'categorized' ? 'Kategorize menü etkin' : 'Klasik menü etkin')
      return next
    })
  }

  useEffect(() => {
    setActiveTheme(getSavedTheme())
    setAutoNotify(getNotificationSettings())
    setNotifications(getNotificationPrefs())
    setPortal(prev => ({ ...prev, ...getPortalSettings() }))

    const opts = getViewOptions()
    setViewOpts(opts)
    applyViewOptions(opts)
    // Profil bilgilerini Supabase'den çek
    async function loadProfile() {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, tenant_id, tenants(company_name, portal_slug, city)')
        .eq('id', user.id)
        .single()
      if (profileData) {
        const companyName = (profileData as any).tenants?.company_name || ''
        setProfile(p => ({
          ...p,
          name: (profileData as any).full_name || '',
          email: user.email || '',
          company: companyName,
          city: (profileData as any).tenants?.city || '',
        }))
        setPortal(p => ({
          ...p,
          slug: (profileData as any).tenants?.portal_slug || p.slug,
        }))
        if (companyName) {
          setAutoNotify(prev => ({
            ...prev,
            shop_name: prev.shop_name?.trim() ? prev.shop_name : companyName,
          }))
        }
        const slug = (profileData as any).tenants?.portal_slug || ''
        if (slug) {
          setPortal(p => ({ ...p, slug }))
          setAutoNotify(prev => ({ ...prev, portal_slug: prev.portal_slug || slug }))
        }
      } else {
        setProfile(p => ({ ...p, email: user.email || '' }))
      }
    }
    loadProfile()
    fetchBusinessBrandingFromSupabase().then(remote => {
      if (!remote) return
      setAutoNotify(prev => ({
        ...prev,
        shop_name: remote.shop_name || prev.shop_name,
        shop_phone: remote.shop_phone || prev.shop_phone,
        shop_address: remote.shop_address || prev.shop_address,
        shop_logo: remote.shop_logo || prev.shop_logo,
        portal_slug: remote.portal_slug || prev.portal_slug,
      }))
      if (remote.portal_slug) setPortal(p => ({ ...p, slug: remote.portal_slug! }))
    })
    fetch('/api/tenant/notification-config', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => { if (json.config) setNotifConfig(c => ({ ...c, ...json.config })) })
      .catch(() => {})
    fetch('/api/tenant/api-key', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.has_key && json.key_hint) setApiKeyPreview(json.key_hint)
      })
      .catch(() => {})
  }, [])

  function handleThemeChange(key: ThemeKey) {
    setActiveTheme(key)
    applyTheme(key)
    toast.success(`${THEMES[key].name} teması uygulandı`)
  }

  async function handleSaveBranding(silent = false) {
    setSyncing(true)
    const portalSlug = portal.slug || autoNotify.portal_slug
    saveBusinessBranding({
      shop_name: autoNotify.shop_name,
      shop_logo: autoNotify.shop_logo,
      shop_phone: autoNotify.shop_phone,
      shop_address: autoNotify.shop_address,
      portal_slug: portalSlug,
    })
    savePortalSettings({ ...portal, slug: portalSlug })
    const sync = await syncBusinessBrandingToSupabase({
      shop_name: autoNotify.shop_name,
      shop_logo: autoNotify.shop_logo,
      shop_phone: autoNotify.shop_phone,
      shop_address: autoNotify.shop_address,
      portal_slug: portalSlug,
    })
    setSyncing(false)
    setBrandDirty(false)
    if (autoNotify.shop_name && !profile.company) {
      setProfile(p => ({ ...p, company: autoNotify.shop_name }))
    }
    if (!silent) {
      if (sync.ok) {
        toast.success('Marka kaydedildi — Supabase ile senkronize edildi')
      } else {
        toast.warning(`Yerel kayıt tamam. ${sync.error || 'Bulut senkronu atlandı'}`)
      }
    }
    return sync.ok
  }

  async function handleSave() {
    setSaving(true)
    try {
      saveNotificationPrefs(notifications)
      savePortalSettings(portal)
      setNotificationSettings(autoNotify)

      if (brandDirty) {
        await handleSaveBranding(true)
      }

      const res = await fetch('/api/tenant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.name,
          phone: profile.phone,
          company_name: profile.company || autoNotify.shop_name,
          city: profile.city,
          tax_number: profile.tax_no,
          portal_slug: portal.slug || autoNotify.portal_slug,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Profil kaydedilemedi')
      }

      setSaved(true)
      toast.success('Ayarlar kaydedildi')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotifications() {
    saveNotificationPrefs(notifications)
    setNotificationSettings(autoNotify)
    toast.success('Bildirim ayarları kaydedildi')
  }

  async function handlePasswordUpdate() {
    if (passwords.new.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalı')
      return
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Şifreler eşleşmiyor')
      return
    }
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (error) {
      toast.error(error.message)
      return
    }
    setPasswords({ new: '', confirm: '' })
    toast.success('Şifre güncellendi')
  }

  const previewBranding: BusinessBranding = {
    shopName: autoNotify.shop_name?.trim() || 'AURA İntegra',
    shopPhone: autoNotify.shop_phone?.trim() || '',
    shopAddress: autoNotify.shop_address?.trim() || '',
    shopLogo: autoNotify.shop_logo?.trim() || null,
  }

  function markBrandDirty() {
    setBrandDirty(true)
  }

  async function applyLogoFile(file: File) {
    setLogoUploading(true)
    try {
      const dataUrl = await readLogoFile(file)
      setAutoNotify(n => ({ ...n, shop_logo: dataUrl }))
      setBrandDirty(true)
      setShowCrop(true)
      toast.success('Logo yüklendi — kırpmak için devam edin')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo yüklenemedi')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await applyLogoFile(file)
    e.target.value = ''
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void applyLogoFile(file)
  }

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'genel',       icon: <User size={15}/>,       label: 'Genel Bilgiler'    },
    { id: 'tema',        icon: <Palette size={15}/>,    label: 'Tema & Görünüm'   },
    { id: 'bildirim',    icon: <Bell size={15}/>,       label: 'Bildirimler'      },
    { id: 'guvenlik',    icon: <Shield size={15}/>,     label: 'Güvenlik'         },
    { id: 'entegrasyon', icon: <Zap size={15}/>,        label: 'Entegrasyonlar'   },
    { id: 'abonelik',    icon: <CreditCard size={15}/>, label: 'Abonelik'         },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Ayarlar</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-0.5">Hesap, tema, bildirim ve entegrasyon ayarları</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* Sidebar / mobil yatay sekmeler */}
        <div className="md:w-48 flex-shrink-0">
          <nav className="mobile-scroll-tabs md:block md:space-y-0.5 md:overflow-visible md:mx-0 md:px-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'text-white'
                    : 'settings-nav-idle text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                }`}
                style={tab === t.id ? { backgroundColor: 'var(--accent)' } : {}}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── GENEL ──────────────────────────────────────────────────────── */}
          {tab === 'genel' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <Building2 size={20} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Firma Markası</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      Logo ve dükkan adı servis formu, WhatsApp mesajları ve yan menüde görünür.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 mb-5">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${
                        dragOver ? 'border-sky-400 bg-sky-500/10' : 'border-[var(--bg-border)] bg-[var(--bg-muted)]'
                      }`}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleLogoDrop}
                    >
                      {autoNotify.shop_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={autoNotify.shop_logo} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="text-center px-2">
                          <Upload size={24} className="text-[var(--text-muted)] mx-auto mb-1" />
                          <p className="text-[10px] text-[var(--text-muted)]">Sürükle veya seç</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <label className="btn-secondary btn-sm cursor-pointer">
                        {logoUploading ? 'Yükleniyor...' : 'Logo Seç'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                      </label>
                      {autoNotify.shop_logo && (
                        <>
                          <button type="button" onClick={() => setShowCrop(true)} className="btn-secondary btn-sm flex items-center gap-1">
                            <Crop size={14} /> Kırp
                          </button>
                          <button type="button" onClick={() => { setAutoNotify(n => ({ ...n, shop_logo: '' })); markBrandDirty() }} className="btn-ghost btn-sm text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] text-center max-w-[140px]">PNG/JPG, max 400 KB</p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Dükkan / Şirket Adı</label>
                      <input
                        className="input"
                        placeholder="Örn: ABC Telefon Teknik Servis"
                        value={autoNotify.shop_name}
                        onChange={e => { setAutoNotify(n => ({ ...n, shop_name: e.target.value })); markBrandDirty() }}
                      />
                    </div>
                    <div>
                      <label className="label">Servis Telefonu</label>
                      <input
                        className="input"
                        placeholder="0850 xxx xx xx"
                        value={autoNotify.shop_phone}
                        onChange={e => { setAutoNotify(n => ({ ...n, shop_phone: e.target.value })); markBrandDirty() }}
                      />
                    </div>
                    <div>
                      <label className="label">Adres</label>
                      <input
                        className="input"
                        placeholder="Mağaza adresi"
                        value={autoNotify.shop_address}
                        onChange={e => { setAutoNotify(n => ({ ...n, shop_address: e.target.value })); markBrandDirty() }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Takip Sayfası Slug</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)] shrink-0">/takip?shop=</span>
                        <input
                          className="input"
                          placeholder="dukkan-adi"
                          value={portal.slug}
                          onChange={e => {
                            setPortal(p => ({ ...p, slug: e.target.value }))
                            setAutoNotify(n => ({ ...n, portal_slug: e.target.value }))
                            markBrandDirty()
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Müşteri takip linkinde firma logosu ve iletişim bilgisi bu slug ile gelir.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveBranding()}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Save size={14} /> {syncing ? 'Kaydediliyor...' : brandDirty ? 'Kaydet & Senkronize Et' : 'Markayı Kaydet'}
                  </button>
                  {brandDirty && (
                    <span className="text-xs text-amber-600 font-medium">Kaydedilmemiş değişiklikler var</span>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--bg-border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Canlı Önizleme</p>
                  <BrandLivePreview branding={previewBranding} />
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Profil Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Ad Soyad</label><input className="input" value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))}/></div>
                  <div><label className="label">E-posta</label><input className="input" value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))}/></div>
                  <div><label className="label">Telefon</label><input className="input" value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))}/></div>
                  <div><label className="label">Şirket Adı</label><input className="input" value={profile.company} onChange={e=>setProfile(p=>({...p,company:e.target.value}))}/></div>
                  <div><label className="label">Şehir</label><input className="input" value={profile.city} onChange={e=>setProfile(p=>({...p,city:e.target.value}))}/></div>
                  <div><label className="label">Vergi No</label><input className="input font-mono" value={profile.tax_no} onChange={e=>setProfile(p=>({...p,tax_no:e.target.value}))}/></div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Müşteri Portali Ayarları</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Portal URL Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] border border-r-0 border-[var(--bg-border)] rounded-l-lg px-3 py-2.5">takip.auraintegra.com/</span>
                      <input className="input rounded-l-none flex-1" value={portal.slug} onChange={e=>setPortal(p=>({...p,slug:e.target.value}))}/>
                      <button onClick={()=>{navigator.clipboard?.writeText(`https://takip.auraintegra.com/${portal.slug}`);toast.success('Link kopyalandı')}}
                        className="btn-secondary p-2.5"><Copy size={14}/></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key:'sms_enabled',  label:'SMS Bildirimleri', desc:'Müşterilere otomatik SMS' },
                      { key:'otp_enabled',  label:'OTP Giriş',        desc:'Tek seferlik kod doğrulama' },
                      { key:'kvkk_auto',    label:'KVKK Otomatik',    desc:'KVKK talep otomatik işleme' },
                    ].map(s => (
                      <div key={s.key} className="flex items-start justify-between p-3 rounded-lg settings-panel border border-[var(--bg-border)]">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{s.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{s.desc}</p>
                        </div>
                        <button onClick={() => setPortal(p => ({...p,[s.key]:!p[s.key as keyof PortalSettings]}))}
                          className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 mt-0.5 ${portal[s.key as keyof PortalSettings] ? '' : 'settings-toggle-off bg-[var(--bg-border)]'}`}
                          style={portal[s.key as keyof PortalSettings] ? { backgroundColor: 'var(--accent)' } : {}}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${portal[s.key as keyof PortalSettings] ? 'left-5' : 'left-0.5'}`}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={() => void handleSave()} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)' }}>
                {saved ? <Check size={15}/> : <Save size={15}/>}
                {saved ? 'Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          )}

          {/* ── TEMA ───────────────────────────────────────────────────────── */}
          {tab === 'tema' && (
            <div className="space-y-4">
              <div className="card p-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">Görünüm Modu</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Açık veya koyu tema — tüm panelde geçerli.</p>
                </div>
                <ColorModeToggle />
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Tema Rengi</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Panel renk temasını seçin. Tüm butonlar, vurgular ve aktif menü bu rengi kullanır.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, theme]) => (
                    <button key={key} onClick={() => handleThemeChange(key)}
                      className={`settings-theme-card relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        activeTheme === key ? 'border-current shadow-md' : 'border-[var(--bg-border)] hover:border-[var(--text-muted)]'
                      }`}
                      style={activeTheme === key ? { borderColor: theme.accent, backgroundColor: theme.light } : {}}>
                      {/* Color swatches */}
                      <div className="flex gap-1 flex-shrink-0">
                        {theme.preview.map((c, i) => (
                          <div key={i} className="w-4 h-8 rounded" style={{ backgroundColor: c }}/>
                        ))}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{theme.name}</p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">{theme.accent}</p>
                      </div>
                      {activeTheme === key && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: theme.accent }}>
                          <Check size={11} className="text-white"/>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-5 p-4 rounded-xl border settings-preview-box border-[var(--bg-border)] bg-[var(--bg-muted)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Önizleme</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      Birincil Buton
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold border-2" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                      İkincil Buton
                    </button>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                      Badge Örneği
                    </span>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }}/>
                      Aktif gösterge
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Menü Düzeni</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Sol panelde Stok, Finans gibi kategorilere tıklayınca alt menüler açılsın mı?
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setSidebarMode('classic')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      viewOpts.sidebarMode === 'classic'
                        ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[var(--bg-border)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Klasik Liste</p>
                    <div className="space-y-1 text-[10px] font-mono text-[var(--text-muted)]">
                      <p className="uppercase tracking-wider">MODÜLLER</p>
                      <p>Stok</p>
                      <p>Teknik Servis</p>
                      <p>Finans</p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Sabit, hep açık liste</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSidebarMode('categorized')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      viewOpts.sidebarMode === 'categorized'
                        ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[var(--bg-border)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Kategorize Menü</p>
                    <div className="space-y-1 text-[10px] text-[var(--text-muted)]">
                      <p className="font-semibold text-[var(--text-primary)]">▾ Stok</p>
                      <p className="pl-2 opacity-70">Stok · Sayım</p>
                      <p className="font-semibold text-[var(--text-primary)]">▸ Finans</p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Tıklayınca alt segmentler açılır</p>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-[var(--bg-border)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Sidebar Daraltmayı Hatırla</p>
                    <p className="text-xs text-[var(--text-muted)]">Daraltılmış menü tercihi cihazda saklanır</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleViewOpt('sidebarPersistCollapse')}
                    className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${viewOpts.sidebarPersistCollapse ? '' : 'settings-toggle-off bg-[var(--bg-border)]'}`}
                    style={viewOpts.sidebarPersistCollapse ? { backgroundColor: 'var(--accent)' } : {}}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${viewOpts.sidebarPersistCollapse ? 'left-5' : 'left-0.5'}`}/>
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Görünüm Seçenekleri</h3>
                <div className="space-y-3">
                  {([
                    { key: 'compact' as const,      label:'Kompakt Mod',         desc:'Tablo ve kart aralıklarını azaltır' },
                    { key: 'noAnim' as const,       label:'Animasyonları Kapat', desc:'Menü geçişleri dahil animasyonları kapatır' },
                    { key: 'highContrast' as const, label:'Yüksek Kontrast',     desc:'Erişilebilirlik için kontrast artırır' },
                  ]).map(o => (
                    <div key={o.key} className="flex items-center justify-between py-2 border-b border-[var(--bg-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{o.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{o.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleViewOpt(o.key)}
                        className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${viewOpts[o.key] ? '' : 'settings-toggle-off bg-[var(--bg-border)]'}`}
                        style={viewOpts[o.key] ? { backgroundColor: 'var(--accent)' } : {}}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${viewOpts[o.key] ? 'left-5' : 'left-0.5'}`}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BİLDİRİMLER ────────────────────────────────────────────────── */}
          {tab === 'bildirim' && (
            <div className="card p-5">
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">Bildirim Tercihleri</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5">Hangi olaylar için bildirim almak istediğinizi seçin.</p>
              <div className="space-y-3">
                {NOTIFICATION_SETTINGS.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-[var(--bg-border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{s.label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{s.desc}</p>
                    </div>
                    <button onClick={() => setNotifications(n => ({ ...n, [s.id]: !n[s.id as keyof NotificationPrefs] }))}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${notifications[s.id as keyof NotificationPrefs] ? '' : 'settings-toggle-off bg-[var(--bg-border)]'}`}
                      style={notifications[s.id as keyof NotificationPrefs] ? { backgroundColor: 'var(--accent)' } : {}}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifications[s.id as keyof NotificationPrefs] ? 'left-5' : 'left-0.5'}`}/>
                    </button>
                  </div>
                ))}
              </div>
              <div className="card p-5 mt-4 border border-sky-500/20 bg-sky-500/5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">SMS / WhatsApp Otomasyonu</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Servis durumu değişince otomatik müşteri bildirimi.</p>
                <div className="space-y-3">
                  {([
                    ['auto_sms', 'Otomatik SMS'],
                    ['auto_whatsapp', 'WhatsApp (simülasyon)'],
                    ['on_status_change', 'Durum değişiminde gönder'],
                    ['on_delivery', 'Teslimde gönder'],
                    ['require_qc_on_delivery', 'Teslimde QC zorunlu'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between py-2 border-b border-[var(--bg-border)] last:border-0">
                      <span className="text-sm text-[var(--text-primary)]">{label}</span>
                      <input
                        type="checkbox"
                        checked={autoNotify[key]}
                        onChange={e => setAutoNotify(n => ({ ...n, [key]: e.target.checked }))}
                        className="rounded border-slate-300"
                      />
                    </label>
                  ))}
                  <input className="input mt-2" placeholder="Mağaza adresi (Ayarlar → Firma Markası'ndan da düzenlenebilir)" value={autoNotify.shop_address}
                    onChange={e => setAutoNotify(n => ({ ...n, shop_address: e.target.value }))} />
                  <input className="input" placeholder="Mağaza telefonu" value={autoNotify.shop_phone}
                    onChange={e => setAutoNotify(n => ({ ...n, shop_phone: e.target.value }))} />
                  <input className="input" placeholder="Dükkan adı (WhatsApp / fiş)" value={autoNotify.shop_name}
                    onChange={e => setAutoNotify(n => ({ ...n, shop_name: e.target.value }))} />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveNotifications()}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Save size={14}/> Otomasyonu Kaydet
                </button>
              </div>
              <button onClick={() => void handleSaveNotifications()} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                <Save size={14}/> Tüm Bildirimleri Kaydet
              </button>
            </div>
          )}

          {/* ── GÜVENLİK ───────────────────────────────────────────────────── */}
          {tab === 'guvenlik' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Şifre Değiştir</h3>
                <div className="space-y-3 max-w-md">
                  <div><label className="label">Yeni Şifre</label>
                    <div className="relative">
                      <input type={showPass?'text':'password'} className="input pr-10" placeholder="En az 8 karakter"
                        value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}/>
                      <button type="button" onClick={()=>setShowPass(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <div><label className="label">Yeni Şifre (Tekrar)</label>
                    <input type="password" className="input" placeholder="Şifreyi tekrar girin"
                      value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}/>
                  </div>
                  <button type="button" onClick={() => void handlePasswordUpdate()} className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}>Şifreyi Güncelle</button>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">İki Faktörlü Doğrulama</h3>
                <div className="flex items-center gap-3 p-4 settings-panel rounded-xl border border-[var(--bg-border)]">
                  <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                    <Shield size={18} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">E-posta ile Doğrulama</p>
                    <p className="text-xs text-[var(--text-muted)]">Giriş yapılırken e-posta adresinize doğrulama kodu gönderilir. SMS desteği mevcut değildir.</p>
                  </div>
                  <span className="ml-auto badge badge-slate text-xs">Yakında</span>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Aktif Oturumlar</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Bu Cihaz</p>
                      <p className="text-xs text-[var(--text-muted)]">Şu an aktif</p>
                    </div>
                    <span className="badge badge-green text-xs">Bu Cihaz</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ENTEGRASYONLAR ─────────────────────────────────────────────── */}
          {tab === 'entegrasyon' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Entegrasyonlar</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Harici servis ve yazılımlarla bağlantı kurun.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {INTEGRATIONS.map(int => {
                    const st = STATUS_INFO[int.status]
                    return (
                      <div key={int.id} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--bg-border)] hover:border-[var(--text-muted)] transition-all">
                        <div className="w-10 h-10 bg-[var(--bg-muted)] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          {int.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{int.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{int.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge text-xs ${st.color}`}>{st.label}</span>
                          {int.status === 'available' && (
                            <button onClick={()=>toast.info(`${int.name} entegrasyon kurulumu başlatılıyor...`)}
                              className="text-xs font-semibold transition-all" style={{ color: 'var(--accent)' }}>
                              Kur
                            </button>
                          )}
                          {int.status === 'connected' && (
                            <button onClick={()=>toast.success('Bağlantı test edildi')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <RefreshCw size={13}/>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">SMS / E-posta Yapılandırması</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="label">Netgsm Kullanıcı</label>
                    <input className="input text-sm" value={notifConfig.netgsm_user}
                      onChange={e => setNotifConfig(c => ({ ...c, netgsm_user: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Netgsm Başlık</label>
                    <input className="input text-sm" value={notifConfig.netgsm_header}
                      onChange={e => setNotifConfig(c => ({ ...c, netgsm_header: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Netgsm Şifre</label>
                    <input type="password" className="input text-sm" placeholder="••••••••"
                      onChange={e => setNotifConfig(c => ({ ...c, netgsm_pass: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">WhatsApp İş Telefonu</label>
                    <input className="input text-sm" value={notifConfig.whatsapp_phone}
                      onChange={e => setNotifConfig(c => ({ ...c, whatsapp_phone: e.target.value }))} placeholder="905xxxxxxxxx" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void fetch('/api/tenant/notification-config', {
                      method: 'PUT',
                      credentials: 'same-origin',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(notifConfig),
                    }).then(r => r.json()).then(json => {
                      if (json.ok) toast.success('Bildirim ayarları kaydedildi')
                      else toast.error(json.error || 'Kaydedilemedi')
                    })
                  }}
                  className="btn-primary text-sm"
                >
                  Bildirim Ayarlarını Kaydet
                </button>
                <a href="/api/tenant/export/accounting" className="ml-3 text-sm text-sky-600 font-semibold hover:underline">
                  Muhasebe CSV İndir →
                </a>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">API Erişimi</h3>
                <div>
                  <label className="label">API Anahtarı</label>
                  <div className="flex gap-2">
                    <input className="input flex-1 font-mono text-xs" value={newApiKey ?? apiKeyPreview ?? 'Henüz oluşturulmadı'} readOnly/>
                    {(newApiKey ?? apiKeyPreview) && (
                      <button onClick={() => { navigator.clipboard?.writeText(newApiKey ?? ''); toast.success('Kopyalandı') }} className="btn-secondary p-2.5"><Copy size={14}/></button>
                    )}
                    <button
                      onClick={() => {
                        void fetch('/api/tenant/api-key', { method: 'POST', credentials: 'same-origin' })
                          .then(r => r.json())
                          .then(json => {
                            if (json.api_key) {
                              setNewApiKey(json.api_key)
                              toast.success('Yeni API anahtarı oluşturuldu — şimdi kopyalayın')
                            } else toast.error(json.error || 'Oluşturulamadı')
                          })
                      }}
                      className="btn-secondary p-2.5"
                    >
                      <RefreshCw size={14}/>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">REST API: GET /api/v1/orders — Header: X-API-Key</p>
                </div>
              </div>
            </div>
          )}

          {/* ── ABONELİK ───────────────────────────────────────────────────── */}
          {tab === 'abonelik' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Mevcut Plan</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Abonelik durumu ve kullanım bilgileri</p>
                  </div>
                  <span className="badge text-sm font-bold px-3 py-1.5" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                    Profesyonel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                  {[
                    { label:'Aylık Ücret',    value:'₺1.490 + KDV' },
                    { label:'Sonraki Ödeme',  value:'04 Temmuz 2026' },
                    { label:'Aktif Kullanıcı', value:'3 / 5' },
                  ].map(s => (
                    <div key={s.label} className="settings-panel rounded-xl p-4 text-center border border-[var(--bg-border)]">
                      <p className="text-lg font-black text-[var(--text-primary)]">{s.value}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)]">Plan İçeriği</h4>
                  {['Tüm modüller', '5 kullanıcı', 'Öncelikli destek', 'API erişimi', 'Özel raporlar'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} style={{ color: 'var(--accent)' }}/>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Plan Yükselt</h3>
                <div className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all"
                  style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Kurumsal Plan</p>
                    <p className="text-xs text-[var(--text-secondary)]">Sınırsız kullanıcı • Çok şube • 7/24 destek</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[var(--text-primary)]">₺2.990<span className="text-sm font-normal text-[var(--text-muted)]">/ay</span></p>
                    <button onClick={()=>toast.info('Yükseltme talebi oluşturuldu')}
                      className="text-xs font-bold transition-all" style={{ color: 'var(--accent)' }}>
                      Yükselt →
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Fatura Geçmişi</h3>
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-sm text-[var(--text-muted)]">Henüz fatura kaydı yok</p>
                  <p className="text-xs text-[var(--text-muted)] opacity-70">Ödemeler gerçekleştikçe burada görünecek</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <LogoCropModal
        open={showCrop && Boolean(autoNotify.shop_logo)}
        imageSrc={autoNotify.shop_logo}
        onClose={() => setShowCrop(false)}
        onApply={dataUrl => {
          setAutoNotify(n => ({ ...n, shop_logo: dataUrl }))
          markBrandDirty()
          toast.success('Logo kırpıldı')
        }}
      />
    </div>
  )
}
