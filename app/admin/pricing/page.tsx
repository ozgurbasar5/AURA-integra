"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

// Initialize Supabase client
const SUPABASE_URL = "https://cmkjewcpqohkhnfpvoqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNta2pld2NwcW9oa2huZnB2b3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ2MDIsImV4cCI6MjA4MTkyMDYwMn0.HwgnX8tn9ObFCLgStWWSSHMM7kqc9KqSZI96gpGJ6lw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number;
  max_branches: number;
  features: string | string[]; // Can be stringified JSON or array
  is_active: boolean;
};

export default function PricingAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    
    if (data) {
      const parsedPlans = data.map(p => ({
        ...p,
        features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || [])
      }));
      setPlans(parsedPlans);
    }
    setLoading(false);
  };

  const handleUpdate = async (plan: Plan) => {
    setSaving(plan.id);
    const updateData = {
      name: plan.name,
      price_monthly: plan.price_monthly,
      max_users: plan.max_users,
      max_branches: plan.max_branches,
      features: JSON.stringify(plan.features)
    };

    const { error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', plan.id);
      
    setSaving(null);
    if (!error) {
      alert("Plan başarıyla güncellendi!");
    } else {
      alert("Hata oluştu: " + error.message);
    }
  };

  const handleChange = (id: string, field: string, value: any) => {
    setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFeatureChange = (id: string, index: number, value: string) => {
    setPlans(plans.map(p => {
      if (p.id === id) {
        const newFeatures = [...(p.features as string[])];
        newFeatures[index] = value;
        return { ...p, features: newFeatures };
      }
      return p;
    }));
  };

  const addFeature = (id: string) => {
    setPlans(plans.map(p => {
      if (p.id === id) {
        return { ...p, features: [...(p.features as string[]), "Yeni Özellik"] };
      }
      return p;
    }));
  };

  const removeFeature = (id: string, index: number) => {
    setPlans(plans.map(p => {
      if (p.id === id) {
        const newFeatures = [...(p.features as string[])];
        newFeatures.splice(index, 1);
        return { ...p, features: newFeatures };
      }
      return p;
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Fiyatlandırma Yönetimi</h1>
        <p className="text-slate-400">Açılış sayfasındaki paketleri ve fiyatları buradan düzenleyebilirsiniz.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-[#030917] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Plan Adı</label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => handleChange(plan.id, 'name', e.target.value)}
                  className="w-full bg-[#0a1224] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Aylık Fiyat (₺)</label>
                <input
                  type="number"
                  value={plan.price_monthly}
                  onChange={(e) => handleChange(plan.id, 'price_monthly', parseFloat(e.target.value))}
                  className="w-full bg-[#0a1224] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Maks. Kullanıcı</label>
                  <input
                    type="number"
                    value={plan.max_users}
                    onChange={(e) => handleChange(plan.id, 'max_users', parseInt(e.target.value))}
                    className="w-full bg-[#0a1224] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Maks. Şube</label>
                  <input
                    type="number"
                    value={plan.max_branches}
                    onChange={(e) => handleChange(plan.id, 'max_branches', parseInt(e.target.value))}
                    className="w-full bg-[#0a1224] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-400">Özellikler (Maddeler)</label>
                  <button onClick={() => addFeature(plan.id)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    <Plus size={14} /> Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {(plan.features as string[]).map((feature, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(plan.id, idx, e.target.value)}
                        className="flex-1 bg-[#0a1224] border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button onClick={() => removeFeature(plan.id, idx)} className="text-red-400 hover:text-red-300 p-1.5 bg-white/5 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleUpdate(plan)}
              disabled={saving === plan.id}
              className="mt-6 w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {saving === plan.id ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
              Kaydet ve Güncelle
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
