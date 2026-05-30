/**
 * AURA İNTEGRA ERP — Ana Uygulama Scripti
 * Tüm modül render fonksiyonları, mock veri ve router
 *
 * GÜVENLİK NOTLARI:
 * - XSS: innerHTML KULLANILMAZ. Tüm kullanıcı verisi textContent ile render edilir.
 * - PII: TC, telefon, e-posta maskelenerek gösterilir.
 * - TODO(security): Production'da JWT + HttpOnly cookie + CSRF token zorunludur.
 * - TODO(security): Tüm input'lar backend'de parameterized query ile işlenmeli.
 * - TODO(security): sessionStorage sadece demo içindir; production'da HttpOnly cookie kullanın.
 */

'use strict';

/* ================================================================
   0. AUTH GUARD — Login yoksa yönlendir
   ================================================================ */
if (!sessionStorage.getItem('ai_auth')) {
  window.location.href = 'login.html';
}

/* ================================================================
   1. MOCK VERİ (Gerçekçi demo verisi)
   ================================================================ */
const DB = {
  currentUser: {
    name: sessionStorage.getItem('ai_user_name') || 'Mehmet Demir',
    role: sessionStorage.getItem('ai_user_role') || 'teknisyen',
    id:   sessionStorage.getItem('ai_user_id') || 'mehmet',
    branch: 'Merkez'
  },

  services: [
    { id: 'SRV-001', custName: 'Ahmet Yılmaz', custPhone: '0532 *** 45 67', device: 'iPhone 14 Pro', imei: '352679 *** 5678', fault: 'Ekran kırık', tech: 'Mehmet Demir', status: 'tamir',   statusLabel: 'Tamir',             date: '29.05.2026', cost: 2500, deposit: 500,  notes: 'Orijinal ekran bekleniyor' },
    { id: 'SRV-002', custName: 'Fatma Kaya',   custPhone: '0533 *** 65 43', device: 'Samsung S24 Ultra', imei: '490154 *** 7518', fault: 'Şarj olmuyor', tech: 'Mehmet Demir', status: 'teshis',  statusLabel: 'Teşhis',            date: '29.05.2026', cost: 800,  deposit: 0,   notes: '' },
    { id: 'SRV-003', custName: 'Kemal Arslan', custPhone: '0541 *** 22 33', device: 'Xiaomi 13',         imei: '864999 *** 0123', fault: 'Hoparlör arızası', tech: 'Mehmet Demir', status: 'onay',    statusLabel: 'Onay Bekleniyor',   date: '28.05.2026', cost: 600,  deposit: 100, notes: 'Müşteri SMS onayı bekleniyor' },
    { id: 'SRV-004', custName: 'Zeynep Çelik', custPhone: '0545 *** 88 99', device: 'iPhone 13',         imei: '352000 *** 4321', fault: 'Kamera çalışmıyor', tech: 'Mehmet Demir', status: 'teslim',  statusLabel: 'Teslim Edildi',     date: '27.05.2026', cost: 1800, deposit: 1800,notes: 'Teslim edildi, ödeme alındı' },
    { id: 'SRV-005', custName: 'Mustafa Yıldız', custPhone: '0506 *** 33 44', device: 'Oppo Reno 8', imei: '358440 *** 5566', fault: 'Pil şişmesi', tech: 'Mehmet Demir', status: 'alindi',  statusLabel: 'Alındı',            date: '29.05.2026', cost: 450,  deposit: 0,   notes: '' },
    { id: 'SRV-006', custName: 'Elif Demir',   custPhone: '0532 *** 11 22', device: 'Huawei P60',        imei: '867300 *** 9900', fault: 'Ekran yanmıyor',  tech: 'Mehmet Demir', status: 'kalite',  statusLabel: 'Kalite Kontrol',    date: '28.05.2026', cost: 1200, deposit: 600, notes: '' },
  ],

  products: [
    { id: 'PRD-001', brand: 'Apple',   model: 'iPhone 15',      storage: '128GB', color: 'Siyah', imei: '352999000111222', price: 42000, stock: 2, type: 'sifir',     typeLabel: 'Sıfır' },
    { id: 'PRD-002', brand: 'Samsung', model: 'Galaxy S24',     storage: '256GB', color: 'Gri',   imei: '490111000222333', price: 35000, stock: 1, type: 'sifir',     typeLabel: 'Sıfır' },
    { id: 'PRD-003', brand: 'Apple',   model: 'iPhone 14',      storage: '256GB', color: 'Mavi',  imei: '352888000333444', price: 28500, stock: 3, type: 'ikinci_el', typeLabel: '2.El' },
    { id: 'PRD-004', brand: 'Xiaomi',  model: 'Redmi Note 13',  storage: '128GB', color: 'Yeşil', imei: '864666000444555', price: 12000, stock: 5, type: 'sifir',     typeLabel: 'Sıfır' },
    { id: 'PRD-005', brand: 'Samsung', model: 'Galaxy A55',     storage: '256GB', color: 'Mor',   imei: '490222000555666', price: 18500, stock: 4, type: 'sifir',     typeLabel: 'Sıfır' },
    { id: 'PRD-006', brand: 'Apple',   model: 'iPhone 12',      storage: '64GB',  color: 'Beyaz', imei: '352777000666777', price: 16000, stock: 2, type: 'ikinci_el', typeLabel: '2.El' },
  ],

  parts: [
    { id: 'PRT-001', name: 'iPhone 14 Pro Ekran',    brand: 'Apple',   category: 'Ekran',    stock: 4,  minStock: 2, cost: 800,  barcode: 'PRT001' },
    { id: 'PRT-002', name: 'Samsung S23 Batarya',    brand: 'Samsung', category: 'Batarya',  stock: 7,  minStock: 3, cost: 250,  barcode: 'PRT002' },
    { id: 'PRT-003', name: 'iPhone 15 Şarj Portu',  brand: 'Apple',   category: 'Şarj',     stock: 1,  minStock: 3, cost: 350,  barcode: 'PRT003' },
    { id: 'PRT-004', name: 'Evrensel Hoparlör 8Ω',  brand: 'Genel',   category: 'Hoparlör', stock: 12, minStock: 5, cost: 80,   barcode: 'PRT004' },
    { id: 'PRT-005', name: 'Xiaomi Mi 11 Ekran',    brand: 'Xiaomi',  category: 'Ekran',    stock: 1,  minStock: 2, cost: 450,  barcode: 'PRT005' },
    { id: 'PRT-006', name: 'iPhone 13 Arka Kamera', brand: 'Apple',   category: 'Kamera',   stock: 3,  minStock: 1, cost: 1200, barcode: 'PRT006' },
  ],

  customers: [
    { id: 'MUS-001', name: 'Ahmet Yılmaz',   phone: '0532 *** 45 67', email: 'a***@gmail.com',   tc: '***-***-1234', totalSrv: 3, totalSpent: 4800,  kvkk: true,  lastVisit: '29.05.2026' },
    { id: 'MUS-002', name: 'Fatma Kaya',     phone: '0533 *** 65 43', email: 'f***@outlook.com', tc: '***-***-5678', totalSrv: 1, totalSpent: 800,   kvkk: true,  lastVisit: '29.05.2026' },
    { id: 'MUS-003', name: 'Kemal Arslan',   phone: '0541 *** 22 33', email: 'k***@hotmail.com', tc: '***-***-9012', totalSrv: 2, totalSpent: 1800,  kvkk: true,  lastVisit: '28.05.2026' },
    { id: 'MUS-004', name: 'Zeynep Çelik',   phone: '0545 *** 88 99', email: 'z***@yandex.com',  tc: '***-***-3456', totalSrv: 4, totalSpent: 12500, kvkk: false, lastVisit: '27.05.2026' },
    { id: 'MUS-005', name: 'Mustafa Yıldız', phone: '0506 *** 33 44', email: '-',                tc: '***-***-7890', totalSrv: 1, totalSpent: 450,   kvkk: true,  lastVisit: '29.05.2026' },
    { id: 'MUS-006', name: 'Elif Demir',     phone: '0532 *** 11 22', email: 'e***@gmail.com',   tc: '***-***-2345', totalSrv: 2, totalSpent: 3200,  kvkk: true,  lastVisit: '28.05.2026' },
  ],

  transactions: [
    { id: 'FIS-001', type: 'gelir', category: 'Servis Tahsilatı', desc: 'SRV-004 — Zeynep Çelik',   amount: 1800,  method: 'Nakit',   date: '27.05.2026' },
    { id: 'FIS-002', type: 'gelir', category: 'Satış',            desc: 'iPhone 14 256GB Mavi',     amount: 28500, method: 'POS',     date: '27.05.2026' },
    { id: 'FIS-003', type: 'gider', category: 'Parça Alım',       desc: 'iPhone 14 Pro Ekran x2',   amount: 1600,  method: 'Nakit',   date: '26.05.2026' },
    { id: 'FIS-004', type: 'gelir', category: 'Servis Kapora',    desc: 'SRV-003 — Kemal Arslan',   amount: 100,   method: 'Nakit',   date: '28.05.2026' },
    { id: 'FIS-005', type: 'gider', category: 'Kira',             desc: 'Mayıs 2026 — İşyeri kirası', amount: 8000, method: 'Havale', date: '01.05.2026' },
    { id: 'FIS-006', type: 'gelir', category: 'Satış',            desc: 'Galaxy A55 256GB Mor',      amount: 18500, method: 'POS',    date: '28.05.2026' },
  ],

  checks: [
    { id: 'CEK-001', customer: 'Büyük Teknoloji A.Ş.', amount: 15000, dueDate: '15.06.2026', status: 'beklemede',     type: 'musteri',  bank: 'Ziraat Bankası' },
    { id: 'CEK-002', customer: 'Global Parça Ltd.',     amount: 8500,  dueDate: '30.05.2026', status: 'tahsil_edildi', type: 'tedarikci',bank: 'İş Bankası' },
    { id: 'CEK-003', customer: 'Metro Elektronik',      amount: 22000, dueDate: '01.07.2026', status: 'beklemede',     type: 'musteri',  bank: 'Garanti BBVA' },
    { id: 'CEK-004', customer: 'Akın Bilişim Ltd.',     amount: 5500,  dueDate: '10.06.2026', status: 'ciroda',        type: 'musteri',  bank: 'Yapı Kredi' },
  ],

  suppliers: [
    { id: 'TED-001', name: 'Global Parça Ltd.',   phone: '0212 *** 44 55', category: 'Parça',    balance: -2400, lastOrder: '20.05.2026' },
    { id: 'TED-002', name: 'Apple TR Yetkili',    phone: '0216 *** 77 88', category: 'Cihaz',    balance: 0,     lastOrder: '15.05.2026' },
    { id: 'TED-003', name: 'Şen Elektronik',      phone: '0322 *** 55 66', category: 'Aksesuvar',balance: -800,  lastOrder: '22.05.2026' },
  ],

  orders: [
    { id: 'SIP-001', supplier: 'Global Parça Ltd.',   items: 'iPhone 14 Pro Ekran x3', total: 2400,  status: 'yolda',          date: '25.05.2026' },
    { id: 'SIP-002', supplier: 'Şen Elektronik',      items: 'Batarya x10',            total: 2500,  status: 'teslim_alindi',  date: '22.05.2026' },
    { id: 'SIP-003', supplier: 'Apple TR Yetkili',    items: 'iPhone 15 x2',           total: 76000, status: 'hazirlaniyor',   date: '28.05.2026' },
  ],

  dealers: [
    { id: 'BAY-001', name: 'Konya Teknik Servis',    owner: 'Ali Veli',  city: 'Konya',   plan: 'Pro',        status: 'aktif',  users: 3, expiry: '31.12.2026', monthly: 890  },
    { id: 'BAY-002', name: 'Antalya Cep Dünyası',    owner: 'Veli Can',  city: 'Antalya', plan: 'Starter',    status: 'aktif',  users: 1, expiry: '30.09.2026', monthly: 390  },
    { id: 'BAY-003', name: 'İzmir Telefon Merkezi',  owner: 'Can Er',    city: 'İzmir',   plan: 'Enterprise', status: 'deneme', users: 5, expiry: '15.06.2026', monthly: 1890 },
  ],

  notifications: [
    { id: 1, type: 'warning', title: 'SMS Onay Bekleniyor', message: 'SRV-003 için müşteri onayı bekliyor',       time: '10 dk',  read: false },
    { id: 2, type: 'success', title: 'Sipariş Teslim Alındı', message: 'SIP-002 siparişi depoya girdi',          time: '1 sa',   read: false },
    { id: 3, type: 'danger',  title: 'Kritik Stok',          message: 'iPhone 15 Şarj Portu kritik (1 adet)',    time: '2 sa',   read: true  },
    { id: 4, type: 'info',    title: 'Çek Vadesi Yaklaşıyor','message': 'CEK-001 için 15 gün kaldı (₺15.000)',  time: '3 sa',   read: true  },
  ],

  // Mock aylık ciro (₺)
  monthlyRevenue: [42000, 55000, 38000, 67000, 51000, 72000, 48000, 63000, 58000, 74000, 66000, 89000],
  monthLabels: ['Haz','Tem','Ağu','Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May'],
};

