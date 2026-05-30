"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";

// Use environment variables or fallback to current keys
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cmkjewcpqohkhnfpvoqw.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNta2pld2NwcW9oa2huZnB2b3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ2MDIsImV4cCI6MjA4MTkyMDYwMn0.HwgnX8tn9ObFCLgStWWSSHMM7kqc9KqSZI96gpGJ6lw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/admin");
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email, 
        password: password 
      });
      
      if (error) throw error;
      
      router.replace("/admin");
    } catch (error: any) {
      console.error("Login Error Details:", error);
      setErrorMsg(error.message || "Giriş başarısız. E-posta veya şifrenizi kontrol edin.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-start mb-10">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center mb-6">
          <Logo className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Aura Integra'ya Giriş
        </h2>
        <p className="text-slate-500 mt-2">
          Bulut tabanlı ERP ve yönetim panelinize erişmek için e-posta ve şifrenizi girin.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">E-posta Adresi</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="email"
              placeholder="ornek@sirket.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-slate-700">Şifre</label>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors">
              Şifremi Unuttum
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100">
            <ShieldAlert size={20} className="shrink-0 text-red-500" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-base"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={20} /> Sisteme Giriliyor...</>
          ) : (
            <>Giriş Yap <ArrowRight size={20} /></>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      
      {/* Left Form Section */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative z-10 bg-white">
        <Suspense
          fallback={
            <div className="w-full max-w-md mx-auto h-[400px] flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </section>

      {/* Right Presentation Section */}
      <section className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative p-12 items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/30 blur-[100px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-emerald-500/20 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold tracking-wide text-blue-100">Güvenli ERP Altyapısı</span>
          </div>
          
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            İşletmenizin <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Tüm Kontrolü
            </span> <br/>
            Sizde.
          </h1>
          
          <p className="text-lg text-slate-300 leading-relaxed mb-10">
            Aura Integra ile ön muhasebe, teknik servis yönetimi, müşteri ilişkileri ve stok takibi hiç olmadığı kadar kolay ve güvenli.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <h4 className="font-bold text-white mb-1">Hızlı Performans</h4>
              <p className="text-sm text-slate-400">Modern bulut teknolojisi</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <h4 className="font-bold text-white mb-1">Gelişmiş Güvenlik</h4>
              <p className="text-sm text-slate-400">Şifreli veri barındırma</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
