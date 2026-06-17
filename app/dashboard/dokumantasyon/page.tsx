'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Search, ChevronRight, ExternalLink, Clock, Wrench, Package, DollarSign, User, Settings, Globe } from 'lucide-react'

interface DocPage {
  id: string
  slug: string
  title: string
  content: string
  module: string
  sort_order: number
}

const MODULE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'teknik-servis': { label: 'Teknik Servis', icon: <Wrench size={15} />,    color: 'text-blue-600 bg-blue-50' },
  'stok':          { label: 'Stok & Tedarik', icon: <Package size={15} />,  color: 'text-green-600 bg-green-50' },
  'finans':        { label: 'Finans',          icon: <DollarSign size={15} />, color: 'text-amber-600 bg-amber-50' },
  'portal':        { label: 'Müşteri Portali', icon: <Globe size={15} />,    color: 'text-purple-600 bg-purple-50' },
  'kullanici':     { label: 'Kullanıcılar',    icon: <User size={15} />,     color: 'text-slate-600 bg-slate-100' },
  'admin':         { label: 'Admin Kılavuzu',  icon: <Settings size={15} />, color: 'text-rose-600 bg-rose-50' },
  'genel':         { label: 'Genel',           icon: <BookOpen size={15} />, color: 'text-slate-600 bg-slate-100' },
}