/* ================================================================
   2. DOM YARDIMCI FONKSİYONLARI (XSS-Güvenli)
   ================================================================ */

/** Yeni element oluştur */
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

/** Element'e textContent ata */
function txt(element, text) {
  element.textContent = text;
  return element;
}

/** Child ekle */
function ap(parent, ...children) {
  children.flat(Infinity).forEach(c => {
    if (c instanceof Node) parent.appendChild(c);
    else if (c !== null && c !== undefined && c !== false) {
      parent.appendChild(document.createTextNode(String(c)));
    }
  });
  return parent;
}

/** Attribute set */
function attr(element, obj) {
  Object.entries(obj).forEach(([k, v]) => element.setAttribute(k, v));
  return element;
}

/** SVG oluştur (DOMParser ile - güvenli) */
function svgEl(paths, w = 24, h = 24) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // paths: array of {tag, attrs}
  paths.forEach(({ tag: t, attrs: a }) => {
    const node = document.createElementNS(ns, t);
    Object.entries(a).forEach(([k, v]) => node.setAttribute(k, v));
    svg.appendChild(node);
  });
  return svg;
}

/** Para formatla */
const FMT_PARA = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
function para(val) { return FMT_PARA.format(val); }

/* ================================================================
   3. TOAST SİSTEMİ
   ================================================================ */
function toast(type, title, message, durationMs = 4000) {
  const container = document.getElementById('toast-container');
  const t = el('div', `toast ${type}`);

  // Icon
  const icons = {
    success: [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }],
    error:   [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } }, { tag: 'line', attrs: { x1: '15', y1: '9', x2: '9', y2: '15' } }, { tag: 'line', attrs: { x1: '9', y1: '9', x2: '15', y2: '15' } }],
    warning: [{ tag: 'path', attrs: { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' } }, { tag: 'line', attrs: { x1: '12', y1: '9', x2: '12', y2: '13' } }, { tag: 'line', attrs: { x1: '12', y1: '17', x2: '12.01', y2: '17' } }],
    info:    [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } }, { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '12' } }, { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12.01', y2: '16' } }],
  };

  const icon = svgEl(icons[type] || icons.info);
  icon.className = 'toast-icon';

  const content = el('div', 'toast-content');
  ap(content, ap(el('div', 'toast-title'), title), ap(el('div', 'toast-message'), message));

  const closeBtn = el('button', 'toast-close');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => removeToast(t));

  ap(t, icon, content, closeBtn);
  container.appendChild(t);

  setTimeout(() => removeToast(t), durationMs);
}

function removeToast(t) {
  if (!t.parentNode) return;
  t.classList.add('removing');
  setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 300);
}

/* ================================================================
   4. MODAL SİSTEMİ
   ================================================================ */
const Modal = {
  overlay: null,
  container: null,
  titleEl: null,
  bodyEl: null,
  footerEl: null,

  init() {
    this.overlay   = document.getElementById('modal-overlay');
    this.container = document.getElementById('modal-container');
    this.titleEl   = document.getElementById('modal-title-text');
    this.bodyEl    = document.getElementById('modal-body');
    this.footerEl  = document.getElementById('modal-footer');

    document.getElementById('modal-close-btn').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  },

  open(title, buildBody, { size = '', footer = null } = {}) {
    this.titleEl.textContent = title;
    this.bodyEl.replaceChildren();
    this.footerEl.replaceChildren();

    this.container.className = 'modal-container' + (size ? ' ' + size : '');

    buildBody(this.bodyEl);

    if (footer) {
      this.footerEl.style.display = '';
      footer(this.footerEl);
    } else {
      this.footerEl.style.display = 'none';
    }

    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
};

/* ================================================================
   5. ROUTER
   ================================================================ */
const ROUTES = {
  'dashboard':      { label: 'Dashboard',      fn: renderDashboard },
  'teknik-servis':  { label: 'Teknik Servis',  fn: renderTeknikServis },
  'alis-satis':     { label: 'Alış-Satış',     fn: renderAlisSatis },
  'stok':           { label: 'Stok & Tedarik', fn: renderStok },
  'finans':         { label: 'Kasa & Finans',  fn: renderFinans },
  'cek-yonetimi':   { label: 'Çek Yönetimi',   fn: renderCekYonetimi },
  'musteriler':     { label: 'Müşteriler',      fn: renderMusteriler },
  'musteri-portali':{ label: 'Müşteri Portali', fn: renderMusteriPortali },
  'raporlar':       { label: 'Raporlar',        fn: renderRaporlar },
  'admin':          { label: 'Admin Panel',     fn: renderAdmin },
  'ayarlar':        { label: 'Ayarlar',         fn: renderAyarlar },
};

let currentRoute = '';

function navigate(route) {
  if (route === currentRoute) return;
  currentRoute = route;

  const main = document.getElementById('main-content');
  main.replaceChildren();

  const def = ROUTES[route] || ROUTES['dashboard'];
  document.getElementById('topbar-title').textContent = def.label;

  // Nav item'larını güncelle
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });

  // Sayfayı render et
  def.fn(main);

  // Scroll to top
  main.scrollTop = 0;
}

/* ================================================================
   6. KULLANICI BİLGİSİ & SIDEBAR
   ================================================================ */
function initUserUI() {
  const user = DB.currentUser;
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials;
  document.getElementById('user-display-name').textContent   = user.name;
  const roleLabel = document.getElementById('user-role-label');
  if (roleLabel) roleLabel.textContent = (user.role === 'admin' ? 'Admin' : 'Teknisyen') + ' · ' + user.branch;
}

function initSidebar() {
  // Collapse toggle
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('collapse-btn');
  if (btn && sidebar) {
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const span = btn.querySelector('span');
      if (span) span.textContent = sidebar.classList.contains('collapsed') ? 'Genişlet' : 'Daralt';
    });
  }

  // Nav links
  document.querySelectorAll('.nav-item[data-route]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.route);
    });
  });
}

/* ================================================================
   7. DASHBOARD
   ================================================================ */
