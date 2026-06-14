"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { X, Save, Lock, User, Camera, Loader2, Mail, Shield } from "lucide-react";

interface AyarlarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdate: () => void;
}

export default function AyarlarModal({ isOpen, onClose, user, onUpdate }: AyarlarModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [sifre, setSifre] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal açıldığında verileri çek
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user, isOpen]);

  // Dosya Seçme ve Yükleme İşlemi
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    
    // KRİTİK: Dosya ismine tarih ekleyerek benzersiz yapıyoruz.
    // Bu sayede URL değişir ve tarayıcı eski resmi göstermez.
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);

    try {
      // 1. Storage'a Yükle
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Yeni Public URL'i Al
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Veritabanını Güncelle
      const { error: dbError } = await supabase
        .from('personel_izinleri')
        .update({ avatar_url: publicUrl })
        .eq('email', user.email);

      if (dbError) throw dbError;

      // 4. State Güncelle
      setAvatarUrl(publicUrl);
      
      alert("Profil resmi güncellendi! Sayfa yenileniyor...");
      onUpdate(); // Layout'u tetikler ve sayfayı yeniler

    } catch (error: any) {
      console.error('Upload hatası:', error);
      alert('Resim yüklenirken hata oluştu: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Bilgileri Kaydetme
  const handleSave = async () => {
    setLoading(true);
    try {
      if (sifre) {
        if (sifre.length < 6) {
          alert("Şifre en az 6 karakter olmalıdır.");
          setLoading(false);
          return;
        }
        const { error: passError } = await supabase.auth.updateUser({ password: sifre });
        if (passError) throw passError;
        alert("Şifre başarıyla değiştirildi.");
      } else {
        // Sadece resim değiştiyse de buraya düşebilir
        alert("İşlem tamamlandı.");
      }

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-white font-bold flex items-center gap-2">
            <User size={18} className="text-cyan-400"/> PROFİL AYARLARI
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* AVATAR YÜKLEME ALANI */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-900 shadow-xl relative flex items-center justify-center">
                 {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                        <Loader2 className="animate-spin text-cyan-400" />
                    </div>
                 ) : avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                 ) : (
                    <User size={40} className="text-slate-600" />
                 )}
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-full shadow-lg border-4 border-[#0f172a] transition-all z-30 cursor-pointer hover:scale-110"
                title="Fotoğraf Yükle"
                disabled={uploading}
              >
                <Camera size={18} />
              </button>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-500">Değiştirmek için kamera ikonuna tıkla</p>
          </div>

          {/* BİLGİ ALANLARI */}
          <div className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 ml-1">
                   <Mail size={12}/> E-POSTA ADRESİ
                </label>
                <input type="text" value={user?.email || ""} disabled className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 rounded-xl px-4 py-3 text-sm cursor-not-allowed select-none"/>
             </div>

             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 ml-1">
                   <Shield size={12}/> YETKİ SEVİYESİ
                </label>
                <div className="w-full bg-slate-900/50 border border-slate-800 text-cyan-500 font-mono text-xs rounded-xl px-4 py-3 uppercase tracking-wider">
                   {user?.rol || "STANDART KULLANICI"}
                </div>
             </div>

             <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 ml-1">
                   <Lock size={12}/> YENİ ŞİFRE (Opsiyonel)
                </label>
                <input 
                  type="password" 
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="Değiştirmek istemiyorsan boş bırak..." 
                  className="w-full bg-[#020617] border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                />
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900/50 p-4 border-t border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 text-xs font-bold hover:text-white hover:bg-white/5 transition-colors">İPTAL</button>
          <button onClick={handleSave} disabled={loading || uploading} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
            KAYDET & GÜNCELLE
          </button>
        </div>

      </div>
    </div>
  );
}