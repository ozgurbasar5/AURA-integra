import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'Giriş — AURA İntegra ERP',
  description: 'AURA İntegra ERP sistemine giriş yapın',
}

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 text-sm">Giriş sayfası yükleniyor...</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