function renderDashboard(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  // Sayfa başlık
  const ph = ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Dashboard'),
      ap(el('p', 'page-subtitle'), '29 Mayıs 2026, Perşembe — Hoş geldiniz, ' + DB.currentUser.name)
    )
  );
  wrap.appendChild(ph);

  // KPI Grid
  const kpiGrid = el('div', 'kpi-grid');
  const kpis = [
    { label: 'Açık Servisler', value: '5', icon: 'wrench', color: 'accent', change: '+2', up: true },
    { label: 'Bugün Teslim', value: '1', icon: 'check', color: 'success', change: '0', up: null },
    { label: 'Kasa Bakiyesi', value: '₺46.300', icon: 'wallet', color: 'warning', change: '+₺1.800', up: true },
    { label: 'Aylık Ciro', value: '₺89.000', icon: 'chart', color: 'violet', change: '+%12', up: true },
    { label: 'Onay Bekleyen', value: '1', icon: 'bell', color: 'orange', change: 'SMS bekleniyor', up: null },
    { label: 'Kritik Stok', value: '2', icon: 'alert', color: 'danger', change: 'Düşük seviye', up: null },
  ];

  kpis.forEach(kpi => {
    const card = el('div', `kpi-card ${kpi.color}`);
    const header = el('div', 'kpi-header');

    const iconBox = el('div', `kpi-icon ${kpi.color}`);
    iconBox.appendChild(buildKpiIcon(kpi.icon));

    const changeEl = el('span', 'kpi-change ' + (kpi.up === true ? 'up' : kpi.up === false ? 'down' : ''));
    changeEl.textContent = kpi.change;

    ap(header, iconBox, changeEl);
    ap(card, header,
      ap(el('div', 'kpi-value'), kpi.value),
      ap(el('div', 'kpi-label'), kpi.label)
    );
    kpiGrid.appendChild(card);
  });

  wrap.appendChild(kpiGrid);

  // Ana içerik: 2 kolon
  const cols = el('div', 'grid-2 gap-16');
  wrap.appendChild(cols);

  // Sol: Son servisler
  const srvCard = el('div', 'card');
  const srvHeader = el('div', 'card-header');
  ap(srvHeader, ap(el('div', 'card-title'), '🔧 Son Servisler'));

  const btnAllSrv = el('button', 'btn btn-ghost btn-sm');
  btnAllSrv.textContent = 'Tümünü Gör →';
  btnAllSrv.addEventListener('click', () => navigate('teknik-servis'));
  srvHeader.appendChild(btnAllSrv);

  srvCard.appendChild(srvHeader);

  const srvBody = el('div');
  DB.services.slice(0, 5).forEach(srv => {
    const item = el('div', 'list-item');
    item.style.cursor = 'pointer';

    const iconBox = el('div', 'list-icon');
    iconBox.style.background = statusColor(srv.status) + '20';
    iconBox.style.color = statusColor(srv.status);
    iconBox.appendChild(svgEl([{ tag: 'path', attrs: { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' } }]));

    const content = el('div', 'list-content');
    ap(content,
      ap(el('div', 'list-title'), srv.custName + ' — ' + srv.device),
      ap(el('div', 'list-sub'), srv.fault)
    );

    const badge = el('span', 'badge badge-' + srv.status);
    badge.textContent = srv.statusLabel;

    ap(item, iconBox, content, badge);
    item.addEventListener('click', () => {
      navigate('teknik-servis');
      setTimeout(() => openServiceDetail(srv), 100);
    });
    srvBody.appendChild(item);
  });
  srvCard.appendChild(srvBody);
  cols.appendChild(srvCard);

  // Sağ: Ciro grafiği + bildirimler
  const rightCol = el('div', 'flex flex-col gap-16');
  cols.appendChild(rightCol);

  // Ciro grafiği (mini)
  const chartCard = el('div', 'card');
  ap(el('div', 'card-header'), ap(el('div', 'card-title'), '📈 Aylık Ciro (₺)')).then ? null : chartCard.appendChild(ap(el('div', 'card-header'), ap(el('div', 'card-title'), '📈 Aylık Ciro (₺)')));

  const chartCard2 = buildCard('📈 Aylık Ciro (₺)', (body) => {
    const canvas = el('canvas');
    attr(canvas, { width: '400', height: '140', id: 'dash-revenue-chart' });
    body.appendChild(canvas);
    body.style.padding = '16px';
    setTimeout(() => drawLineChart('dash-revenue-chart', DB.monthLabels, DB.monthlyRevenue, '#06b6d4'), 50);
  });
  rightCol.appendChild(chartCard2);

  // Bildirimler
  const notifCard = buildCard('🔔 Bildirimler', (body) => {
    DB.notifications.forEach(n => {
      const item = el('div', 'list-item');

      const dot = el('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:' + notifColor(n.type);

      const content = el('div', 'list-content');
      ap(content,
        ap(el('div', 'list-title'), n.title),
        ap(el('div', 'list-sub'), n.message)
      );

      const time = ap(el('div', 'list-meta'), n.time + ' önce');

      ap(item, dot, content, time);
      body.appendChild(item);
    });
  });
  rightCol.appendChild(notifCard);

  // Hızlı eylemler
  const qCard = buildCard('⚡ Hızlı İşlemler', (body) => {
    body.style.padding = '16px';
    const grid = el('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';

    const actions = [
      { label: 'Yeni Servis', route: 'teknik-servis', color: 'btn-primary' },
      { label: 'Stok Kontrol', route: 'stok', color: 'btn-secondary' },
      { label: 'Kasa Aç', route: 'finans', color: 'btn-secondary' },
      { label: 'Raporlar', route: 'raporlar', color: 'btn-secondary' },
    ];

    actions.forEach(a => {
      const btn = el('button', `btn ${a.color}`);
      btn.textContent = a.label;
      btn.style.justifyContent = 'center';
      btn.addEventListener('click', () => {
        navigate(a.route);
        if (a.route === 'teknik-servis') setTimeout(() => openNewServiceModal(), 100);
      });
      grid.appendChild(btn);
    });

    body.appendChild(grid);
  });
  wrap.appendChild(qCard);
}

/* ================================================================
   8. TEKNİK SERVİS
   ================================================================ */
const STATUS_FLOW = ['alindi', 'teshis', 'onay', 'tamir', 'kalite', 'teslim'];
const STATUS_INFO = {
  alindi:  { label: 'Alındı',            cls: 'badge-alindi' },
  teshis:  { label: 'Teşhis',            cls: 'badge-teshis' },
  onay:    { label: 'Onay Bekleniyor',   cls: 'badge-onay' },
  tamir:   { label: 'Tamir',             cls: 'badge-tamir' },
  kalite:  { label: 'Kalite Kontrol',    cls: 'badge-kalite' },
  teslim:  { label: 'Teslim Edildi',     cls: 'badge-teslim' },
  iptal:   { label: 'İptal',             cls: 'badge-iptal' },
};

function statusColor(status) {
  const map = { alindi:'#6366f1', teshis:'#f59e0b', onay:'#f97316', tamir:'#8b5cf6', kalite:'#06b6d4', teslim:'#10b981', iptal:'#ef4444' };
  return map[status] || '#94a3b8';
}

function notifColor(type) {
  return { success: '#10b981', error: '#ef4444', danger: '#ef4444', warning: '#f59e0b', info: '#06b6d4' }[type] || '#94a3b8';
}

let srvFilter = 'all';

function renderTeknikServis(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  // Header
  const ph = ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Teknik Servis'),
      ap(el('p', 'page-subtitle'), DB.services.length + ' aktif kayıt')
    )
  );
  const actions = el('div', 'page-actions');
  const newBtn = el('button', 'btn btn-primary');
  ap(newBtn, '+ Yeni Servis');
  newBtn.addEventListener('click', openNewServiceModal);
  actions.appendChild(newBtn);
  ph.appendChild(actions);
  wrap.appendChild(ph);

  // Filter bar
  const filterWrap = el('div');
  filterWrap.style.marginBottom = '16px';
  const filters = [
    { key: 'all', label: 'Tümü (' + DB.services.length + ')' },
    { key: 'alindi', label: 'Alındı' },
    { key: 'teshis', label: 'Teşhis' },
    { key: 'onay', label: 'Onay Bekleniyor' },
    { key: 'tamir', label: 'Tamir' },
    { key: 'kalite', label: 'Kalite Kontrol' },
    { key: 'teslim', label: 'Teslim' },
  ];
  const bar = el('div', 'filter-bar');
  filters.forEach(f => {
    const btn = el('button', 'filter-btn' + (srvFilter === f.key ? ' active' : ''));
    btn.textContent = f.label;
    btn.dataset.filter = f.key;
    btn.addEventListener('click', () => {
      srvFilter = f.key;
      renderTeknikServis(main); // yeniden render
    });
    bar.appendChild(btn);
  });
  filterWrap.appendChild(bar);
  wrap.appendChild(filterWrap);

  // Tablo
  const card = el('div', 'card');
  const tblWrap = el('div', 'table-wrapper');
  const tbl = el('table');

  const thead = el('thead');
  const headerRow = el('tr');
  ['Servis No', 'Müşteri', 'Cihaz', 'Arıza', 'Teknisyen', 'Durum', 'Tarih', 'Ücret', 'İşlem'].forEach(h => {
    ap(headerRow, ap(el('th'), h));
  });
  thead.appendChild(headerRow);
  tbl.appendChild(thead);

  const tbody = el('tbody');
  const filtered = srvFilter === 'all' ? DB.services : DB.services.filter(s => s.status === srvFilter);

  filtered.forEach(srv => {
    const row = el('tr');

    const idCell = el('td');
    const idLink = ap(el('a', 'td-link'), srv.id);
    idLink.href = '#';
    idLink.addEventListener('click', (e) => { e.preventDefault(); openServiceDetail(srv); });
    idCell.appendChild(idLink);

    const badge = el('span', 'badge ' + (STATUS_INFO[srv.status]?.cls || 'badge-neutral'));
    badge.textContent = STATUS_INFO[srv.status]?.label || srv.status;

    const advBtn = el('button', 'btn btn-sm btn-secondary');
    advBtn.textContent = 'İlerlet';
    advBtn.addEventListener('click', () => advanceService(srv));

    ap(row,
      idCell,
      ap(el('td'), srv.custName),
      ap(el('td'), srv.device),
      ap(el('td'), srv.fault),
      ap(el('td'), srv.tech),
      ap(el('td'), badge),
      ap(el('td'), srv.date),
      ap(el('td'), para(srv.cost)),
      ap(el('td'), advBtn)
    );
    tbody.appendChild(row);
  });

  if (filtered.length === 0) {
    const row = el('tr');
    const cell = el('td');
    cell.setAttribute('colspan', '9');
    cell.style.textAlign = 'center';
    cell.style.padding = '40px';
    cell.style.color = 'var(--text-muted)';
    cell.textContent = 'Bu filtrede kayıt bulunamadı.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  tbl.appendChild(tbody);
  tblWrap.appendChild(tbl);
  card.appendChild(tblWrap);
  wrap.appendChild(card);
}

function openNewServiceModal() {
  Modal.open('Yeni Servis Kaydı', (body) => {
    const form = el('form', 'form-grid');
    form.id = 'new-srv-form';

    const fields = [
      { label: 'Müşteri Adı Soyadı', id: 'srv-cust-name', type: 'text', placeholder: 'Ad Soyad', required: true },
      { label: 'Telefon', id: 'srv-cust-phone', type: 'tel', placeholder: '05XX XXX XX XX', required: true },
      { label: 'TC Kimlik No', id: 'srv-tc', type: 'text', placeholder: '***********', maxlength: '11' },
      { label: 'Cihaz Markası', id: 'srv-brand', type: 'text', placeholder: 'Apple, Samsung...', required: true },
      { label: 'Model', id: 'srv-model', type: 'text', placeholder: 'iPhone 14 Pro', required: true },
      { label: 'IMEI', id: 'srv-imei', type: 'text', placeholder: '15 haneli IMEI', maxlength: '15' },
      { label: 'Renk', id: 'srv-color', type: 'text', placeholder: 'Siyah' },
      { label: 'Tahmini Ücret (₺)', id: 'srv-cost', type: 'number', placeholder: '0' },
      { label: 'Kapora (₺)', id: 'srv-deposit', type: 'number', placeholder: '0' },
    ];

    fields.forEach(f => {
      const group = el('div', 'form-group');
      const lbl = el('label'); attr(lbl, { for: f.id }); lbl.textContent = f.label;
      const input = el('input');
      attr(input, { type: f.type, id: f.id, name: f.id, placeholder: f.placeholder });
      if (f.required) input.required = true;
      if (f.maxlength) attr(input, { maxlength: f.maxlength });
      ap(group, lbl, input);
      form.appendChild(group);
    });

    // Arıza tanımı (full width)
    const faultGroup = el('div', 'form-group full');
    const faultLbl = el('label'); attr(faultLbl, { for: 'srv-fault' }); faultLbl.textContent = 'Arıza Tanımı';
    const faultTxt = el('textarea');
    attr(faultTxt, { id: 'srv-fault', name: 'srv-fault', placeholder: 'Müşterinin belirttiği arıza detayını yazın...', rows: '3' });
    ap(faultGroup, faultLbl, faultTxt);
    form.appendChild(faultGroup);

    // Notlar
    const noteGroup = el('div', 'form-group full');
    const noteLbl = el('label'); attr(noteLbl, { for: 'srv-notes' }); noteLbl.textContent = 'İç Notlar (Müşteriye gösterilmez)';
    const noteTxt = el('textarea');
    attr(noteTxt, { id: 'srv-notes', name: 'srv-notes', placeholder: 'Teknisyen notları...', rows: '2' });
    ap(noteGroup, noteLbl, noteTxt);
    form.appendChild(noteGroup);

    body.appendChild(form);

    // Durum zaman çizelgesi (önizleme)
    const sep = el('hr', 'divider');
    body.appendChild(sep);

    const tlTitle = ap(el('div', 'text-sm text-muted'), 'Servis akış durumu:');
    body.appendChild(tlTitle);

    const timeline = buildStatusTimeline('alindi');
    body.appendChild(timeline);

  }, {
    footer: (footer) => {
      const cancelBtn = el('button', 'btn btn-secondary');
      cancelBtn.textContent = 'İptal';
      cancelBtn.addEventListener('click', () => Modal.close());

      const saveBtn = el('button', 'btn btn-primary');
      saveBtn.textContent = '✓ Servisi Kaydet';
      saveBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('srv-cust-name');
        if (!nameInput || !nameInput.value.trim()) {
          toast('error', 'Hata', 'Müşteri adı zorunludur.');
          return;
        }
        // Demo: mock kayıt
        const newId = 'SRV-00' + (DB.services.length + 1);
        DB.services.unshift({
          id: newId,
          custName: document.getElementById('srv-cust-name').value.trim().slice(0, 60),
          custPhone: document.getElementById('srv-cust-phone').value.trim().slice(0, 20),
          device: (document.getElementById('srv-brand').value.trim() + ' ' + document.getElementById('srv-model').value.trim()).slice(0, 60),
          imei: document.getElementById('srv-imei').value.trim().slice(0, 20),
          fault: document.getElementById('srv-fault').value.trim().slice(0, 200),
          tech: DB.currentUser.name,
          status: 'alindi',
          statusLabel: 'Alındı',
          date: new Date().toLocaleDateString('tr-TR'),
          cost: parseInt(document.getElementById('srv-cost').value) || 0,
          deposit: parseInt(document.getElementById('srv-deposit').value) || 0,
          notes: document.getElementById('srv-notes').value.trim().slice(0, 200),
        });
        Modal.close();
        toast('success', 'Servis Oluşturuldu', newId + ' numaralı servis kaydedildi.');
        navigate('teknik-servis');
      });

      ap(footer, cancelBtn, saveBtn);
    }
  });
}

function openServiceDetail(srv) {
  Modal.open('Servis Detayı — ' + srv.id, (body) => {
    // Status timeline
    const tl = buildStatusTimeline(srv.status);
    body.appendChild(tl);

    const sep = el('hr', 'divider');
    body.appendChild(sep);

    // Info
    const infoGrid = el('div', 'grid-2 gap-16');
    body.appendChild(infoGrid);

    const leftCol = el('div');
    const infoRows = [
      ['Servis No', srv.id],
      ['Müşteri', srv.custName],
      ['Telefon', srv.custPhone],
      ['Cihaz', srv.device],
      ['IMEI', srv.imei],
      ['Arıza', srv.fault],
    ];
    infoRows.forEach(([lbl, val]) => {
      const row = el('div', 'info-row');
      ap(row, ap(el('span', 'info-label'), lbl), ap(el('span', 'info-value'), val));
      leftCol.appendChild(row);
    });
    infoGrid.appendChild(leftCol);

    const rightCol = el('div');
    const infoRows2 = [
      ['Teknisyen', srv.tech],
      ['Durum', srv.statusLabel],
      ['Tarih', srv.date],
      ['Tahmini Ücret', para(srv.cost)],
      ['Kapora', para(srv.deposit)],
      ['Kalan', para(srv.cost - srv.deposit)],
    ];
    infoRows2.forEach(([lbl, val]) => {
      const row = el('div', 'info-row');
      ap(row, ap(el('span', 'info-label'), lbl), ap(el('span', 'info-value'), val));
      rightCol.appendChild(row);
    });
    infoGrid.appendChild(rightCol);

    if (srv.notes) {
      const notesTitle = ap(el('div', 'text-sm text-muted'), 'Notlar:');
      const notesVal   = ap(el('div', 'text-sm'), srv.notes);
      notesVal.style.cssText = 'padding:8px 12px;background:var(--bg-input);border-radius:8px;margin-top:4px;color:var(--text-secondary)';
      body.appendChild(ap(el('div'), notesTitle, notesVal));
    }

    // SMS onay kutusu
    if (srv.status === 'onay') {
      const alert = buildAlert('warning', 'Müşteri SMS Onayı Bekleniyor', 'Tahmini ücret müşteriye SMS ile gönderildi. Onay kodu: TOKEN-' + srv.id);
      body.appendChild(alert);
    }
  }, {
    size: 'modal-lg',
    footer: (footer) => {
      const closeBtn = el('button', 'btn btn-secondary');
      closeBtn.textContent = 'Kapat';
      closeBtn.addEventListener('click', () => Modal.close());

      const advBtn = el('button', 'btn btn-primary');
      advBtn.textContent = '▶ Durumu İlerlet';
      advBtn.addEventListener('click', () => { advanceService(srv); Modal.close(); });

      if (srv.status === 'teslim' || srv.status === 'iptal') {
        ap(footer, closeBtn);
      } else {
        ap(footer, closeBtn, advBtn);
      }
    }
  });
}

function advanceService(srv) {
  const idx = STATUS_FLOW.indexOf(srv.status);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) {
    toast('info', 'Bilgi', 'Bu servis zaten teslim edilmiş.');
    return;
  }
  const next = STATUS_FLOW[idx + 1];
  srv.status      = next;
  srv.statusLabel = STATUS_INFO[next].label;
  toast('success', 'Durum Güncellendi', srv.id + ' → ' + STATUS_INFO[next].label);
  navigate('teknik-servis');
}

function buildStatusTimeline(currentStatus) {
  const steps = [
    { key: 'alindi', label: 'Alındı' },
    { key: 'teshis', label: 'Teşhis' },
    { key: 'onay',   label: 'Onay' },
    { key: 'tamir',  label: 'Tamir' },
    { key: 'kalite', label: 'KK' },
    { key: 'teslim', label: 'Teslim' },
  ];

  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const wrap = el('div', 'status-timeline');

  steps.forEach((step, i) => {
    const stepEl = el('div', 'timeline-step' + (i < currentIdx ? ' done' : i === currentIdx ? ' active' : ''));
    const dot = el('div', 'timeline-dot');
    dot.appendChild(svgEl(i < currentIdx
      ? [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }]
      : [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '4' } }]
    ));
    ap(stepEl, dot, ap(el('div', 'timeline-label'), step.label));
    wrap.appendChild(stepEl);
  });

  return wrap;
}

