import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Logo className="w-10 h-10" />
                <span className="text-2xl font-bold text-white tracking-tight">Aura Integra</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Esnaf ve KOBİ'ler için geliştirilmiş yeni nesil ERP, teknik servis ve ön muhasebe platformu. Tüm süreçlerinizi tek ekrandan yönetin.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Ürün</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Özellikler</a></li>
                <li><a href="#pricing" className="hover:text-blue-400 transition-colors">Fiyatlandırma</a></li>
                <li><a href="/demo" className="hover:text-blue-400 transition-colors">Canlı Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">İletişim</h4>
              <ul className="space-y-2">
                <li><a href="mailto:info@aurabilisim.net" className="hover:text-blue-400 transition-colors">info@aurabilisim.net</a></li>
                <li><a href="tel:+908500000000" className="hover:text-blue-400 transition-colors">0850 000 00 00</a></li>
                <li className="mt-4 text-sm text-slate-500">© 2026 Aura Bilişim Teknolojileri</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
