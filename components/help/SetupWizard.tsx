'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X, ChevronRight, ChevronLeft, Sparkles, Store, MessageSquare, Wallet } from 'lucide-react'
import { getNotificationSettings } from '@/lib/store'
import { getBusinessBranding } from '@/lib/business-branding'
import {
  patchOnboardingFlags,
  readLocalSetupWizardDone,
  writeLocalSetupWizardDone,
} from '@/lib/onboarding/persistence'

const OPEN_EVENT = 'aura-open-setup-wizard'

type Step = 'welcome' | 'brand' | 'sms' | 'kasa' | 'done'

type Props = {
  userId: string
  setupWizardCompleted: boolean
}

export function resetSetupWizard(userId?: string) {
  if (typeof window === 'undefined') return
  if (userId) {
    localStorage.removeItem(`aura_setup_wizard_done_${userId}`)
  } else {
    localStorage.removeItem('aura_setup_wizard_done')
  }
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export default function SetupWizard({ userId, setupWizardCompleted }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('welcome')
  const [dismissed, setDismissed] = useState(setupWizardCompleted)

  const alreadyDone =
    setupWizardCompleted ||
    dismissed ||
    (userId ? readLocalSetupWizardDone(userId) : false)

  useEffect(() => {
    const onReopen = () => {
      setStep('welcome')
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onReopen)
    return () => window.removeEventListener(OPEN_EVENT, onReopen)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !userId || alreadyDone) return
    const s = getNotificationSettings()
    const needsSetup = !s.shop_name?.trim() || s.shop_name === 'AURA İntegra'
    if (needsSetup) {
      const t = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(t)
    }
    // Marka ayarlı — sihirbazı bir daha gösterme
    void persistDone()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, alreadyDone])

  const persistDone = useCallback(async () => {
    if (!userId) return
    writeLocalSetupWizardDone(userId)
    setDismissed(true)
    setOpen(false)
    await patchOnboardingFlags({ setup_wizard_completed: true })
  }, [userId])

  const close = useCallback(() => {
    void persistDone()
  }, [persistDone])

  if (!open || alreadyDone) return null

  const brand = getBusinessBranding()
  const steps: Step[] = ['welcome', 'brand', 'sms', 'kasa', 'done']
  const idx = steps.indexOf(step)

  return (
    <div
      data-aura-setup-wizard
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--bg-border)]">
        <div
          className="px-6 py-5 text-white relative"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
        >
          <button type="button" onClick={close} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={22} />
            <h2 className="text-lg font-black">Kurulum Sihirbazı</h2>
          </div>
          <p className="text-sm text-white/80 mt-1">İlk girişte bir kez — 3 dakikada panelinizi hazırlayın</p>
          <div className="flex gap-1 mt-4">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 'welcome' && (
            <>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                AURA İntegra&apos;ya hoş geldiniz. Bu kısa rehber marka bilgisi, SMS ve kasa ayarlarını
                yapmanıza yardımcı olur — yalnızca ilk girişinizde gösterilir.
              </p>
              <ul className="text-sm space-y-2 text-[var(--text-primary)]">
                <li className="flex gap-2"><Store size={16} className="text-[var(--accent)] shrink-0" /> Mağaza adı ve logo</li>
                <li className="flex gap-2"><MessageSquare size={16} className="text-[var(--accent)] shrink-0" /> Netgsm SMS bağlantısı</li>
                <li className="flex gap-2"><Wallet size={16} className="text-[var(--accent)] shrink-0" /> Sabah kasa / vardiya</li>
              </ul>
            </>
          )}

          {step === 'brand' && (
            <>
              <h3 className="font-bold text-[var(--text-primary)]">1. Marka & Mağaza</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Ayarlar → Genel bölümünden <strong>mağaza adı</strong>, telefon ve adres girin.
                Servis fişi ve WhatsApp mesajlarında bu bilgiler görünür.
              </p>
              {brand.shopName && brand.shopName !== 'AURA İntegra' && (
                <p className="text-xs text-emerald-600 font-semibold">Mevcut: {brand.shopName}</p>
              )}
              <Link href="/dashboard/ayarlar" onClick={close} className="text-sm text-[var(--accent)] font-semibold hover:underline">
                Ayarlara git →
              </Link>
            </>
          )}

          {step === 'sms' && (
            <>
              <h3 className="font-bold text-[var(--text-primary)]">2. SMS (Netgsm)</h3>
              <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
                <li>Netgsm&apos;de kurumsal hesap + onaylı gönderici başlığı</li>
                <li>Ayarlar → Entegrasyonlar → Netgsm bilgilerini kaydet</li>
                <li>Bildirimler → Otomatik SMS açık olsun</li>
                <li>Hızlı Kabul ile test SMS gönderin</li>
              </ol>
              <Link href="/dashboard/nasil-calisir" onClick={close} className="text-sm text-[var(--accent)] font-semibold hover:underline">
                Detaylı SMS rehberi →
              </Link>
            </>
          )}

          {step === 'kasa' && (
            <>
              <h3 className="font-bold text-[var(--text-primary)]">3. Kasa & Vardiya</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Her sabah <strong>Kasa → Vardiya Aç</strong> ile kasadaki nakit tutarını girin.
                Gün sonunda vardiya kapatıp detaylı Z raporu alın.
              </p>
              <Link href="/dashboard/kasa" onClick={close} className="text-sm text-[var(--accent)] font-semibold hover:underline">
                Kasa sayfasına git →
              </Link>
            </>
          )}

          {step === 'done' && (
            <>
              <h3 className="font-bold text-[var(--text-primary)]">Hazırsınız!</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Modüllerin nasıl çalıştığını öğrenmek için interaktif rehbere göz atın.
              </p>
              <Link href="/dashboard/nasil-calisir" onClick={close} className="btn-primary inline-flex text-sm">
                Nasıl Çalışır? rehberi
              </Link>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2 px-6 py-4 border-t border-[var(--bg-border)]">
          <button
            type="button"
            onClick={() => setStep(steps[Math.max(0, idx - 1)])}
            disabled={idx === 0}
            className="btn-secondary btn-sm flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Geri
          </button>
          {step === 'done' ? (
            <button type="button" onClick={close} className="btn-primary btn-sm">
              Başla
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(steps[Math.min(steps.length - 1, idx + 1)])}
              className="btn-primary btn-sm flex items-center gap-1"
            >
              İleri <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
