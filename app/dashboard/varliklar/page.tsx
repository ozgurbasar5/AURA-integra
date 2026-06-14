'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Monitor, Printer, Microscope, Armchair, Car, MoreHorizontal,
  Plus, Search, Filter, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight,
  CheckCircle2, Wrench, AlertTriangle, Archive, CalendarClock, TrendingUp,
  DollarSign, ClipboardList
} from 'lucide-react';
import { getAssets, setAssets as persistAssets, onStoreChange, type Asset } from '@/lib/store';

/* ───────────────── Types ───────────────── */
type CategoryKey = Asset['category'];
type StatusKey = Asset['status'];

/* ───────────────── Constants ───────────────── */
const PAGE_SIZE = 10;

const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const CATEGORY_MAP: Record<CategoryKey, { label: string; icon: React.ElementType }> = {
  bilgisayar: { label: 'Bilgisayar', icon: Monitor },
  yazici: { label: 'Yazıcı', icon: Printer },
  test_cihazi: { label: 'Test Cihazı', icon: Microscope },
  mobilya: { label: 'Mobilya', icon: Armchair },
  arac: { label: 'Araç', icon: Car },
  diger: { label: 'Diğer', icon: MoreHorizontal },
};

const STATUS_MAP: Record<StatusKey, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  aktif: { label: 'Aktif', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  bakim: { label: 'Bakımda', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: Wrench },
  arizali: { label: 'Arızalı', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', icon: AlertTriangle },
  emekli: { label: 'Emekli', color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30', icon: Archive },
};

const CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'bilgisayar', label: 'Bilgisayar' },
  { value: 'yazici', label: 'Yazıcı' },
  { value: 'test_cihazi', label: 'Test Cihazı' },
  { value: 'mobilya', label: 'Mobilya' },
  { value: 'arac', label: 'Araç' },
  { value: 'diger', label: 'Diğer' },
];

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'bakim', label: 'Bakımda' },
  { value: 'arizali', label: 'Arızalı' },
  { value: 'emekli', label: 'Emekli' },
];