const STATIC_DOCS: DocPage[] = [
  {
    id: '1', slug: 'teknik-servis-giris', title: 'Teknik Servise Giriş', module: 'teknik-servis', sort_order: 1,
    content: `<h2>Teknik Servis Modülü</h2>
<p>Cihaz kabul, teşhis, tamir ve teslim sürecini uçtan uca yönetin. AURA ServisPanel 24 farklı servis durumu ile tam izlenebilirlik sağlar.</p>
<h3>Servis Akışı</h3>
<ol>
  <li><strong>Cihaz Kabul:</strong> Müşteri bilgileri, cihaz bilgileri ve arıza tanımı girilir. İş emri otomatik numaralandırılır.</li>
  <li><strong>Teşhis:</strong> Teknisyen inceleme yapar, fiyat teklifi oluşturur.</li>
  <li><strong>Müşteri Onayı:</strong> Müşteriye WhatsApp/portal linki gönderilir.</li>
  <li><strong>Tamir:</strong> Stoktan parça kullanımı, işçilik kaydı yapılır.</li>
  <li><strong>Kalite Kontrol:</strong> Tamir doğrulaması yapılır.</li>
  <li><strong>Teslim:</strong> Müşteri bildirilir, ödeme alınır, garanti belgesi oluşturulur.</li>
</ol>
<h3>Cihaz Detay Sayfası</h3>
<ul>
  <li>Atölye listesinden herhangi bir cihaza tıklayın → <strong>Tam Sayfa</strong> butonuna basın</li>
  <li>Görsel yükleme: PNG/JPG fotoğraflar eklenebilir</li>
  <li>Stok parçaları: Arayın → miktar seçin → "Bu Servise Ekle"</li>
  <li>Parça maliyeti servis ücretinden ayrı izlenir</li>
</ul>
<h3>WhatsApp Entegrasyonu</h3>
<p>Cihaz detay sayfasındaki WhatsApp butonu müşteriye otomatik mesaj + portal linki gönderir.</p>`
  },
  {
    id: '2', slug: 'stok-yonetimi', title: 'Stok & Envanter', module: 'stok', sort_order: 2,
    content: `<h2>Stok & Tedarik Modülü</h2>
<p>Parça envanterinizi, tedarikçilerinizi ve sipariş süreçlerinizi tek ekranda yönetin.</p>
<h3>Parça Kataloğu</h3>
<ul>
  <li>SKU, kategori, marka bazlı organize envanter</li>
  <li>Kritik stok seviyesi tanımlama ve otomatik uyarı</li>
  <li>Alış/satış fiyatı ayrı ayrı takip edilir</li>
</ul>
<h3>Servis Emrine Parça Bağlama</h3>
<p>Cihaz detay sayfasından stokta bulunan parçaları servise ekleyebilirsiniz. Parça maliyeti otomatik hesaplanır, stok miktarı güncellenir.</p>
<h3>Durum Kodları</h3>
<ul>
  <li>🟢 <strong>Normal:</strong> Yeterli stok var</li>
  <li>🟡 <strong>Kritik:</strong> Minimum seviyenin altında</li>
  <li>🔴 <strong>Tükenmiş:</strong> Stok sıfır</li>
</ul>`
  },
  {
    id: '3', slug: 'finans-muhasebe', title: 'Finans ve Kasa', module: 'finans', sort_order: 3,
    content: `<h2>Finans Modülü</h2>
<p>Gelir/gider takibi, kasa yönetimi ve finansal raporlamayı tek ekranda yönetin.</p>
<h3>Otomatik Kasa Entegrasyonu</h3>
<p>Servis ödemeleri ve POS satışları otomatik olarak kasa hareketine dönüşür. Ayrıca manuel gelir/gider girişi de yapılabilir.</p>
<h3>Ödeme Yöntemleri</h3>
<ul>
  <li>💵 Nakit</li>
  <li>💳 Kredi Kartı</li>
  <li>🏦 Banka Havalesi</li>
</ul>
<h3>Çek Yönetimi</h3>
<p>Alınan çekler vade tarihine göre takip edilir. Geciken çekler kırmızı ile işaretlenir ve uyarı verilir.</p>
<h3>KDV Raporu</h3>
<p>%18 ve %8 KDV ayrı hesaplanır. Beyan için aylık rapor oluşturulabilir.</p>`
  },
  {
    id: '4', slug: 'musteri-portali-kullanim', title: 'Müşteri Takip Portali', module: 'portal', sort_order: 4,
    content: `<h2>Müşteri Takip Portali</h2>
<p>Müşterileriniz, servis durumlarını istedikleri zaman sorgulayabilir.</p>
<h3>Portal URL</h3>
<p>Her bayinin kendine özel bir portal linki vardır:</p>
<code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:13px">integra.aurabilisim.net/portal/[bayi-slug]</code>
<p style="font-size:12px;color:#64748b;margin-top:6px">Kısa URL için DNS: <code>takip.aurabilisim.net</code> → Vercel</p>
<p style="margin-top:8px">Bayi slug, <strong>Ayarlar → Genel Bilgiler</strong> bölümünden değiştirilebilir.</p>
<h3>Müşteri Sorgulama</h3>
<p>Müşteri <strong>ad/soyad</strong> veya <strong>telefon numarası</strong> ile kayıtlı tüm cihazlarını görebilir.</p>
<h3>WhatsApp ile Gönderim</h3>
<p>Cihaz detay sayfasındaki WhatsApp butonu müşteriye portal linki içeren hazır mesaj gönderir.</p>
<h3>Servis Timeline</h3>
<p>Müşteri, cihazının hangi aşamada olduğunu adım adım görebilir. Aktif adım yanıp söner.</p>`
  },
  {
    id: '5', slug: 'kullanici-yetkileri', title: 'Kullanıcı Yönetimi', module: 'kullanici', sort_order: 5,
    content: `<h2>Çok Kullanıcılı Erişim</h2>
<p>Bayinize birden fazla çalışan ekleyebilirsiniz. Örneğin <code>ferhat@summit.com</code> ve <code>ozgur@summit.com</code> aynı anda aynı paneli kullanabilir.</p>
<h3>Kullanıcı Rolleri</h3>
<table style="width:100%;border-collapse:collapse;font-size:14px">
  <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0">Rol</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0">Yetkiler</th></tr></thead>
  <tbody>
    <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9"><strong>Sahip (Owner)</strong></td><td style="padding:8px;border-bottom:1px solid #f1f5f9">Tam erişim, kullanıcı yönetimi dahil</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9"><strong>Yönetici</strong></td><td style="padding:8px;border-bottom:1px solid #f1f5f9">Tüm modüller, kullanıcı yönetimi hariç</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9"><strong>Personel</strong></td><td style="padding:8px;border-bottom:1px solid #f1f5f9">Servis ve stok işlemleri</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #f1f5f9"><strong>Teknisyen</strong></td><td style="padding:8px;border-bottom:1px solid #f1f5f9">Sadece atanmış servisler</td></tr>
    <tr><td style="padding:8px"><strong>Kasiyer</strong></td><td style="padding:8px">POS ve ödeme işlemleri</td></tr>
  </tbody>
</table>
<h3>Kullanıcı Ekleme (Admin Panel)</h3>
<p>Süper Admin paneli → <strong>Bayi Kullanıcıları</strong> ekranından bayiyi seçin → kullanıcı e-postasını girin → rol atayın.</p>`
  },
  {
    id: '6', slug: 'admin-kilavuz', title: 'Admin Paneli Kılavuzu', module: 'admin', sort_order: 6,
    content: `<h2>Süper Admin Paneli</h2>
<p>Bu panel, tüm bayileri yönetmek ve sistem ayarlarını düzenlemek için kullanılır. Yalnızca <code>super_admin</code> rolündeki hesaplar erişebilir.</p>
<h3>Bayi Yönetimi</h3>
<ul>
  <li>Yeni bayi oluşturma: şirket adı, iletişim bilgileri, paket seçimi</li>
  <li>Mevcut bayileri düzenleme ve durum değiştirme (Aktif/Deneme/Askıya Alındı)</li>
  <li>Abonelik tarihleri ve plan değişikliği</li>
</ul>
<h3>Bayi Kullanıcıları</h3>
<p>Her bayiye birden fazla kullanıcı hesabı atanabilir. Roller ve yetkiler bu ekrandan yönetilir.</p>
<h3>Başvuru Yönetimi</h3>
<p>Bayi başvurularını inceleyin, onaylayın veya reddedin. Onaylanan başvurulardan hızlıca bayi hesabı oluşturun.</p>
<h3>Dokümantasyon Yönetimi</h3>
<p>Admin → Dokümantasyon ekranından yeni sayfalar oluşturabilir, içerikleri düzenleyebilir ve yayın durumunu değiştirebilirsiniz. Değişiklikler anında yansır.</p>`
  },
]

