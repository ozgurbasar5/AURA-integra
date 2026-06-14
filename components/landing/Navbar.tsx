"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <span className="tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-emerald-600">Aura Integra</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Özellikler</Link>
            <Link href="#pricing" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Fiyatlandırma</Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login" className="text-slate-600 hover:text-blue-600 font-medium transition-colors">
              Giriş Yap
            </Link>
            <Link href="/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 group">
              Ücretsiz Dene
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100"
          >
            <div className="px-4 pt-2 pb-6 space-y-4 shadow-lg">
              <Link href="#features" className="block text-slate-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Özellikler</Link>
              <Link href="#pricing" className="block text-slate-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Fiyatlandırma</Link>
              <Link href="#contact" className="block text-slate-600 font-medium" onClick={() => setMobileMenuOpen(false)}>İletişim</Link>
              <hr className="border-slate-100" />
              <div className="flex flex-col space-y-3 pt-2">
                <Link href="/login" className="text-center text-slate-600 font-medium w-full py-2 border border-slate-200 rounded-lg">Giriş Yap</Link>
                <Link href="/register" className="text-center bg-blue-600 text-white font-medium w-full py-2 rounded-lg">Ücretsiz Dene</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
