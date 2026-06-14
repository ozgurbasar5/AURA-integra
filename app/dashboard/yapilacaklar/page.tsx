'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Edit3, X, Calendar, User, Tag, AlertTriangle,
  ListTodo, CheckCircle2, Clock, Flame, ChevronDown, ChevronUp, Search, Filter,
  ClipboardList, BarChart3, Settings, Wrench, Package, DollarSign, Users, Globe
} from 'lucide-react';
import { getTodos, setTodos as persistTodos, onStoreChange, type TodoItem } from '@/lib/store';

type Todo = TodoItem;

type PriorityKey = Todo['priority'];
type CategoryKey = Todo['category'];

/* ─── Constants ─── */
const STORAGE_KEY = 'servissoft_store';

const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const PRIORITY_MAP: Record<PriorityKey, { label: string; color: string; bg: string; ring: string; icon: React.ReactNode }> = {
  dusuk:  { label: 'Düşük',  color: 'text-sky-400',    bg: 'bg-sky-500/15',    ring: 'ring-sky-500/30',  icon: <ChevronDown size={14} /> },
  orta:   { label: 'Orta',    color: 'text-amber-400',  bg: 'bg-amber-500/15',  ring: 'ring-amber-500/30', icon: <BarChart3 size={14} /> },
  yuksek: { label: 'Yüksek', color: 'text-orange-400', bg: 'bg-orange-500/15', ring: 'ring-orange-500/30', icon: <AlertTriangle size={14} /> },
  acil:   { label: 'Acil',    color: 'text-red-400',    bg: 'bg-red-500/15',    ring: 'ring-red-500/30',   icon: <Flame size={14} /> },
};

const CATEGORY_MAP: Record<CategoryKey, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  servis:  { label: 'Servis',   color: 'text-sky-400', bg: 'bg-sky-500/15', icon: <Wrench size={14} /> },
  stok:    { label: 'Stok',     color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: <Package size={14} /> },
  finans:  { label: 'Finans',   color: 'text-yellow-400', bg: 'bg-yellow-500/15', icon: <DollarSign size={14} /> },
  musteri: { label: 'Müşteri',  color: 'text-pink-400',   bg: 'bg-pink-500/15',   icon: <Users size={14} /> },
  genel:   { label: 'Genel',    color: 'text-slate-400',  bg: 'bg-slate-500/15',  icon: <Globe size={14} /> },
};

const CATEGORY_TABS: { key: CategoryKey | 'all'; label: string }[] = [
  { key: 'all',     label: 'Tümü' },
  { key: 'servis',  label: 'Servis' },
  { key: 'stok',    label: 'Stok' },
  { key: 'finans',  label: 'Finans' },
  { key: 'musteri', label: 'Müşteri' },
  { key: 'genel',   label: 'Genel' },
];

const PRIORITY_TABS: { key: PriorityKey | 'all'; label: string }[] = [
  { key: 'all',    label: 'Tümü' },
  { key: 'dusuk',  label: 'Düşük' },
  { key: 'orta',   label: 'Orta' },
  { key: 'yuksek', label: 'Yüksek' },
  { key: 'acil',   label: 'Acil' },
];

