import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const SUPABASE_URL = "https://cmkjewcpqohkhnfpvoqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNta2pld2NwcW9oa2huZnB2b3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ2MDIsImV4cCI6MjA4MTkyMDYwMn0.HwgnX8tn9ObFCLgStWWSSHMM7kqc9KqSZI96gpGJ6lw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function Pricing() {
  // Veritabanından abonelik planlarını çek
  const { data: dbPlans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true });

  // Fallback (Yedek) Planlar (Eğer veritabanında henüz plan yoksa)
  const defaultPlans = [
    {
      name: "Başlangıç",
      price_monthly: 390,
      features: [
        "Tek Kullanıcı",
        "Tek Şube Yönetimi",
        "Sınırsız Servis Kaydı",
        "Temel Muhasebe",
        "5 GB Depolama",
        "E-Posta Desteği"
      ]
    },
    {
      name: "Profesyonel",
      price_monthly: 890,
      features: [
        "5 Kullanıcıya Kadar",
        "3 Şube Yönetimi",
        "Tüm Modüllere Erişim",
        "Müşteri Portali (E-Panel)",
        "20 GB Depolama",
        "WhatsApp & SMS Entegrasyonu",
        "Öncelikli Telefon Desteği"
      ]
    },
    {
      name: "Kurumsal (Bayi Ağı)",
      price_monthly: 1890,
      features: [
        "Sınırsız Kullanıcı",
        "Sınırsız Şube & Bayi",
        "Super Admin Paneli",
        "Özel API Erişimi",
        "White-label (Kendi Markanız)",
        "100 GB Depolama",
        "7/24 Özel Temsilci"
      ]
    }
  ];

  const plansToRender = dbPlans && dbPlans.length > 0 ? dbPlans : defaultPlans;

  // Ortadaki (veya "Pro" içeren) planı vurgula
  const getHighlighted = (planName: string, index: number) => {
    return planName.toLowerCase().includes('pro') || index === 1;
  };

  return (
    <section id="pricing" className="py-24 bg-slate-50 relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Şeffaf ve Esnek Fiyatlandırma
          </h2>
          <p className="text-lg text-slate-600">
            İşletmenizin büyüklüğüne göre ölçeklenebilen planlar. Gizli ücret yok, iptal etmesi kolay.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plansToRender.map((plan, index) => {
            const isHighlighted = getHighlighted(plan.name, index);
            
            // Eğer özellikler JSON string ise parse et
            let featuresList = plan.features || [];
            if (typeof featuresList === 'string') {
              try {
                featuresList = JSON.parse(featuresList);
              } catch(e) {
                featuresList = [];
              }
            }

            return (
              <div 
                key={index}
                className={`rounded-3xl p-8 relative flex flex-col transition-transform hover:-translate-y-2 ${
                  isHighlighted 
                    ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-600/30 ring-4 ring-blue-600 ring-offset-4" 
                    : "bg-white border border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50"
                }`}
              >
                {isHighlighted && (
                  <div className="absolute top-0 right-8 -translate-y-1/2">
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                      En Çok Tercih Edilen
                    </span>
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${isHighlighted ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm h-12 ${isHighlighted ? "text-blue-100" : "text-slate-500"}`}>
                    Tüm işletme ihtiyaçlarınıza uygun tam donanımlı paket içerikleri.
                  </p>
                </div>

                <div className="mb-8 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">₺{plan.price_monthly}</span>
                  <span className={`text-lg font-medium ${isHighlighted ? "text-blue-200" : "text-slate-500"}`}>
                    / ay
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {featuresList.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${isHighlighted ? "text-emerald-300" : "text-emerald-500"}`} />
                      <span className={isHighlighted ? "text-blue-50 font-medium" : "text-slate-600 font-medium"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/login" 
                  className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
                    isHighlighted
                      ? "bg-white text-blue-600 hover:bg-slate-50 shadow-lg"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                  }`}
                >
                  Hemen Başla
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