/* ================================================================
   9. ALIŞ-SATIŞ
   ================================================================ */
let asSalesTab = 'satis';

function renderAlisSatis(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  ap(el('div', 'page-header')).then ? null : wrap.appendChild(
    ap(el('div', 'page-header'),
      ap(el('div', 'page-header-left'),
        ap(el('h1', 'page-title'), 'Alış-Satış'),
        ap(el('p', 'page-subtitle'), 'Cihaz satışı, 2.el alım ve işlem geçmişi')
      )
    )
  );

  // Tabs
  const tabBar = el('div', 'tab-bar');
  [
    { key: 'satis', label: '🛒 Satış' },
    { key: 'alim',  label: '📥 2.El Alım' },
    { key: 'gecmis', label: '📋 İşlem Geçmişi' },
  ].forEach(tab => {
    const btn = el('button', 'tab-btn' + (asSalesTab === tab.key ? ' active' : ''));
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      asSalesTab = tab.key;
      renderAlisSatis(main);
    });
    tabBar.appendChild(btn);
  });
  wrap.appendChild(tabBar);

  if (asSalesTab === 'satis') renderSatisTab(wrap);
  else if (asSalesTab === 'alim') renderAlimTab(wrap);
  else renderGecmisTab(wrap);
}

function renderSatisTab(wrap) {
  // Ürün grid
  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px';

  DB.products.forEach(p => {
    const card = el('div', 'card');
    card.style.overflow = 'hidden';

    // Üst renkli bant
    const banner = el('div');
    banner.style.cssText = 'height:6px;background:linear-gradient(90deg,var(--accent),var(--violet))';
    card.appendChild(banner);

    const body = el('div', 'card-body');

    const type = el('span', 'badge ' + (p.type === 'sifir' ? 'badge-success' : 'badge-warning'));
    type.textContent = p.typeLabel;
    body.appendChild(type);
    body.appendChild(el('br'));

    const title = ap(el('div'), p.brand + ' ' + p.model);
    title.style.cssText = 'font-size:16px;font-weight:700;color:var(--text-primary);margin:8px 0 4px';
    body.appendChild(title);

    ap(body,
      ap(ap(el('div', 'text-sm text-secondary'), p.storage + ' · ' + p.color)),
      el('br')
    );

    const imeiRow = el('div', 'info-row');
    ap(imeiRow, ap(el('span', 'info-label'), 'IMEI'), ap(el('span', 'info-value'), p.imei));
    body.appendChild(imeiRow);

    const stockRow = el('div', 'info-row');
    ap(stockRow, ap(el('span', 'info-label'), 'Stok'), ap(el('span', 'info-value'), p.stock + ' adet'));
    body.appendChild(stockRow);

    const priceRow = el('div');
    priceRow.style.cssText = 'margin-top:12px;display:flex;align-items:center;justify-content:space-between';

    const priceEl = ap(el('div'), para(p.price));
    priceEl.style.cssText = 'font-size:20px;font-weight:800;color:var(--accent)';

    const sataBtn = el('button', 'btn btn-primary btn-sm');
    sataBtn.textContent = 'Sat';
    sataBtn.addEventListener('click', () => openSaleModal(p));

    ap(priceRow, priceEl, sataBtn);
    body.appendChild(priceRow);

    card.appendChild(body);
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
}

function openSaleModal(product) {
  Modal.open('Satış — ' + product.brand + ' ' + product.model, (body) => {
    // Ürün özeti
    const sumCard = el('div');
    sumCard.style.cssText = 'padding:14px;background:var(--bg-input);border-radius:8px;margin-bottom:20px';
    ap(sumCard,
      ap(ap(el('div'), product.brand + ' ' + product.model + ' ' + product.storage + ' ' + product.color), ''),
      ap(el('div', 'text-sm text-muted'), 'IMEI: ' + product.imei)
    );
    body.appendChild(sumCard);

    const form = el('div', 'form-grid');

    const custFields = [
      { label: 'Müşteri Adı', id: 'sale-cust', type: 'text', placeholder: 'Ad Soyad' },
      { label: 'Telefon', id: 'sale-phone', type: 'tel', placeholder: '05XX XXX XX XX' },
      { label: 'Satış Fiyatı (₺)', id: 'sale-price', type: 'number', placeholder: String(product.price) },
      { label: 'Ödeme Yöntemi', id: 'sale-method', type: 'select', options: ['Nakit', 'POS (Kredi Kartı)', 'Havale/EFT', 'Çek'] },
    ];

    custFields.forEach(f => {
      const group = el('div', 'form-group');
      const lbl = el('label'); attr(lbl, { for: f.id }); lbl.textContent = f.label;
      let input;
      if (f.type === 'select') {
        input = el('select'); attr(input, { id: f.id, name: f.id });
        f.options.forEach(o => { const opt = el('option'); opt.textContent = o; opt.value = o; input.appendChild(opt); });
      } else {
        input = el('input'); attr(input, { type: f.type, id: f.id, name: f.id, placeholder: f.placeholder });
        if (f.id === 'sale-price') input.value = String(product.price);
      }
      ap(group, lbl, input);
      form.appendChild(group);
    });

    body.appendChild(form);

    const kvkkCheck = el('div');
    kvkkCheck.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:12px 0;font-size:13px;color:var(--text-secondary)';
    const chk = el('input'); attr(chk, { type: 'checkbox', id: 'kvkk-check' }); chk.style.marginTop = '2px';
    const kvkkLbl = el('label'); attr(kvkkLbl, { for: 'kvkk-check' }); kvkkLbl.textContent = 'KVKK aydınlatma metnini okudum, kişisel verilerimin işlenmesine onay veriyorum.';
    ap(kvkkCheck, chk, kvkkLbl);
    body.appendChild(kvkkCheck);

    // Özet
    const sumArea = el('div', 'card');
    const sumBody = el('div', 'card-body');
    const summaryRows = [
      ['Cihaz', product.brand + ' ' + product.model],
      ['Depo Fiyatı', para(product.price)],
      ['KDV (%20)', para(Math.round(product.price * 0.2))],
      ['TOPLAM', para(product.price)],
    ];
    summaryRows.forEach(([lbl, val]) => {
      const row = el('div', 'summary-row');
      ap(row, ap(el('span', 'summary-label'), lbl), ap(el('span', 'summary-value'), val));
      sumBody.appendChild(row);
    });
    sumArea.appendChild(sumBody);
    body.appendChild(sumArea);

    // Garanti notu
    const note = buildAlert('info', 'Garanti', '2 yıl üretici garantisi. Satış tamamlandığında garanti belgesi otomatik oluşturulacak.');
    body.appendChild(note);

  }, {
    footer: (footer) => {
      const cancelBtn = el('button', 'btn btn-secondary');
      cancelBtn.textContent = 'İptal';
      cancelBtn.addEventListener('click', () => Modal.close());

      const completeBtn = el('button', 'btn btn-success');
      completeBtn.textContent = '✓ Satışı Tamamla';
      completeBtn.addEventListener('click', () => {
        Modal.close();
        toast('success', 'Satış Tamamlandı', product.brand + ' ' + product.model + ' satışı gerçekleşti. Garanti belgesi oluşturuldu.');
      });

      ap(footer, cancelBtn, completeBtn);
    }
  });
}

function renderAlimTab(wrap) {
  // 4 adımlı wizard
  const wizardCard = el('div', 'card');
  const wizHeader = el('div', 'wizard-header');
  const steps = ['Müşteri Bilgileri', 'Cihaz & IMEI', 'Hasar Tespiti', 'Fiyat & Sözleşme'];
  steps.forEach((s, i) => {
    const stepEl = el('div', 'wizard-step' + (i === 0 ? ' active' : ''));
    const num = ap(el('div', 'wizard-step-num'), String(i + 1));
    ap(stepEl, num, s);
    wizHeader.appendChild(stepEl);
  });
  wizardCard.appendChild(wizHeader);

  const body = el('div', 'card-body');

  // Adım 1 içeriği (demo)
  const info = buildAlert('info', '2.El Alım Sihirbazı', 'Müşteri bilgilerini girerek başlayın. IMEI teyidi e-Devlet üzerinden yapılacaktır.');
  body.appendChild(info);

  const form = el('div', 'form-grid');
  [
    { label: 'Müşteri Adı Soyadı', id: 'alim-name', type: 'text' },
    { label: 'TC Kimlik No', id: 'alim-tc', type: 'text', placeholder: '***********' },
    { label: 'Telefon', id: 'alim-phone', type: 'tel' },
    { label: 'IBAN (Ödeme için)', id: 'alim-iban', type: 'text', placeholder: 'TR...' },
  ].forEach(f => {
    const group = el('div', 'form-group');
    const lbl = el('label'); attr(lbl, { for: f.id }); lbl.textContent = f.label;
    const input = el('input'); attr(input, { type: f.type, id: f.id, placeholder: f.placeholder || '' });
    ap(group, lbl, input);
    form.appendChild(group);
  });
  body.appendChild(form);

  const nextBtn = el('button', 'btn btn-primary');
  nextBtn.textContent = 'Devam: Cihaz & IMEI →';
  nextBtn.style.marginTop = '16px';
  nextBtn.addEventListener('click', () => toast('info', 'Demo', 'Wizard adım 2 — Gerçek uygulamada e-Devlet IMEI sorgusu yapılır.'));
  body.appendChild(nextBtn);

  wizardCard.appendChild(body);
  wrap.appendChild(wizardCard);
}

function renderGecmisTab(wrap) {
  const card = buildCard('İşlem Geçmişi', (body) => {
    body.style.padding = '0';
    DB.transactions.forEach(tx => {
      const item = el('div', 'list-item');
      const icon = el('div', 'list-icon');
      icon.style.background = (tx.type === 'gelir' ? 'var(--success-dim)' : 'var(--danger-dim)');
      icon.style.color      = (tx.type === 'gelir' ? 'var(--success)' : 'var(--danger)');
      icon.textContent = tx.type === 'gelir' ? '↑' : '↓';
      icon.style.fontSize = '18px';
      icon.style.fontWeight = '800';

      const content = el('div', 'list-content');
      ap(content,
        ap(el('div', 'list-title'), tx.category + ' — ' + tx.desc),
        ap(el('div', 'list-sub'), tx.method + ' · ' + tx.date)
      );

      const amtEl = el('div', 'list-meta');
      amtEl.textContent = (tx.type === 'gelir' ? '+' : '-') + para(tx.amount);
      amtEl.style.color = tx.type === 'gelir' ? 'var(--success)' : 'var(--danger)';
      amtEl.style.fontWeight = '700';

      ap(item, icon, content, amtEl);
      body.appendChild(item);
    });
  });
  wrap.appendChild(card);
}

/* ================================================================
   10. STOK & TEDARİK
   ================================================================ */
let stokTab = 'parcalar';

function renderStok(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Stok & Tedarik'),
      ap(el('p', 'page-subtitle'), 'Parça envanteri, tedarikçiler ve siparişler')
    ),
    ap(el('div', 'page-actions'),
      (() => { const b = el('button', 'btn btn-primary'); b.textContent = '+ Sipariş Oluştur'; b.addEventListener('click', () => toast('info', 'Demo', 'Gerçek uygulamada sipariş formu açılır.')); return b; })()
    )
  ));

  // Kritik stok uyarısı
  const lowStock = DB.parts.filter(p => p.stock <= p.minStock);
  if (lowStock.length > 0) {
    const alert = buildAlert('warning', 'Kritik Stok Uyarısı', lowStock.length + ' parça minimum stok seviyesinin altında: ' + lowStock.map(p => p.name).join(', '));
    wrap.appendChild(alert);
  }

  const tabBar = el('div', 'tab-bar');
  [
    { key: 'parcalar', label: '🔩 Parçalar' },
    { key: 'cihazlar', label: '📱 Cihazlar' },
    { key: 'siparisler', label: '📦 Siparişler' },
    { key: 'tedarikciler', label: '🏭 Tedarikçiler' },
  ].forEach(tab => {
    const btn = el('button', 'tab-btn' + (stokTab === tab.key ? ' active' : ''));
    btn.textContent = tab.label;
    btn.addEventListener('click', () => { stokTab = tab.key; renderStok(main); });
    tabBar.appendChild(btn);
  });
  wrap.appendChild(tabBar);

  if (stokTab === 'parcalar') {
    const card = el('div', 'card');
    const tblWrap = el('div', 'table-wrapper');
    const tbl = el('table');
    const thead = el('thead');
    const hRow = el('tr');
    ['Parça Kodu', 'Parça Adı', 'Marka', 'Kategori', 'Stok', 'Min. Stok', 'Birim Maliyet', 'Durum'].forEach(h => ap(hRow, ap(el('th'), h)));
    thead.appendChild(hRow);
    tbl.appendChild(thead);

    const tbody = el('tbody');
    DB.parts.forEach(p => {
      const row = el('tr');
      const isCritical = p.stock <= p.minStock;
      const statusBadge = el('span', 'badge ' + (isCritical ? 'badge-danger' : 'badge-success'));
      statusBadge.textContent = isCritical ? 'Kritik' : 'Normal';

      const stockEl = ap(el('td'), String(p.stock) + ' adet');
      if (isCritical) stockEl.style.color = 'var(--danger)';

      ap(row,
        ap(el('td'), p.id),
        ap(el('td'), p.name),
        ap(el('td'), p.brand),
        ap(el('td'), p.category),
        stockEl,
        ap(el('td'), p.minStock + ' adet'),
        ap(el('td'), para(p.cost)),
        ap(el('td'), statusBadge)
      );
      tbody.appendChild(row);
    });
    tbl.appendChild(tbody);
    tblWrap.appendChild(tbl);
    card.appendChild(tblWrap);
    wrap.appendChild(card);

  } else if (stokTab === 'cihazlar') {
    renderSatisTab(wrap);

  } else if (stokTab === 'siparisler') {
    const card = el('div', 'card');
    const tblWrap = el('div', 'table-wrapper');
    const tbl = el('table');
    const thead = el('thead');
    const hRow = el('tr');
    ['Sipariş No', 'Tedarikçi', 'Ürünler', 'Toplam', 'Durum', 'Tarih'].forEach(h => ap(hRow, ap(el('th'), h)));
    thead.appendChild(hRow); tbl.appendChild(thead);

    const tbody = el('tbody');
    DB.orders.forEach(o => {
      const row = el('tr');
      const statusMap = { yolda: 'badge-warning', teslim_alindi: 'badge-success', hazirlaniyor: 'badge-info' };
      const labelMap  = { yolda: 'Yolda', teslim_alindi: 'Teslim Alındı', hazirlaniyor: 'Hazırlanıyor' };
      const badge = el('span', 'badge ' + (statusMap[o.status] || 'badge-neutral'));
      badge.textContent = labelMap[o.status] || o.status;
      ap(row, ap(el('td'), o.id), ap(el('td'), o.supplier), ap(el('td'), o.items), ap(el('td'), para(o.total)), ap(el('td'), badge), ap(el('td'), o.date));
      tbody.appendChild(row);
    });
    tbl.appendChild(tbody); tblWrap.appendChild(tbl); card.appendChild(tblWrap); wrap.appendChild(card);

  } else if (stokTab === 'tedarikciler') {
    const card = el('div', 'card');
    const tblWrap = el('div', 'table-wrapper');
    const tbl = el('table');
    const thead = el('thead');
    const hRow = el('tr');
    ['Tedarikçi No', 'Ad', 'Telefon', 'Kategori', 'Bakiye', 'Son Sipariş'].forEach(h => ap(hRow, ap(el('th'), h)));
    thead.appendChild(hRow); tbl.appendChild(thead);

    const tbody = el('tbody');
    DB.suppliers.forEach(s => {
      const row = el('tr');
      const balEl = ap(el('td'), para(Math.abs(s.balance)));
      if (s.balance < 0) { balEl.style.color = 'var(--danger)'; balEl.firstChild && (balEl.textContent = '-' + para(Math.abs(s.balance))); }
      ap(row, ap(el('td'), s.id), ap(el('td'), s.name), ap(el('td'), s.phone), ap(el('td'), s.category), balEl, ap(el('td'), s.lastOrder));
      tbody.appendChild(row);
    });
    tbl.appendChild(tbody); tblWrap.appendChild(tbl); card.appendChild(tblWrap); wrap.appendChild(card);
  }
}