const emptyTodo: Omit<Todo, 'id' | 'created_at' | 'completed'> = {
  title: '', description: '', priority: 'orta', category: 'genel', assigned_to: '', due_date: '',
};

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(due: string, completed: boolean) {
  if (!due || completed) return false;
  return new Date(due).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

/* ─── Page Component ─── */
export default function YapilacaklarPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryKey | 'all'>('all');
  const [prioFilter, setPrioFilter] = useState<PriorityKey | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTodo);
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* ── Load ── */
  useEffect(() => {
    setTodos(getTodos());
    setMounted(true);
    return onStoreChange(m => { if (m === 'todos' || m === 'seed') setTodos(getTodos()) });
  }, []);

  useEffect(() => {
    if (mounted) persistTodos(todos);
  }, [todos, mounted]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    const urgent = todos.filter(t => t.priority === 'acil' && !t.completed).length;
    return { total, completed, pending, urgent };
  }, [todos]);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    let list = [...todos];
    if (!showCompleted) list = list.filter(t => !t.completed);
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);
    if (prioFilter !== 'all') list = list.filter(t => t.priority === prioFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.assigned_to ?? '').toLowerCase().includes(q)
      );
    }
    const prioOrder: Record<PriorityKey, number> = { acil: 0, yuksek: 1, orta: 2, dusuk: 3 };
    list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return prioOrder[a.priority] - prioOrder[b.priority];
    });
    return list;
  }, [todos, search, catFilter, prioFilter, showCompleted]);

  /* ── Actions ── */
  const toggleComplete = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
  }, []);

  const openAdd = () => { setEditingId(null); setForm(emptyTodo); setFormError(''); setModalOpen(true); };
  const openEdit = (t: Todo) => {
    setEditingId(t.id);
    setForm({ title: t.title, description: t.description, priority: t.priority, category: t.category, assigned_to: t.assigned_to, due_date: t.due_date });
    setFormError('');
    setModalOpen(true);
  };

  const saveForm = () => {
    if (!form.title.trim()) { setFormError('Başlık zorunludur'); return; }
    if (editingId) {
      setTodos(prev => prev.map(t => t.id === editingId ? { ...t, ...form, title: form.title.trim(), description: (form.description ?? '').trim(), assigned_to: (form.assigned_to ?? '').trim() } : t));
    } else {
      const newTodo: Todo = {
        id: uid(),
        ...form,
        title: form.title.trim(),
        description: (form.description ?? '').trim(),
        assigned_to: (form.assigned_to ?? '').trim(),
        completed: false,
        created_at: new Date().toISOString(),
      };
      setTodos(prev => [newTodo, ...prev]);
    }
    setModalOpen(false);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500" />
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="text-sky-400" size={28} />
            Yapılacaklar
          </h1>
          <p className="text-slate-400 text-sm mt-1">Görev yönetimi ve takip paneli</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-sky-600/20 hover:shadow-sky-500/30 hover:scale-[1.03] active:scale-[0.98]">
          <Plus size={18} /> Yeni Görev
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Görev', value: stats.total, icon: <ListTodo size={22} />, accent: 'from-sky-500 to-sky-700', iconBg: 'bg-sky-500/20 text-sky-400' },
          { label: 'Tamamlanan',   value: stats.completed, icon: <CheckCircle2 size={22} />, accent: 'from-emerald-500 to-emerald-700', iconBg: 'bg-emerald-500/20 text-emerald-400' },
          { label: 'Bekleyen',     value: stats.pending, icon: <Clock size={22} />, accent: 'from-amber-500 to-amber-700', iconBg: 'bg-amber-500/20 text-amber-400' },
          { label: 'Acil',         value: stats.urgent, icon: <Flame size={22} />, accent: 'from-red-500 to-red-700', iconBg: 'bg-red-500/20 text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/70 backdrop-blur rounded-2xl border border-white/5 p-5 flex items-center gap-4 hover:border-white/10 transition-colors group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.iconBg} transition-transform group-hover:scale-110`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-white/5 p-4 space-y-4">
        {/* Search + completed toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Görev ara..."
              className="w-full bg-slate-900/60 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div className={`w-10 h-5 rounded-full relative transition-colors ${showCompleted ? 'bg-sky-600' : 'bg-slate-700'}`}
              onClick={() => setShowCompleted(p => !p)}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showCompleted ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors whitespace-nowrap">Tamamlananları göster</span>
          </label>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1 mr-1"><Tag size={12} /> Kategori:</span>
          {CATEGORY_TABS.map(t => (
            <button key={t.key} onClick={() => setCatFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === t.key ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1 mr-1"><Filter size={12} /> Öncelik:</span>
          {PRIORITY_TABS.map(t => (
            <button key={t.key} onClick={() => setPrioFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${prioFilter === t.key ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Task List ── */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <ListTodo size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-sm">Görev bulunamadı</p>
            <button onClick={openAdd} className="mt-3 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors">+ Yeni görev oluştur</button>
          </div>
        )}

        {filtered.map(todo => {
          const prio = PRIORITY_MAP[todo.priority];
          const cat  = CATEGORY_MAP[todo.category];
          const overdue = isOverdue(todo.due_date ?? '', todo.completed);
          const expanded = expandedId === todo.id;

          return (
            <div key={todo.id}
              className={`group bg-slate-800/60 backdrop-blur rounded-2xl border transition-all duration-300 ease-in-out hover:border-white/15 ${
                todo.completed ? 'border-white/5 opacity-60' : overdue ? 'border-red-500/30' : 'border-white/5'
              }`}>
              {/* Main Row */}
              <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : todo.id)}>
                {/* Checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleComplete(todo.id); }}
                  className={`mt-0.5 flex-shrink-0 transition-all duration-300 ${todo.completed ? 'text-emerald-400 scale-110' : 'text-slate-600 hover:text-sky-400 hover:scale-110'}`}>
                  {todo.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm transition-all duration-300 ${todo.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                      {todo.title}
                    </span>
                    {/* Priority Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${prio.bg} ${prio.color} ${prio.ring}`}>
                      {prio.icon} {prio.label}
                    </span>
                    {/* Category */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.bg} ${cat.color}`}>
                      {cat.icon} {cat.label}
                    </span>
                  </div>

                  {todo.description && (
                    <p className={`text-xs mt-1 transition-all duration-300 ${todo.completed ? 'text-slate-600 line-through' : 'text-slate-400'} ${expanded ? '' : 'line-clamp-1'}`}>
                      {todo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {todo.assigned_to && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <User size={12} /> {todo.assigned_to}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>
                        <Calendar size={12} /> {formatDate(todo.due_date)}
                        {overdue && <span className="ml-1 text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">GECİKMİŞ</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); openEdit(todo); }}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors" title="Düzenle">
                    <Edit3 size={15} />
                  </button>
                  {deleteConfirm === todo.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => deleteTodo(todo.id)}
                        className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-medium transition-colors">Sil</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-medium transition-colors">İptal</button>
                    </div>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(todo.id); }}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors" title="Sil">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <ChevronDown size={16} className={`text-slate-600 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded Detail */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pb-4 pt-0 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400">
                  <div><span className="text-slate-600 block">Oluşturulma</span>{formatDate(todo.created_at)}</div>
                  <div><span className="text-slate-600 block">Öncelik</span><span className={prio.color}>{prio.label}</span></div>
                  <div><span className="text-slate-600 block">Kategori</span><span className={cat.color}>{cat.label}</span></div>
                  <div><span className="text-slate-600 block">Durum</span>{todo.completed ? <span className="text-emerald-400">Tamamlandı</span> : <span className="text-amber-400">Bekliyor</span>}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />

          {/* Panel */}
          <div className="relative bg-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit3 size={20} className="text-sky-400" /> : <Plus size={20} className="text-sky-400" />}
                {editingId ? 'Görevi Düzenle' : 'Yeni Görev'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              {/* Başlık */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Başlık <span className="text-red-400">*</span></label>
                <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(''); }}
                  placeholder="Görev başlığı..."
                  className="w-full bg-slate-900/60 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all" />
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Detaylar..."
                  className="w-full bg-slate-900/60 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all resize-none" />
              </div>

              {/* Öncelik + Kategori */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as PriorityKey }))}
                    className="w-full bg-slate-900/60 text-white rounded-xl px-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all appearance-none cursor-pointer">
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as CategoryKey }))}
                    className="w-full bg-slate-900/60 text-white rounded-xl px-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all appearance-none cursor-pointer">
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Atanan + Son Tarih */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Atanan Kişi</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                      placeholder="İsim..."
                      className="w-full bg-slate-900/60 text-white placeholder:text-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Son Tarih</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full bg-slate-900/60 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/5 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/5">
              <button onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                İptal
              </button>
              <button onClick={saveForm}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-sky-600/20 hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98]">
                <CheckCircle2 size={16} />
                {editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
