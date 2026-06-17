import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { KVKK_SECTIONS } from '@/lib/legal-content'

export const metadata = { title: 'KVKK Aydınlatma Metni — AURA İntegra' }

export default function KvkkPage() {
  return (
    <LegalPageLayout title="KVKK Aydınlatma Metni">
      {KVKK_SECTIONS.map(s => (
        <section key={s.title}>
          <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
          <p className="text-slate-600 leading-relaxed">{s.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  )
}