/* ================================================================
   11. FİNANS
   ================================================================ */
function renderFinans(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Kasa & Finans'),
      ap(el('p', 'page-subtitle'), 'Günlük kasa, faturalar ve KDV özeti')
    )
  ));

  // KPI
  const kpiGrid = el('div', 'kpi-grid');
  [
    { label: 'Kasa Bakiyesi', value: '₺46.300', color: 'success' },
    { label: 'Banka Bakiyesi', value: '₺128.500', color: 'accent' },
    { label: 'Toplam Alacak', value: '₺37.000', color: 'warning' },
    { label: 'Bu Ay KDV', value: '₺8.920', color: 'danger' },
  ].forEach(kpi => {
    const card = el('div', `kpi-card ${kpi.color}`);
    ap(card, ap(el('div', 'kpi-value'), kpi.value), ap(el('div', 'kpi-label'), kpi.label));
    kpiGrid.appendChild(card);
  });
  wrap.appendChild(kpiGrid);

  const cols = el('div', 'grid-2 gap-16');
  wrap.appendChild(cols);

  // İşlemler
  const txCard = buildCard('💳 İşlemler', (body) => {
    body.style.padding = '0';
    DB.transactions.forEach(tx => {
      const item = el('div', 'list-item');
      const icon = el('div', 'list-icon');
      icon.style.background = tx.type === 'gelir' ? 'var(--success-dim)' : 'var(--danger-dim)';
      icon.style.color      = tx.type === 'gelir' ? 'var(--success)' : 'var(--danger)';
      icon.style.fontSize   = '18px';
      icon.style.fontWeight = '800';
      icon.textContent      = tx.type === 'gelir' ? '↑' : '↓';

      const content = el('div', 'list-content');
      ap(content, ap(el('div', 'list-title'), tx.category), ap(el('div', 'list-sub'), tx.desc + ' · ' + tx.method));

      const amt = el('div', 'list-meta');
      amt.textContent = (tx.type === 'gelir' ? '+' : '-') + para(tx.amount);
      amt.style.color = tx.type === 'gelir' ? 'var(--success)' : 'var(--danger)';
      amt.style.fontWeight = '700';

      ap(item, icon, content, amt);
      body.appendChild(item);
    });
  });
  cols.appendChild(txCard);

  // KDV Özeti
  const kdvCard = buildCard('🧾 KDV Beyanı Özeti', (body) => {
    [
      ['Hesaplanan KDV (391)', '₺17.840'],
      ['İndirilecek KDV (191)', '₺8.920'],
      ['Ödenecek KDV', '₺8.920'],
      ['Beyan Dönemi', 'Mayıs 2026'],
      ['Son Tarih', '28 Haziran 2026'],
    ].forEach(([lbl, val]) => {
      const row = el('div', 'summary-row');
      ap(row, ap(el('span', 'summary-label'), lbl), ap(el('span', 'summary-value'), val));
      body.appendChild(row);
    });
    const btn = el('button', 'btn btn-secondary');
    btn.textContent = '📄 KDV Raporu İndir';
    btn.style.marginTop = '12px';
    btn.addEventListener('click', () => toast('info', 'Demo', 'Gerçek uygulamada KDV raporu PDF olarak indirilir.'));
    body.appendChild(btn);
  });
  cols.appendChild(kdvCard);

  // Yeni işlem butonu
  const newTxBtn = el('button', 'btn btn-primary');
  newTxBtn.textContent = '+ Nakit Giriş/Çıkış';
  newTxBtn.addEventListener('click', () => {
    Modal.open('Kasa İşlemi', (body) => {
      const form = el('div', 'form-grid');
      [
        { label: 'İşlem Türü', id: 'tx-type', type: 'select', options: ['Nakit Giriş', 'Nakit Çıkış'] },
        { label: 'Tutar (₺)', id: 'tx-amount', type: 'number' },
        { label: 'Kategori', id: 'tx-cat', type: 'text', placeholder: 'Kira, Fatura, Satış...' },
        { label: 'Açıklama', id: 'tx-desc', type: 'text', placeholder: 'İşlem açıklaması' },
      ].forEach(f => {
        const group = el('div', 'form-group');
        const lbl = el('label'); attr(lbl, { for: f.id }); lbl.textContent = f.label;
        let input;
        if (f.type === 'select') {
          input = el('select'); attr(input, { id: f.id });
          f.options.forEach(o => { const opt = el('option'); opt.textContent = o; opt.value = o; input.appendChild(opt); });
        } else {
          input = el('input'); attr(input, { type: f.type, id: f.id, placeholder: f.placeholder || '' });
        }
        ap(group, lbl, input);
        form.appendChild(group);
      });
      body.appendChild(form);
    }, {
      footer: (footer) => {
        const cancelBtn = el('button', 'btn btn-secondary'); cancelBtn.textContent = 'İptal'; cancelBtn.addEventListener('click', () => Modal.close());
        const saveBtn = el('button', 'btn btn-primary'); saveBtn.textContent = 'Kaydet';
        saveBtn.addEventListener('click', () => { Modal.close(); toast('success', 'Kaydedildi', 'Kasa işlemi oluşturuldu.'); });
        ap(footer, cancelBtn, saveBtn);
      }
    });
  });
  wrap.appendChild(newTxBtn);
}

