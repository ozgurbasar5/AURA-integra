import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { PRIVACY_SECTIONS } from '@/lib/legal-content'

export const metadata = { title: 'Gizlilik Politikası — AURA İntegra' }

export default function GizlilikPolitikasiPage() {
  return (
    <LegalPageLayout title="Gizlilik Politikası">
      {PRIVACY_SECTIONS.map(s => (
        <section key={s.title}>
          <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
          <p className="text-slate-600 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  )
}
