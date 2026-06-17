import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LEGAL_COMPANY } from '@/lib/legal-content'

export default function LegalPageLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{LEGAL_COMPANY.app} · Son güncelleme: {LEGAL_COMPANY.updated}</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8 prose prose-slate">
        {children}
      </main>
      <footer className="max-w-3xl mx-auto px-6 py-8 text-xs text-slate-500 border-t border-slate-200">
        <p>{LEGAL_COMPANY.name} · {LEGAL_COMPANY.email}</p>
        <div className="flex gap-4 mt-2">
          <Link href="/gizlilik-politikasi" className="hover:text-slate-700">Gizlilik</Link>
          <Link href="/kullanim-sartlari" className="hover:text-slate-700">Kullanım Şartları</Link>
          <Link href="/kvkk" className="hover:text-slate-700">KVKK</Link>
        </div>
      </footer>
    </div>
  )
}