/* ================================================================
   12. ÇEK YÖNETİMİ
   ================================================================ */
function renderCekYonetimi(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Çek Yönetimi'),
      ap(el('p', 'page-subtitle'), 'Müşteri çekleri, ciro, takas ve vade takibi')
    ),
    ap(el('div', 'page-actions'),
      (() => { const b = el('button', 'btn btn-primary'); b.textContent = '+ Çek Giriş'; b.addEventListener('click', () => toast('info', 'Demo', 'Çek giriş formu')); return b; })()
    )
  ));

  // Çek vade uyarısı
  const yaklaşan = DB.checks.filter(c => c.status === 'beklemede');
  if (yaklaşan.length) {
    wrap.appendChild(buildAlert('warning', 'Yaklaşan Vadeler', yaklaşan.length + ' çekin vadesi yaklaşıyor. Vade takibini kontrol edin.'));
  }

  const card = el('div', 'card');
  const tblWrap = el('div', 'table-wrapper');
  const tbl = el('table');
  const thead = el('thead');
  const hRow = el('tr');
  ['Çek No', 'Firma/Müşteri', 'Tutar', 'Banka', 'Vade', 'Tür', 'Durum', 'İşlem'].forEach(h => ap(hRow, ap(el('th'), h)));
  thead.appendChild(hRow); tbl.appendChild(thead);

  const tbody = el('tbody');
  const statusMap = { beklemede: 'badge-warning', tahsil_edildi: 'badge-success', ciroda: 'badge-info', protestolu: 'badge-danger' };
  const labelMap  = { beklemede: 'Beklemede', tahsil_edildi: 'Tahsil Edildi', ciroda: 'Ciroda', protestolu: 'Protestolu' };
  const typeMap   = { musteri: 'Müşteri', tedarikci: 'Tedarikçi' };

  DB.checks.forEach(c => {
    const row = el('tr');
    const badge = el('span', 'badge ' + (statusMap[c.status] || 'badge-neutral'));
    badge.textContent = labelMap[c.status] || c.status;

    const actionBtn = el('button', 'btn btn-sm btn-secondary');
    actionBtn.textContent = c.status === 'beklemede' ? 'Ciro Et' : 'Detay';
    actionBtn.addEventListener('click', () => toast('info', 'Demo', c.id + ' işlemi'));

    ap(row, ap(el('td'), c.id), ap(el('td'), c.customer), ap(el('td'), para(c.amount)), ap(el('td'), c.bank), ap(el('td'), c.dueDate), ap(el('td'), typeMap[c.type] || c.type), ap(el('td'), badge), ap(el('td'), actionBtn));
    tbody.appendChild(row);
  });
  tbl.appendChild(tbody); tblWrap.appendChild(tbl); card.appendChild(tblWrap); wrap.appendChild(card);
}

/* ================================================================
   13. MÜŞTERİLER
   ================================================================ */
function renderMusteriler(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Müşteriler'),
      ap(el('p', 'page-subtitle'), DB.customers.length + ' kayıtlı müşteri')
    )
  ));

  const card = el('div', 'card');
  const tblWrap = el('div', 'table-wrapper');
  const tbl = el('table');
  const thead = el('thead');
  const hRow = el('tr');
  ['Müşteri No', 'Ad Soyad', 'Telefon', 'E-posta', 'TC (Maskeli)', 'Servis Sayısı', 'Toplam Harcama', 'KVKK', 'Son Ziyaret'].forEach(h => ap(hRow, ap(el('th'), h)));
  thead.appendChild(hRow); tbl.appendChild(thead);

  const tbody = el('tbody');
  DB.customers.forEach(c => {
    const row = el('tr');
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => openCustomerDetail(c));

    const idCell = el('td');
    const idLink = ap(el('a', 'td-link'), c.id);
    idLink.href = '#'; idLink.addEventListener('click', (e) => { e.preventDefault(); openCustomerDetail(c); });
    idCell.appendChild(idLink);

    const kvkkBadge = el('span', 'badge ' + (c.kvkk ? 'badge-success' : 'badge-danger'));
    kvkkBadge.textContent = c.kvkk ? 'Onaylı' : 'Rıza Yok';

    ap(row, idCell, ap(el('td'), c.name), ap(el('td'), c.phone), ap(el('td'), c.email), ap(el('td'), c.tc), ap(el('td'), String(c.totalSrv) + ' işlem'), ap(el('td'), para(c.totalSpent)), ap(el('td'), kvkkBadge), ap(el('td'), c.lastVisit));
    tbody.appendChild(row);
  });
  tbl.appendChild(tbody); tblWrap.appendChild(tbl); card.appendChild(tblWrap); wrap.appendChild(card);
}

function openCustomerDetail(cust) {
  Modal.open('Müşteri — ' + cust.name, (body) => {
    const rows = [
      ['Müşteri No', cust.id], ['Ad Soyad', cust.name],
      ['Telefon', cust.phone], ['E-posta', cust.email],
      ['TC (Maskeli)', cust.tc], ['Son Ziyaret', cust.lastVisit],
      ['Toplam Servis', cust.totalSrv + ' işlem'], ['Toplam Harcama', para(cust.totalSpent)],
      ['KVKK Durumu', cust.kvkk ? '✓ Onaylı' : '✗ Rıza Yok'],
    ];
    rows.forEach(([lbl, val]) => {
      const row = el('div', 'info-row');
      ap(row, ap(el('span', 'info-label'), lbl), ap(el('span', 'info-value'), val));
      body.appendChild(row);
    });

    // Servis geçmişi
    const sep = el('hr', 'divider');
    body.appendChild(sep);
    ap(body, ap(el('div', 'text-sm text-muted mb-8'), 'Servis Geçmişi:'));

    DB.services.filter(s => s.custName === cust.name).forEach(srv => {
      const item = el('div', 'list-item');
      const content = el('div', 'list-content');
      ap(content, ap(el('div', 'list-title'), srv.id + ' — ' + srv.device), ap(el('div', 'list-sub'), srv.fault + ' · ' + srv.date));
      const badge = el('span', 'badge ' + (STATUS_INFO[srv.status]?.cls || 'badge-neutral'));
      badge.textContent = STATUS_INFO[srv.status]?.label || srv.status;
      ap(item, content, badge);
      body.appendChild(item);
    });
  }, {
    footer: (footer) => {
      const closeBtn = el('button', 'btn btn-secondary'); closeBtn.textContent = 'Kapat'; closeBtn.addEventListener('click', () => Modal.close());
      const kvkkBtn = el('button', 'btn btn-secondary');
      kvkkBtn.textContent = '📋 KVKK Dışa Aktar';
      kvkkBtn.addEventListener('click', () => toast('info', 'KVKK', 'Veriler JSON formatında hazırlanıyor... (Demo)'));
      ap(footer, closeBtn, kvkkBtn);
    }
  });
}

/* ================================================================
   14. MÜŞTERİ PORTALİ
   ================================================================ */
function renderMusteriPortali(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Müşteri Portali'),
      ap(el('p', 'page-subtitle'), 'Müşterilerin kendi servisini takip ettiği portal yönetimi')
    )
  ));

  const cols = el('div', 'grid-2 gap-16');

  // Portal simülasyonu
  const portalCard = buildCard('📱 Portal Önizleme', (body) => {
    body.style.padding = '20px';
    const mockPortal = el('div');
    mockPortal.style.cssText = 'background:var(--bg-base);border:1px solid var(--border-card);border-radius:12px;padding:20px;font-size:13px';

    ap(mockPortal,
      ap(ap(el('div'), 'Servis Takip Kodu:'), ''),
      (() => {
        const inp = el('input'); attr(inp, { placeholder: 'SRV-001', style: 'margin:8px 0;' }); return inp;
      })(),
      (() => {
        const btn = el('button', 'btn btn-primary btn-sm'); btn.textContent = 'SMS ile Giriş';
        btn.addEventListener('click', () => toast('info', 'SMS OTP', 'Demo: Müşteriye 6 haneli OTP gönderildi.'));
        return btn;
      })()
    );

    body.appendChild(mockPortal);

    body.appendChild(el('br'));
    body.appendChild(buildAlert('info', 'Portal URL', 'Müşterileriniz portal.auraintegra.com adresinden kendi servislerini takip edebilir.'));
  });
  cols.appendChild(portalCard);

  // Portal istatistikleri
  const statsCard = buildCard('📊 Portal İstatistikleri', (body) => {
    [
      ['Aktif Oturum', '3'],
      ['Bu Ay Giriş', '42'],
      ['SMS OTP Gönderildi', '38'],
      ['KVKK Silme Talebi', '1'],
    ].forEach(([lbl, val]) => {
      const row = el('div', 'info-row');
      ap(row, ap(el('span', 'info-label'), lbl), ap(el('span', 'info-value'), val));
      body.appendChild(row);
    });
  });
  cols.appendChild(statsCard);

  wrap.appendChild(cols);

  // KVKK talepleri
  const kvkkCard = buildCard('🔒 KVKK Talepleri', (body) => {
    const item = el('div', 'list-item');
    const content = el('div', 'list-content');
    ap(content, ap(el('div', 'list-title'), 'Zeynep Çelik — Veri Silme Talebi'), ap(el('div', 'list-sub'), 'Talep tarihi: 27.05.2026'));
    const btn = el('button', 'btn btn-sm btn-danger'); btn.textContent = 'İşleme Al';
    btn.addEventListener('click', () => toast('warning', 'KVKK', 'Silme talebi işleme alındı. 30 gün içinde tamamlanmalı.'));
    ap(item, content, btn);
    body.appendChild(item);
  });
  wrap.appendChild(kvkkCard);
}

