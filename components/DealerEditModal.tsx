"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { X, Save, Building, User, Crown, Briefcase, Check, Trash2, Loader2 } from "lucide-react";

interface DealerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealer: any;
  onUpdate: () => void;
  technicians: any[];
}

export default function DealerEditModal({ isOpen, onClose, dealer, onUpdate, technicians = [] }: DealerEditModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Form Verileri
  const [formData, setFormData] = useState({
    sirket_adi: "",
    yetkili_kisi: "",
    telefon: "",
    email: "",
    adres: "",
    vergi_no: "",
    subscription_plan: "Standart",
    satis_temsilcisi: "",
    satis_temsilcisi_tel: "",
    satis_temsilcisi_avatar: ""
  });

  useEffect(() => {
    if (dealer) {
      setFormData({
        sirket_adi: dealer.sirket_adi || "",
        yetkili_kisi: dealer.yetkili_kisi || "",
        telefon: dealer.telefon || "",
        email: dealer.email || "",
        adres: dealer.adres || "",
        vergi_no: dealer.vergi_no || "",
        subscription_plan: dealer.subscription_plan || "Standart",
        satis_temsilcisi: dealer.satis_temsilcisi || "",
        satis_temsilcisi_tel: dealer.satis_temsilcisi_tel || "",
        satis_temsilcisi_avatar: dealer.satis_temsilcisi_avatar || ""
      });
    }
  }, [dealer]);

  // Personel Listesinden Seçim
  const handleAssignPersonnel = (person: any) => {
      setFormData({
          ...formData,
          satis_temsilcisi: person.ad_soyad,
          satis_temsilcisi_tel: person.telefon || "0850 123 45 67",
          satis_temsilcisi_avatar: person.avatar_url || "" 
      });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        const { error } = await supabase
            .from('bayi_basvurulari')
            .update({
                sirket_adi: formData.sirket_adi,
                yetkili_kisi: formData.yetkili_kisi,
                telefon: formData.telefon,
                email: formData.email,
                adres: formData.adres,
                vergi_no: formData.vergi_no,
                subscription_plan: formData.subscription_plan,
                satis_temsilcisi: formData.satis_temsilcisi,
                satis_temsilcisi_tel: formData.satis_temsilcisi_tel,
                satis_temsilcisi_avatar: formData.satis_temsilcisi_avatar,
                updated_at: new Date().toISOString()
            })
            .eq('id', dealer.id);

        if (error) throw error;
        
        alert("✅ Bayi bilgileri güncellendi.");
        onUpdate();
        onClose();
    } catch (error: any) {
        alert("Hata: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151921] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0b0e14] rounded-t-3xl">
          <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Building size={20} className="text-cyan-500"/> Bayi Yönetimi
              </h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{formData.sirket_adi}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/20 transition-all"><X size={18}/></button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* 1. Paket Seçimi */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Crown size={14} className="text-amber-500"/> Abonelik Paketi
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {["Standart", "Gold", "Platinum"].map((plan) => (
                        <button
                            key={plan}
                            onClick={() => setFormData({...formData, subscription_plan: plan})}
                            className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                                formData.subscription_plan === plan 
                                ? plan === 'Platinum' ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                                : plan === 'Gold' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                : 'bg-slate-700 text-white border-slate-500'
                                : 'bg-[#0b0e14] text-slate-500 border-white/10 hover:border-white/30'
                            }`}
                        >
                            <span className="uppercase tracking-widest">{plan}</span>
                            {formData.subscription_plan === plan && <Check size={12}/>}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Temsilci Atama */}
            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={14}/> Atanan Müşteri Temsilcisi
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0b0e14] p-4 rounded-xl border border-white/10">
                    
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white/10 shrink-0">
                        {formData.satis_temsilcisi_avatar ? (
                            <img src={formData.satis_temsilcisi_avatar} className="w-full h-full object-cover" />
                        ) : (
                            <User size={24} className="text-slate-500"/>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <input 
                            type="text" 
                            placeholder="Temsilci Adı Soyadı" 
                            className="w-full bg-transparent border-b border-white/10 text-sm text-white font-bold pb-1 outline-none focus:border-cyan-500 transition-colors"
                            value={formData.satis_temsilcisi}
                            onChange={(e) => setFormData({...formData, satis_temsilcisi: e.target.value})}
                        />
                        <input 
                            type="text" 
                            placeholder="Telefon (05XX...)" 
                            className="w-full bg-transparent border-b border-white/10 text-xs text-slate-400 pb-1 outline-none focus:border-cyan-500 transition-colors font-mono"
                            value={formData.satis_temsilcisi_tel}
                            onChange={(e) => setFormData({...formData, satis_temsilcisi_tel: e.target.value})}
                        />
                    </div>

                    {formData.satis_temsilcisi && (
                         <button onClick={() => setFormData({...formData, satis_temsilcisi: "", satis_temsilcisi_tel: "", satis_temsilcisi_avatar: ""})} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                    )}
                </div>

                {technicians.length > 0 && (
                    <div className="mt-2">
                        <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">Personel Listesinden Seç:</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {technicians.map((tech) => (
                                <button 
                                    key={tech.id} 
                                    onClick={() => handleAssignPersonnel(tech)}
                                    className="flex items-center gap-2 px-3 py-2 bg-[#0b0e14] hover:bg-cyan-900/20 border border-white/10 hover:border-cyan-500/50 rounded-lg transition-all shrink-0 group"
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 group-hover:text-cyan-400 overflow-hidden">
                                        {tech.avatar_url ? <img src={tech.avatar_url} className="w-full h-full object-cover"/> : (tech.ad_soyad ? tech.ad_soyad.charAt(0) : "P")}
                                    </div>
                                    <span className="text-xs text-slate-400 group-hover:text-white whitespace-nowrap">{tech.ad_soyad}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Temel Bilgiler */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Şirket Adı</label>
                    <input type="text" className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-all" value={formData.sirket_adi} onChange={e => setFormData({...formData, sirket_adi: e.target.value})}/>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Yetkili Kişi</label>
                    <input type="text" className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-all" value={formData.yetkili_kisi} onChange={e => setFormData({...formData, yetkili_kisi: e.target.value})}/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Telefon</label>
                    <input type="text" className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-all" value={formData.telefon} onChange={e => setFormData({...formData, telefon: e.target.value})}/>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">E-Posta</label>
                    <input type="text" className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Adres</label>
                <textarea className="w-full bg-[#0b0e14] border border-white/10 rounded-xl p-3 text-sm text-white outline-none resize-none h-20 focus:border-cyan-500 transition-all" value={formData.adres} onChange={e => setFormData({...formData, adres: e.target.value})}></textarea>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#0b0e14] rounded-b-3xl">
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                {loading ? "Kaydediliyor..." : "DEĞİŞİKLİKLERİ KAYDET"}
            </button>
        </div>
      </div>
    </div>
  );
}