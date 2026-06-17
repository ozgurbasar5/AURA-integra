'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'aura_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true)
    } catch { /* SSR */ }
  }, [])

  if (!visible) return null

  function accept() {
    localStorage.setItem(KEY, 'accepted')
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Çerez bildirimi"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-md text-slate-200 shadow-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <p className="text-sm flex-1 leading-relaxed">
          Deneyiminizi iyileştirmek için zorunlu ve analitik çerezler kullanıyoruz.{' '}
          <Link href="/gizlilik-politikasi" className="text-cyan-400 hover:underline">
            Gizlilik Politikası
          </Link>
          {' '}ve{' '}
          <Link href="/kvkk" className="text-cyan-400 hover:underline">
            KVKK metni
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
        >
          Kabul Et
        </button>
      </div>
    </div>
  )
}