/* ================================================================
   15. RAPORLAR
   ================================================================ */
function renderRaporlar(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Raporlar & Analiz'),
      ap(el('p', 'page-subtitle'), 'Gerçek zamanlı KPI, ciro ve performans verileri')
    ),
    ap(el('div', 'page-actions'),
      (() => {
        const b = el('button', 'btn btn-secondary');
        b.textContent = '📥 Excel İndir';
        b.addEventListener('click', () => toast('success', 'İndiriliyor', 'Rapor Excel formatında hazırlanıyor... (Demo)'));
        return b;
      })(),
      (() => {
        const b = el('button', 'btn btn-secondary');
        b.textContent = '🖨️ PDF';
        b.addEventListener('click', () => window.print());
        return b;
      })()
    )
  ));

  // Dönem seçici
  const periodBar = el('div', 'filter-bar mb-20');
  ['Bugün', 'Bu Hafta', 'Bu Ay', 'Geçen Ay', 'Bu Yıl'].forEach((p, i) => {
    const btn = el('button', 'filter-btn' + (i === 2 ? ' active' : ''));
    btn.textContent = p;
    btn.addEventListener('click', (e) => {
      periodBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
    periodBar.appendChild(btn);
  });
  wrap.appendChild(periodBar);

  // KPI
  const kpiGrid = el('div', 'kpi-grid');
  [
    { label: 'Aylık Ciro', value: '₺89.000', color: 'accent', change: '+%12 geçen aya göre', up: true },
    { label: 'Servis Geliri', value: '₺12.500', color: 'success', change: '+%8', up: true },
    { label: 'Satış Geliri', value: '₺76.500', color: 'violet', change: '+%15', up: true },
    { label: 'Ortalama Servis', value: '₺780', color: 'warning', change: '-%3', up: false },
  ].forEach(kpi => {
    const card = el('div', `kpi-card ${kpi.color}`);
    const hdr = el('div', 'kpi-header');
    const chg = el('span', 'kpi-change ' + (kpi.up ? 'up' : 'down'));
    chg.textContent = kpi.change;
    ap(hdr, el('div'), chg);
    ap(card, hdr, ap(el('div', 'kpi-value'), kpi.value), ap(el('div', 'kpi-label'), kpi.label));
    kpiGrid.appendChild(card);
  });
  wrap.appendChild(kpiGrid);

  // Ciro grafiği (12 ay)
  const chartCard = buildCard('📈 12 Aylık Ciro Grafiği', (body) => {
    body.style.padding = '16px';
    const canvas = el('canvas');
    attr(canvas, { id: 'revenue-chart-main', width: '800', height: '200' });
    body.appendChild(canvas);
    setTimeout(() => drawLineChart('revenue-chart-main', DB.monthLabels, DB.monthlyRevenue, '#06b6d4'), 50);
  });
  wrap.appendChild(chartCard);

  const cols = el('div', 'grid-2 gap-16');
  wrap.appendChild(cols);

  // Servis durum dağılımı
  const statusCard = buildCard('🔧 Servis Durumu Dağılımı', (body) => {
    body.style.padding = '16px';
    const canvas = el('canvas');
    attr(canvas, { id: 'status-chart', width: '200', height: '200' });
    canvas.style.margin = '0 auto;display:block';
    body.appendChild(canvas);

    const counts = {};
    DB.services.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    const labels = Object.keys(counts).map(k => STATUS_INFO[k]?.label || k);
    const values = Object.values(counts);
    const colors = ['#6366f1','#f59e0b','#f97316','#8b5cf6','#06b6d4','#10b981'];

    setTimeout(() => drawDonutChart('status-chart', labels, values, colors), 50);
  });
  cols.appendChild(statusCard);

  // Teknisyen performansı
  const techCard = buildCard('👨‍🔧 Teknisyen Performansı', (body) => {
    [
      { name: 'Mehmet Demir', completed: 12, inProgress: 5, revenue: 18500 },
    ].forEach(tech => {
      const item = el('div');
      item.style.cssText = 'padding:12px 0;border-bottom:1px solid var(--border)';

      const header = el('div'); header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
      ap(header, ap(el('div', 'font-semibold'), tech.name), ap(el('div', 'text-sm text-accent'), para(tech.revenue)));
      item.appendChild(header);

      const detail = el('div'); detail.style.cssText = 'display:flex;gap:16px;font-size:12px;color:var(--text-secondary);margin-bottom:8px';
      ap(detail, ap(el('span'), '✅ ' + tech.completed + ' tamamlanan'), ap(el('span'), '⏳ ' + tech.inProgress + ' devam eden'));
      item.appendChild(detail);

      const pct = Math.round(tech.completed / (tech.completed + tech.inProgress) * 100);
      const barWrap = el('div', 'progress-bar-wrap');
      const barFill = el('div', 'progress-bar-fill');
      barFill.style.cssText = 'width:' + pct + '%;background:var(--accent)';
      barWrap.appendChild(barFill);
      item.appendChild(barWrap);

      body.appendChild(item);
    });
  });
  cols.appendChild(techCard);
}

/* ================================================================
   16. ADMİN PANELİ
   ================================================================ */
function renderAdmin(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Admin Panel'),
      ap(el('p', 'page-subtitle'), 'Bayi yönetimi, abonelik planları ve sistem ayarları')
    ),
    ap(el('div', 'page-actions'),
      (() => { const b = el('button', 'btn btn-primary'); b.textContent = '+ Yeni Bayi Ekle'; b.addEventListener('click', openNewDealerModal); return b; })()
    )
  ));

  // KPI
  const kpiGrid = el('div', 'kpi-grid');
  [
    { label: 'Toplam Bayi', value: String(DB.dealers.length), color: 'accent' },
    { label: 'Aktif Abonelik', value: String(DB.dealers.filter(d => d.status === 'aktif').length), color: 'success' },
    { label: 'Aylık Gelir', value: para(DB.dealers.reduce((s, d) => s + d.monthly, 0)), color: 'violet' },
    { label: 'Deneme Sürecinde', value: String(DB.dealers.filter(d => d.status === 'deneme').length), color: 'warning' },
  ].forEach(kpi => {
    const card = el('div', `kpi-card ${kpi.color}`);
    ap(card, ap(el('div', 'kpi-value'), kpi.value), ap(el('div', 'kpi-label'), kpi.label));
    kpiGrid.appendChild(card);
  });
  wrap.appendChild(kpiGrid);

  // Bayi tablosu
  const card = el('div', 'card');
  ap(card, ap(el('div', 'card-header'), ap(el('div', 'card-title'), '🏪 Bayi Listesi')));
  const tblWrap = el('div', 'table-wrapper');
  const tbl = el('table');
  const thead = el('thead');
  const hRow = el('tr');
  ['Bayi No', 'Firma Adı', 'Sorumlu', 'Şehir', 'Plan', 'Durum', 'Kullanıcılar', 'Vade', 'Aylık ₺', 'İşlem'].forEach(h => ap(hRow, ap(el('th'), h)));
  thead.appendChild(hRow); tbl.appendChild(thead);

  const tbody = el('tbody');
  const planColors = { Starter: 'badge-info', Pro: 'badge-success', Enterprise: 'badge-warning' };
  const statusColors = { aktif: 'badge-success', deneme: 'badge-warning', pasif: 'badge-neutral' };

  DB.dealers.forEach(d => {
    const row = el('tr');
    const planBadge = el('span', 'badge ' + (planColors[d.plan] || 'badge-neutral')); planBadge.textContent = d.plan;
    const statusBadge = el('span', 'badge ' + (statusColors[d.status] || 'badge-neutral')); statusBadge.textContent = d.status.charAt(0).toUpperCase() + d.status.slice(1);

    const actionBtn = el('button', 'btn btn-sm btn-secondary'); actionBtn.textContent = 'Yönet';
    actionBtn.addEventListener('click', () => toast('info', 'Demo', d.name + ' bayi yönetimi'));

    ap(row, ap(el('td'), d.id), ap(el('td'), d.name), ap(el('td'), d.owner), ap(el('td'), d.city), ap(el('td'), planBadge), ap(el('td'), statusBadge), ap(el('td'), d.users + ' kullanıcı'), ap(el('td'), d.expiry), ap(el('td'), para(d.monthly)), ap(el('td'), actionBtn));
    tbody.appendChild(row);
  });
  tbl.appendChild(tbody); tblWrap.appendChild(tbl); card.appendChild(tblWrap); wrap.appendChild(card);

  // Abonelik planları
  const plansSection = el('div');
  plansSection.style.marginTop = '24px';
  const plansTitle = ap(el('h3'), 'Abonelik Planları');
  plansTitle.style.cssText = 'font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:16px';
  plansSection.appendChild(plansTitle);

  const plansGrid = el('div');
  plansGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px';

  [
    { name: 'Starter', price: '₺390/ay', color: 'var(--accent)', features: ['1 Kullanıcı', '1 Şube', 'Teknik Servis', 'Stok Yönetimi', '5 GB Depolama'] },
    { name: 'Pro', price: '₺890/ay', color: 'var(--violet)', features: ['5 Kullanıcı', '3 Şube', 'Tüm Modüller', 'Müşteri Portali', '20 GB Depolama', 'Öncelikli Destek'] },
    { name: 'Enterprise', price: '₺1.890/ay', color: 'var(--warning)', features: ['Sınırsız Kullanıcı', 'Sınırsız Şube', 'Tüm Modüller + API', 'White-label Seçeneği', '100 GB Depolama', '7/24 Destek'] },
  ].forEach(plan => {
    const card2 = el('div', 'card');
    card2.style.borderColor = plan.color + '40';
    const body = el('div', 'card-body');

    const nameEl = ap(el('div'), plan.name);
    nameEl.style.cssText = 'font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:6px';
    const priceEl = ap(el('div'), plan.price);
    priceEl.style.cssText = 'font-size:24px;font-weight:800;color:' + plan.color + ';margin-bottom:16px;letter-spacing:-1px';

    const featureList = el('ul'); featureList.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text-secondary)';
    plan.features.forEach(f => {
      const li = el('li'); li.style.cssText = 'display:flex;gap:8px;align-items:center';
      const dot = el('span'); dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:' + plan.color + ';flex-shrink:0';
      ap(li, dot, f);
      featureList.appendChild(li);
    });

    ap(body, nameEl, priceEl, featureList);
    card2.appendChild(body);
    plansGrid.appendChild(card2);
  });

  plansSection.appendChild(plansGrid);
  wrap.appendChild(plansSection);
}

