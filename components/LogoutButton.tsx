'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { purgeTenantStore } from '@/lib/store'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  compact?: boolean
}

export default function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    purgeTenantStore()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
    >
      <LogOut size={16} />
      {!compact && <span>Çıkış Yap</span>}
    </button>
  )
}