/* ───────────────── Helpers ───────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const isPastDue = (d: string) => {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
};

const emptyAsset = (): Omit<Asset, 'id' | 'created_at'> => ({
  name: '',
  category: 'bilgisayar',
  serial_no: '',
  barcode: '',
  purchase_date: '',
  purchase_price: 0,
  current_value: 0,
  assigned_to: '',
  location: '',
  status: 'aktif',
  next_maintenance: '',
  notes: '',
});

/* ───────────────── Component ───────────────── */
export default function VarliklarPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Asset, 'id' | 'created_at'>>(emptyAsset());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => setAssets(getAssets()), []);

  useEffect(() => {
    reload();
    setMounted(true);
    return onStoreChange(m => { if (!m || m === 'assets' || m === 'seed') reload(); });
  }, [reload]);

  const saveAssets = (next: Asset[]) => {
    persistAssets(next);
    setAssets(next);
  };

  /* ── Filtered / searched list ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) => {
      if (filterCategory && a.category !== filterCategory) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (q) {
        const haystack = `${a.name} ${a.serial_no} ${a.barcode}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, search, filterCategory, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = assets.length;
    const active = assets.filter((a) => a.status === 'aktif').length;
    const totalValue = assets.reduce((s, a) => s + (a.current_value || 0), 0);
    const maintenance = assets.filter((a) => a.status === 'bakim' || (a.next_maintenance && isPastDue(a.next_maintenance))).length;
    return { total, active, totalValue, maintenance };
  }, [assets]);

  /* ── Modal helpers ── */
  const openAdd = useCallback(() => {
    setEditId(null);
    setForm(emptyAsset());
    setErrors({});
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((a: Asset) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      category: a.category,
      serial_no: a.serial_no,
      barcode: a.barcode,
      purchase_date: a.purchase_date,
      purchase_price: a.purchase_price,
      current_value: a.current_value,
      assigned_to: a.assigned_to,
      location: a.location,
      status: a.status,
      next_maintenance: a.next_maintenance,
      notes: a.notes,
    });
    setErrors({});
    setModalOpen(true);
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Varlık adı zorunludur';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editId) {
      saveAssets(assets.map((a) => (a.id === editId ? { ...a, ...form } : a)));
    } else {
      const newAsset: Asset = {
        ...form,
        id: uid(),
        created_at: new Date().toISOString(),
      };
      saveAssets([newAsset, ...assets]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    saveAssets(assets.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  };

  const setField = <K extends keyof Omit<Asset, 'id' | 'created_at'>>(key: K, value: Omit<Asset, 'id' | 'created_at'>[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  /* ── Render helpers ── */
  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) => (
    <div className="bg-slate-800/60 backdrop-blur border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
              Varlık Yönetimi
            </h1>
            <p className="text-slate-400 mt-1">Şirket varlıklarını takip edin ve yönetin</p>
          </div>
        </div>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Toplam Varlık" value={stats.total} icon={Package} color="bg-sky-600" />
          <StatCard title="Aktif Varlıklar" value={stats.active} icon={CheckCircle2} color="bg-emerald-600" />
          <StatCard title="Toplam Değer" value={fmt(stats.totalValue)} icon={DollarSign} color="bg-sky-600" />
          <StatCard title="Bakım Bekleyen" value={stats.maintenance} icon={CalendarClock} color="bg-amber-600" />
        </div>

        {/* ─── Filter / Action Bar ─── */}
        <div className="bg-slate-800/60 backdrop-blur border border-white/10 rounded-2xl p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Varlık adı, seri no veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer min-w-[140px]"
              >
                {CATEGORY_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer min-w-[130px]"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Add button */}
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Varlık Ekle
            </button>
          </div>
        </div>

        {/* ─── Table ─── */}
        <div className="bg-slate-800/60 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10">
                  {['Varlık Adı', 'Kategori', 'Seri No', 'Alım Tarihi', 'Alım Fiyatı', 'Güncel Değer', 'Zimmetli Kişi', 'Konum', 'Durum', 'Sonraki Bakım', 'İşlemler'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-500">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-base">Kayıt bulunamadı</p>
                      <p className="text-xs mt-1">Yeni bir varlık ekleyerek başlayın</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((a) => {
                    const cat = CATEGORY_MAP[a.category];
                    const st = STATUS_MAP[a.status];
                    const CatIcon = cat.icon;
                    const StIcon = st.icon;
                    const maintenancePastDue = isPastDue(a.next_maintenance ?? '');

                    return (
                      <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{a.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            <CatIcon className="w-4 h-4 text-slate-400" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-mono text-xs">{a.serial_no || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(a.purchase_date)}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{a.purchase_price ? fmt(a.purchase_price) : '—'}</td>
                        <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{a.current_value ? fmt(a.current_value) : '—'}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{a.assigned_to || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{a.location || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${st.bg} ${st.color}`}>
                            <StIcon className="w-3.5 h-3.5" />
                            {st.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${maintenancePastDue ? 'text-red-400' : 'text-slate-300'}`}>
                          {a.next_maintenance ? (
                            <span className="inline-flex items-center gap-1">
                              {maintenancePastDue && <AlertTriangle className="w-3.5 h-3.5" />}
                              {fmtDate(a.next_maintenance)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(a)}
                              className="p-1.5 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-400 transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(a.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <span className="text-xs text-slate-400">
                {filtered.length} kayıttan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} arası gösteriliyor
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all ${
                      n === page ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete Confirm ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Varlığı Sil</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6">Bu varlık kalıcı olarak silinecek. Devam etmek istiyor musunuz?</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
                İptal
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all active:scale-95">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editId ? 'Varlık Düzenle' : 'Yeni Varlık Ekle'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Varlık Adı <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className={`w-full px-3 py-2.5 bg-slate-900/60 border rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                    placeholder="Varlık adını girin"
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value as CategoryKey)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Seri No</label>
                  <input
                    type="text"
                    value={form.serial_no}
                    onChange={(e) => setField('serial_no', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="SN-XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Barkod</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setField('barcode', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="Barkod numarası"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Alım Tarihi</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setField('purchase_date', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Alım Fiyatı (₺)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.purchase_price || ''}
                    onChange={(e) => setField('purchase_price', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Güncel Değer (₺)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.current_value || ''}
                    onChange={(e) => setField('current_value', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Zimmetli Kişi</label>
                  <input
                    type="text"
                    value={form.assigned_to}
                    onChange={(e) => setField('assigned_to', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="Personel adı"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Konum</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setField('location', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                    placeholder="Bina / Kat / Oda"
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Durum</label>
                  <select
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value as StatusKey)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Sonraki Bakım Tarihi</label>
                  <input
                    type="date"
                    value={form.next_maintenance}
                    onChange={(e) => setField('next_maintenance', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notlar</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all resize-none"
                  placeholder="Ek notlar..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
                İptal
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all active:scale-95">
                <Save className="w-4 h-4" />
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
