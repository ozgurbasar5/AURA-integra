"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronRight,
  Tag
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Bayi Yönetimi", href: "/admin/tenants", icon: Users },
    { name: "Abonelik & Ödemeler", href: "/admin/payments", icon: CreditCard },
    { name: "Fiyatlandırma", href: "/admin/pricing", icon: Tag },
    { name: "Ayarlar", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#020712] flex text-slate-200 font-sans">
      <aside className={`fixed inset-y-0 left-0 bg-[#030917] border-r border-white/5 w-72 transition-transform duration-300 z-50 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-black text-lg">A</span>
            </div>
            <div>
              <div className="font-black text-white tracking-tight leading-none text-lg">
                AURA<span className="text-cyan-400">INTEGRA</span>
              </div>
              <div className="text-[9px] text-slate-500 font-bold tracking-widest mt-1">ADMIN PORTAL</div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-4 px-2 uppercase">Ana Menü</div>
          
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? "bg-cyan-500/10 text-cyan-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-cyan-500/50" />}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 bg-[#02050a]/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm text-slate-300">AD</span>
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white truncate">Süper Admin</div>
              <div className="text-xs text-slate-500 truncate">admin@aurabilisim.com</div>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium border border-transparent hover:border-red-500/20">
            <LogOut className="w-4 h-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className={`flex-1 transition-all duration-300 flex flex-col min-h-screen ${sidebarOpen ? "lg:ml-72" : "ml-0"}`}>
        
        <header className="h-20 bg-[#030917]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 absolute left-3 text-slate-500" />
              <input 
                type="text" 
                placeholder="Ara..." 
                className="bg-[#0a1224] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-64 placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#030917]"></span>
            </button>
          </div>
        </header>

        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
