'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react'
import { AuraLogo } from './AuraLogo'

type NavbarProps = {
  onOpenDemo?: () => void
}

const NAV_LINKS = [
  { label: 'Ürün', href: '#akis' },
  { label: 'Çözümler', href: '#servis' },
  { label: 'Nasıl Çalışır?', href: '#nasil-calisir' },
  { label: 'Fiyatlar', href: '#paketler' },
  { label: 'Kaynaklar', href: '#guvenlik' },
  { label: 'Kurumsal', href: '#kurumsal' },
]

export function LandingNavbar({ onOpenDemo }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm shadow-slate-900/5'
          : 'bg-[#f4f7fb]/80 backdrop-blur-sm border-b border-slate-200/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="shrink-0 flex items-center focus:outline-none" aria-label="AURA İntegra Anasayfa">
          <AuraLogo size="md" variant="dark" product="integra" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-slate-600 hover:text-[#0e8fad] transition-colors relative py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm font-bold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-lg hover:bg-slate-100/80 transition-colors"
          >
            Giriş
          </Link>
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e8fad] hover:bg-[#0c7a94] text-white text-sm font-bold shadow-md shadow-[#0e8fad]/20 hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Demo Talep Et
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenDemo}
            className="sm:hidden px-3 py-1.5 rounded-lg bg-[#0e8fad] text-white text-xs font-bold shadow-sm"
          >
            Demo
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-200/60 focus:outline-none transition-colors"
            aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl px-5 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <nav className="flex flex-col space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold text-slate-800 hover:text-[#0e8fad] py-2 border-b border-slate-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenDemo?.()
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0e8fad] text-white text-sm font-bold shadow-md"
            >
              Demo Talep Et
              <ArrowRight size={16} />
            </button>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Giriş Yap
            </Link>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Multi-Tenant & RLS Korumalı Bulut Altyapısı</span>
          </div>
        </div>
      )}
    </header>
  )
}
