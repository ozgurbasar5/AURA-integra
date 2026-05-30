"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Calculator, 
  Wrench, 
  PackageSearch, 
  Users, 
  BarChart3, 
  BellRing 
} from "lucide-react";

const features = [
  {
    id: "muhasebe",
    title: "Ön Muhasebe & Finans",
    description: "Gelir/gider takibi, cari hesaplar, e-fatura entegrasyonu ve otomatik ödeme hatırlatmaları.",
    icon: <Calculator className="w-6 h-6" />,
    color: "bg-blue-500",
    stats: { label: "Günlük İşlem", value: "2.4K+", trend: "+12%" }
  },
  {
    id: "servis",
    title: "Teknik Servis Takibi",
    description: "Cihaz kabul, durum takibi, müşteri SMS bilgilendirmesi ve teknisyen performans raporları.",
    icon: <Wrench className="w-6 h-6" />,
    color: "bg-emerald-500",
    stats: { label: "Aktif Servis", value: "148", trend: "+5%" }
  },
  {
    id: "stok",
    title: "Akıllı Stok Yönetimi",
    description: "Kritik stok uyarıları, çoklu depo yönetimi, barkodlu satış ve hızlı envanter sayımı.",
    icon: <PackageSearch className="w-6 h-6" />,
    color: "bg-amber-500",
    stats: { label: "Kritik Stok", value: "12 Ürün", trend: "-2%" }
  },
  {
    id: "crm",
    title: "Müşteri İlişkileri (CRM)",
    description: "Detaylı müşteri profilleri, KVKK onaylı iletişim izinleri ve sadakat programları.",
    icon: <Users className="w-6 h-6" />,
    color: "bg-purple-500",
    stats: { label: "Yeni Müşteri", value: "45", trend: "+24%" }
  },
  {
    id: "rapor",
    title: "Gerçek Zamanlı Raporlar",
    description: "Saniyeler içinde hazırlanan PDF raporlar, anlık kar/zarar grafikleri ve bayi bazlı analizler.",
    icon: <BarChart3 className="w-6 h-6" />,
    color: "bg-indigo-500",
    stats: { label: "Aylık Büyüme", value: "%18", trend: "Artış" }
  },
  {
    id: "bayi",
    title: "Gelişmiş Bayi Ağı",
    description: "Super Admin yetkisiyle bayileri yönetin. Abonelik durdurma, başlatma ve bölge bazlı izolasyon.",
    icon: <BellRing className="w-6 h-6" />,
    color: "bg-rose-500",
    stats: { label: "Aktif Bayi", value: "34", trend: "+3" }
  }
];

export default function Features() {
  const [activeTab, setActiveTab] = useState(features[0].id);

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-slate-100 to-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            İhtiyacınız Olan Tüm Modüller <br/> Tek Bir Platformda
          </h2>
          <p className="text-lg text-slate-600">
            Farklı programlar arasında kaybolmayın. Aura Integra ile tüm işletme süreçleriniz birbirine entegre ve gerçek zamanlı çalışır.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Feature List */}
          <div className="lg:col-span-5 space-y-2">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`w-full text-left p-5 rounded-2xl transition-all duration-300 flex items-start gap-4 ${
                  activeTab === feature.id
                    ? "bg-white border-2 border-blue-200 shadow-md transform scale-[1.02]"
                    : "bg-transparent border-2 border-transparent hover:bg-white/50"
                }`}
              >
                <div className={`mt-1 p-3 rounded-xl text-white ${feature.color} shadow-lg`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-1 ${activeTab === feature.id ? "text-blue-600" : "text-slate-900"}`}>
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Feature Interactive Display */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-8 relative overflow-hidden h-[500px] flex flex-col">
              <AnimatePresence mode="wait">
                {features.find(f => f.id === activeTab) && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col h-full"
                  >
                    {(() => {
                      const feature = features.find(f => f.id === activeTab)!;
                      return (
                        <>
                          <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                              <div className={`p-4 rounded-2xl text-white ${feature.color}`}>
                                {feature.icon}
                              </div>
                              <div>
                                <h4 className="text-2xl font-bold text-slate-900">{feature.title} Modülü</h4>
                                <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Sistem Aktif (Gerçek Zamanlı)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Mock Dashboard Widget for the active feature */}
                          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-6 relative flex flex-col">
                            <div className="absolute top-6 right-6 text-right">
                              <div className="text-sm text-slate-500">{feature.stats.label}</div>
                              <div className="text-3xl font-bold text-slate-900">{feature.stats.value}</div>
                              <div className={`text-sm font-medium ${feature.stats.trend.startsWith('+') || feature.stats.trend === 'Artış' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {feature.stats.trend}
                              </div>
                            </div>

                            <div className="mt-16 space-y-4 flex-1">
                               {[...Array(3)].map((_, i) => (
                                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></div>
                                     <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                     </div>
                                     <div className="h-8 w-20 bg-blue-50 rounded-lg"></div>
                                  </div>
                               ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