export default function DokumantasyonPage() {
  const supabase = createClient()
  const [docs, setDocs]             = useState<DocPage[]>(STATIC_DOCS)
  const [selected, setSelected]     = useState<DocPage>(STATIC_DOCS[0])
  const [search, setSearch]         = useState('')
  const [activeModule, setActiveModule] = useState<string | null>(null)

  // Try to load from Supabase (override static if available)
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await (supabase.from('documentation_pages') as any)
          .select('*')
          .eq('published', true)
          .order('sort_order')
        if (!error && data && data.length > 0) {
          setDocs(data as DocPage[])
          setSelected(data[0] as DocPage)
        }
      } catch { /* use static */ }
    }
    load()
  }, [])

  const filtered = docs.filter(d => {
    const matchesSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    const matchesModule = !activeModule || d.module === activeModule
    return matchesSearch && matchesModule
  })

  const modules = [...new Set(docs.map(d => d.module))]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen size={20} style={{ color: 'var(--accent)' }} />
          Dokümantasyon
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Tüm modüller için kullanım kılavuzları</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Dokümanda ara..."
              className="input pl-8 text-sm py-2 w-full"
            />
          </div>

          {/* Module filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveModule(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                !activeModule ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={!activeModule ? { backgroundColor: 'var(--accent)' } : {}}
            >
              Tümü
            </button>
            {modules.map(m => {
              const meta = MODULE_META[m]
              return (
                <button
                  key={m}
                  onClick={() => setActiveModule(m === activeModule ? null : m)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    activeModule === m ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={activeModule === m ? { backgroundColor: 'var(--accent)' } : {}}
                >
                  {meta?.label ?? m}
                </button>
              )
            })}
          </div>

          {/* Doc list */}
          <nav className="space-y-0.5">
            {filtered.map(doc => {
              const meta = MODULE_META[doc.module]
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 group ${
                    selected.id === doc.id
                      ? 'text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  style={selected.id === doc.id ? { backgroundColor: 'var(--accent)' } : {}}
                >
                  <span className={`flex-shrink-0 ${selected.id === doc.id ? 'text-white' : ''}`}>
                    {meta?.icon}
                  </span>
                  <span className="text-sm font-medium truncate">{doc.title}</span>
                  <ChevronRight size={12} className="ml-auto flex-shrink-0 opacity-60" />
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Sonuç bulunamadı</p>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card p-8">
            {/* Doc meta */}
            <div className="flex items-start justify-between mb-6">
              <div>
                {(() => {
                  const meta = MODULE_META[selected.module]
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${meta?.color ?? 'bg-slate-100 text-slate-600'}`}>
                      {meta?.icon}
                      {meta?.label ?? selected.module}
                    </span>
                  )
                })()}
                <h2 className="text-2xl font-bold text-slate-900">{selected.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div
              className="prose prose-slate max-w-none text-sm leading-relaxed"
              style={{ lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .prose h2 { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 1.5rem 0 0.75rem; }
        .prose h3 { font-size: 1rem; font-weight: 600; color: #334155; margin: 1.25rem 0 0.5rem; }
        .prose p  { color: #475569; margin: 0.5rem 0; }
        .prose ul { padding-left: 1.25rem; margin: 0.5rem 0; }
        .prose ol { padding-left: 1.25rem; margin: 0.5rem 0; }
        .prose li { color: #475569; margin: 0.25rem 0; }
        .prose code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #334155; }
        .prose blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; color: #64748b; margin: 1rem 0; font-style: italic; }
        .prose table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 0.75rem 0; }
        .prose strong { color: #0f172a; }
      `}</style>
    </div>
  )
}