function openNewDealerModal() {
  Modal.open('Yeni Bayi Ekle', (body) => {
    const form = el('div', 'form-grid');
    [
      { label: 'Firma Adı', id: 'dlr-name', type: 'text', placeholder: 'Konya Teknik Servis' },
      { label: 'Sorumlu Kişi', id: 'dlr-owner', type: 'text', placeholder: 'Ad Soyad' },
      { label: 'Telefon', id: 'dlr-phone', type: 'tel', placeholder: '05XX...' },
      { label: 'E-posta', id: 'dlr-email', type: 'email', placeholder: 'firma@mail.com' },
      { label: 'Şehir', id: 'dlr-city', type: 'text', placeholder: 'İstanbul' },
      { label: 'Abonelik Planı', id: 'dlr-plan', type: 'select', options: ['Starter', 'Pro', 'Enterprise'] },
    ].forEach(f => {
      const group = el('div', 'form-group');
      const lbl = el('label'); attr(lbl, { for: f.id }); lbl.textContent = f.label;
      let input;
      if (f.type === 'select') {
        input = el('select'); attr(input, { id: f.id });
        f.options.forEach(o => { const opt = el('option'); opt.textContent = o; opt.value = o; input.appendChild(opt); });
      } else {
        input = el('input'); attr(input, { type: f.type, id: f.id, placeholder: f.placeholder });
      }
      ap(group, lbl, input);
      form.appendChild(group);
    });
    body.appendChild(form);
    body.appendChild(buildAlert('info', 'Bilgi', 'Bayi hesabı oluşturulduğunda otomatik giriş bilgileri e-posta ile gönderilir.'));
  }, {
    footer: (footer) => {
      const cancelBtn = el('button', 'btn btn-secondary'); cancelBtn.textContent = 'İptal'; cancelBtn.addEventListener('click', () => Modal.close());
      const saveBtn = el('button', 'btn btn-primary'); saveBtn.textContent = '✓ Bayiyi Oluştur';
      saveBtn.addEventListener('click', () => { Modal.close(); toast('success', 'Bayi Oluşturuldu', 'Yeni bayi hesabı aktif edildi ve giriş bilgileri gönderildi.'); });
      ap(footer, cancelBtn, saveBtn);
    }
  });
}

/* ================================================================
   17. AYARLAR
   ================================================================ */
function renderAyarlar(main) {
  const wrap = ap(main, el('div', 'fade-in'));

  wrap.appendChild(ap(el('div', 'page-header'),
    ap(el('div', 'page-header-left'),
      ap(el('h1', 'page-title'), 'Ayarlar'),
      ap(el('p', 'page-subtitle'), 'Sistem ve işletme ayarları')
    )
  ));

  const cols = el('div', 'grid-2 gap-16');

  const firmCard = buildCard('🏪 İşletme Bilgileri', (body) => {
    const form = el('div', 'form-grid');
    [
      { label: 'İşletme Adı', val: 'Merkez Teknik Servis' },
      { label: 'VKN/TCKN', val: '***-***-5678' },
      { label: 'Adres', val: 'Atatürk Cad. No:12 Merkez' },
      { label: 'Vergi Dairesi', val: 'Merkez VD' },
    ].forEach(f => {
      const group = el('div', 'form-group');
      const lbl = el('label'); lbl.textContent = f.label;
      const input = el('input'); attr(input, { type: 'text', value: f.val });
      ap(group, lbl, input);
      form.appendChild(group);
    });
    body.appendChild(form);
    const saveBtn = el('button', 'btn btn-primary'); saveBtn.textContent = 'Kaydet'; saveBtn.style.marginTop = '16px';
    saveBtn.addEventListener('click', () => toast('success', 'Kaydedildi', 'İşletme bilgileri güncellendi.'));
    body.appendChild(saveBtn);
  });
  cols.appendChild(firmCard);

  const userCard = buildCard('👤 Kullanıcı Ayarları', (body) => {
    const form = el('div', 'form-grid');
    [
      { label: 'Ad Soyad', val: DB.currentUser.name },
      { label: 'Kullanıcı Adı', val: DB.currentUser.id },
    ].forEach(f => {
      const group = el('div', 'form-group');
      const lbl = el('label'); lbl.textContent = f.label;
      const input = el('input'); attr(input, { type: 'text', value: f.val });
      ap(group, lbl, input);
      form.appendChild(group);
    });
    // Şifre değişimi
    const pwGroup = el('div', 'form-group full');
    const pwLbl = el('label'); pwLbl.textContent = 'Yeni Şifre';
    const pwInp = el('input'); attr(pwInp, { type: 'password', placeholder: 'En az 12 karakter' });
    ap(pwGroup, pwLbl, pwInp);
    form.appendChild(pwGroup);
    body.appendChild(form);
    const saveBtn = el('button', 'btn btn-primary'); saveBtn.textContent = 'Güncelle'; saveBtn.style.marginTop = '16px';
    saveBtn.addEventListener('click', () => toast('success', 'Güncellendi', 'Kullanıcı bilgileri güncellendi.'));
    body.appendChild(saveBtn);
  });
  cols.appendChild(userCard);

  wrap.appendChild(cols);

  // Çıkış
  wrap.appendChild(el('hr', 'divider'));
  const logoutBtn = el('button', 'btn btn-danger');
  logoutBtn.textContent = '↩ Çıkış Yap';
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
  wrap.appendChild(logoutBtn);
}

/* ================================================================
   18. CANVAS CHART FONKSİYONLARI
   ================================================================ */
function drawLineChart(canvasId, labels, data, color = '#06b6d4') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Make it responsive
  const parent = canvas.parentElement;
  if (parent) {
    canvas.width = parent.clientWidth || 600;
  }

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 70 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...data) * 1.1;
  const min = 0;

  // Grid lines
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();

    // Y labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Outfit, system-ui';
    ctx.textAlign = 'right';
    const val = Math.round((min + (max - min) * i / 4) / 1000);
    ctx.fillText('₺' + val + 'K', pad.left - 6, y + 4);
  }

  // X labels
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  labels.forEach((lbl, i) => {
    const x = pad.left + (i / (labels.length - 1)) * chartW;
    ctx.fillText(lbl, x, H - 8);
  });

  // Fill area
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradient.addColorStop(0, color + '30');
  gradient.addColorStop(1, color + '00');

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = pad.left + (i / (data.length - 1)) * chartW;
    const y = pad.top + chartH - ((val - min) / (max - min)) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  data.forEach((val, i) => {
    const x = pad.left + (i / (data.length - 1)) * chartW;
    const y = pad.top + chartH - ((val - min) / (max - min)) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  data.forEach((val, i) => {
    const x = pad.left + (i / (data.length - 1)) * chartW;
    const y = pad.top + chartH - ((val - min) / (max - min)) * chartH;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d1526';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawDonutChart(canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const outerR = Math.min(cx, cy) - 10;
  const innerR = outerR * 0.55;

  ctx.clearRect(0, 0, W, H);
  const total = values.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;

  values.forEach((val, i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1526';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 20px Outfit, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.font = '11px Outfit, system-ui';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Toplam', cx, cy + 20);
}

/* ================================================================
   19. YARDIMCI FONKSİYONLAR
   ================================================================ */
function buildCard(title, buildBody) {
  const card = el('div', 'card');
  const header = el('div', 'card-header');
  ap(header, ap(el('div', 'card-title'), title));
  card.appendChild(header);
  const body = el('div', 'card-body');
  buildBody(body);
  card.appendChild(body);
  return card;
}

function buildAlert(type, title, message) {
  const alert = el('div', 'alert alert-' + type);
  alert.style.marginBottom = '16px';

  // Icon paths
  const iconPaths = {
    info:    [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } }, { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '12' } }, { tag: 'line', attrs: { x1: '12', y1: '16', x2: '12.01', y2: '16' } }],
    warning: [{ tag: 'path', attrs: { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' } }, { tag: 'line', attrs: { x1: '12', y1: '9', x2: '12', y2: '13' } }, { tag: 'line', attrs: { x1: '12', y1: '17', x2: '12.01', y2: '17' } }],
    danger:  [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } }, { tag: 'line', attrs: { x1: '15', y1: '9', x2: '9', y2: '15' } }, { tag: 'line', attrs: { x1: '9', y1: '9', x2: '15', y2: '15' } }],
    success: [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }],
  };

  const icon = svgEl(iconPaths[type] || iconPaths.info);
  icon.style.flexShrink = '0';

  const content = el('div', 'alert-content');
  if (title) ap(content, ap(el('div', 'alert-title'), title));
  ap(content, ap(el('div'), message));

  ap(alert, icon, content);
  return alert;
}

function buildKpiIcon(name) {
  const paths = {
    wrench: [{ tag: 'path', attrs: { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' } }],
    check:  [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }],
    wallet: [{ tag: 'rect', attrs: { x: '2', y: '5', width: '20', height: '14', rx: '2' } }, { tag: 'line', attrs: { x1: '2', y1: '10', x2: '22', y2: '10' } }],
    chart:  [{ tag: 'line', attrs: { x1: '18', y1: '20', x2: '18', y2: '10' } }, { tag: 'line', attrs: { x1: '12', y1: '20', x2: '12', y2: '4' } }, { tag: 'line', attrs: { x1: '6', y1: '20', x2: '6', y2: '14' } }, { tag: 'path', attrs: { d: 'M2 20h20' } }],
    bell:   [{ tag: 'path', attrs: { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' } }, { tag: 'path', attrs: { d: 'M13.73 21a2 2 0 0 1-3.46 0' } }],
    alert:  [{ tag: 'path', attrs: { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' } }, { tag: 'line', attrs: { x1: '12', y1: '9', x2: '12', y2: '13' } }, { tag: 'line', attrs: { x1: '12', y1: '17', x2: '12.01', y2: '17' } }],
  };
  return svgEl(paths[name] || paths.chart);
}

/* ================================================================
   20. BAŞLATMA
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Modal.init();
  initUserUI();
  initSidebar();

  // Yeni servis butonu (topbar)
  const newSrvBtn = document.getElementById('btn-quick-new-servis');
  if (newSrvBtn) {
    newSrvBtn.addEventListener('click', () => {
      navigate('teknik-servis');
      setTimeout(openNewServiceModal, 100);
    });
  }

  // Çıkış butonu (topbar)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // TODO(security): Production'da sunucu taraflı oturum sonlandırma gereklidir
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // Bildirimler butonu
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      const unread = DB.notifications.filter(n => !n.read);
      unread.forEach(n => { n.read = true; });
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = 'none';

      Modal.open('Bildirimler', (body) => {
        body.style.padding = '0';
        if (DB.notifications.length === 0) {
          ap(body, ap(el('div', 'empty-state'), '🔔', ap(el('div', 'empty-state-title'), 'Bildirim yok')));
          return;
        }
        DB.notifications.forEach(n => {
          const item = el('div', 'list-item');
          const dot2 = el('div');
          dot2.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:' + notifColor(n.type);
          const content = el('div', 'list-content');
          ap(content, ap(el('div', 'list-title'), n.title), ap(el('div', 'list-sub'), n.message));
          const time = ap(el('div', 'list-meta'), n.time + ' önce');
          ap(item, dot2, content, time);
          body.appendChild(item);
        });
      });
    });
  }

  // Bildirim dot'u ayarla
  const unread = DB.notifications.filter(n => !n.read);
  const dot = document.getElementById('notif-dot');
  if (dot && unread.length === 0) dot.style.display = 'none';

  // Kritik stok badge'i
  const lowStock = DB.parts.filter(p => p.stock <= p.minStock);
  if (lowStock.length > 0) {
    const stokBadge = document.getElementById('badge-stok');
    if (stokBadge) { stokBadge.textContent = String(lowStock.length); stokBadge.style.display = ''; }
  }

  // Logo link
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => { e.preventDefault(); navigate('dashboard'); });
  }

  // İlk route
  navigate('dashboard');

  // Hoş geldin toastı
  setTimeout(() => {
    toast('success', 'Giriş Başarılı', 'Hoş geldiniz, ' + DB.currentUser.name + '!');
  }, 600);
});
