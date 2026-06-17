import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { TERMS_SECTIONS } from '@/lib/legal-content'

export const metadata = { title: 'Kullanım Şartları — AURA İntegra' }

export default function KullanimSartlariPage() {
  return (
    <LegalPageLayout title="Kullanım Şartları">
      {TERMS_SECTIONS.map(s => (
        <section key={s.title}>
          <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
          <p className="text-slate-600 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  )
}
