"use client";

import { Users, TrendingUp, AlertTriangle, CreditCard, Send, Activity, ChevronRight } from "lucide-react";

export default function AdminDashboard() {
  const stats = {
    totalTenants: 34,
    activeTenants: 31,
    monthlyRevenue: 28500,
    overduePayments: 3
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Süper Admin Özeti</h1>
        <p className="text-slate-400 mt-1">Platform genelindeki bayi ve finansal durumunuz.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-[#030917] rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Toplam Bayi</p>
              <h3 className="text-4xl font-black text-white">{stats.totalTenants}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5 flex items-center text-sm text-emerald-400 font-medium">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            <span>Bu ay +3 yeni bayi</span>
          </div>
        </div>

        <div className="bg-[#030917] rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Beklenen Gelir</p>
              <h3 className="text-4xl font-black text-white">
                ₺{stats.monthlyRevenue.toLocaleString('tr-TR')}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5 flex items-center text-sm text-slate-400 font-medium">
            <Activity className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>Düzenli abonelikler</span>
          </div>
        </div>

        <div className="bg-[#030917] rounded-2xl border border-rose-500/20 p-6 relative overflow-hidden group hover:border-rose-500/40 transition-colors shadow-[0_0_15px_rgba(244,63,94,0.05)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none group-hover:bg-rose-500/20 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-rose-500/70 uppercase tracking-wider mb-2">Geciken Ödemeler</p>
              <h3 className="text-4xl font-black text-rose-400">{stats.overduePayments}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5">
            <button className="text-sm text-rose-400 font-semibold hover:text-rose-300 flex items-center gap-1 transition-colors">
              Detayları Gör <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-2xl border border-cyan-500/20 p-6 relative overflow-hidden flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 border border-cyan-500/30">
            <Send className="w-5 h-5 text-cyan-400" />
          </div>
          <h4 className="text-white font-bold mb-1">Toplu Bildirim</h4>
          <p className="text-xs text-slate-400 mb-4">Tüm bayilere anlık duyuru geçin</p>
          <button className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors w-full">
            Duyuru Oluştur
          </button>
        </div>

      </div>

      <div className="bg-[#030917] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Yaklaşan ve Geciken Ödemeler</h2>
            <p className="text-sm text-slate-400">Son 30 gündeki kritik abonelik durumları</p>
          </div>
          <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 border border-white/10">
            <Send className="w-4 h-4" /> Tümüne Hatırlat
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#02050a] border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6">Bayi Adı</th>
                <th className="p-4">Paket</th>
                <th className="p-4">Tutar</th>
                <th className="p-4">Son Ödeme Tarihi</th>
                <th className="p-4">Durum</th>
                <th className="p-4 pr-6 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 pl-6">
                  <div className="font-bold text-white mb-0.5">Konya Teknik Servis</div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">iletisim@konyateknik.com</div>
                </td>
                <td className="p-4 text-sm text-slate-400">Profesyonel</td>
                <td className="p-4 font-bold text-white">₺890,00</td>
                <td className="p-4 text-sm text-rose-400 font-medium">28 Mayıs 2026</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Gecikmiş (2 Gün)
                  </span>
                </td>
                <td className="p-4 pr-6 text-right">
                  <button className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-500/20">
                    Hatırlat
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 pl-6">
                  <div className="font-bold text-white mb-0.5">İstanbul Merkez Bilişim</div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">info@istmerkez.com</div>
                </td>
                <td className="p-4 text-sm text-slate-400">Kurumsal</td>
                <td className="p-4 font-bold text-white">₺1.890,00</td>
                <td className="p-4 text-sm text-slate-300">30 Mayıs 2026</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Bugün
                  </span>
                </td>
                <td className="p-4 pr-6 text-right">
                  <button className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-500/20">
                    Hatırlat
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 pl-6">
                  <div className="font-bold text-white mb-0.5">İzmir Telefon Hastanesi</div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">destek@izmirtelefon.com</div>
                </td>
                <td className="p-4 text-sm text-slate-400">Başlangıç</td>
                <td className="p-4 font-bold text-white">₺390,00</td>
                <td className="p-4 text-sm text-slate-300">05 Haziran 2026</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                    Yaklaşıyor
                  </span>
                </td>
                <td className="p-4 pr-6 text-right">
                  <button className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-500/20">
                    Hatırlat
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
