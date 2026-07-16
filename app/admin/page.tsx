import dynamic from 'next/dynamic'
import { getAdminDataClient } from '@/lib/supabase/admin-data'
import { TrendingUp, AlertTriangle, UserPlus, Building2, CreditCard, LayoutDashboard } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/utils'
import { getPlanLevel, PLAN_LEVEL_LABELS, type PlanLevel } from '@/lib/plan-tiers'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

const AdminRevenueChart = dynamic(() => import('./AdminRevenueChart'), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">Grafik yükleniyor...</div>
  ),
})

const AdminChurnPanel = dynamic(() => import('./AdminChurnPanel'), { ssr: false })
const AdminOpsAlerts = dynamic(() => import('@/components/admin/AdminOpsAlerts'), { ssr: false })
const ModuleMaturityPanel = dynamic(() => import('@/components/admin/ModuleMaturityPanel'), { ssr: false })
const AdminAiCostWidget = dynamic(() => import('@/components/admin/AdminAiCostWidget'), { ssr: false })

interface TenantRow {
  id: string
  status: string
  created_at: string
  subscription_plans?: { name: string } | null
}
interface PaymentRow {
  id: string; amount: number; due_date: string; status: string
  tenants: { company_name: string; email: string } | null
  subscription_plans: { name: string; price: number } | null
}

export default async function AdminDashboardPage() {
  let tenants: TenantRow[] = []
  let payments: PaymentRow[] = []

  try {
    const admin = getAdminDataClient()
    const [tenantsRes, paymentsRes] = await Promise.all([
      admin.from('tenants').select('id, status, created_at, subscription_plans(name)').not('status', 'eq', 'suspended'),
      admin
        .from('tenant_payments')
        .select('id, amount, due_date, status, tenants(company_name, email), subscription_plans(name, price)')
        .order('due_date', { ascending: true })
        .limit(20),
    ])

    tenants = (tenantsRes.data ?? []) as unknown as TenantRow[]
    payments = (paymentsRes.data ?? []) as unknown as PaymentRow[]
  } catch {
    /* service role yok veya Supabase erişilemiyor */
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeCount    = tenants.filter(t => t.status === 'active').length
  const newThisMonth   = tenants.filter(t => new Date(t.created_at) >= monthStart).length

  // Gerçek paket dağılımı (seviye bazlı)
  const planDist: Record<PlanLevel, number> = { 1: 0, 2: 0, 3: 0 }
  for (const t of tenants) {
    const lvl = getPlanLevel(t.subscription_plans?.name)
    planDist[lvl] += 1
  }
  const PLAN_DISTRIBUTION = [
    { name: PLAN_LEVEL_LABELS[1], color: 'bg-zinc-400',    count: planDist[1] },
    { name: PLAN_LEVEL_LABELS[2], color: 'bg-sky-400',  count: planDist[2] },
    { name: PLAN_LEVEL_LABELS[3], color: 'bg-purple-400',  count: planDist[3] },
  ]
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue')
  const overduePayments = payments.filter(p => p.status === 'overdue')
  const monthlyExpected = pendingPayments.reduce((s, p) => s + Number(p.amount), 0)
  const overdueAmount   = overduePayments.reduce((s, p) => s + Number(p.amount), 0)

  const METRICS = [
    { label: 'Aktif Bayi',       value: activeCount,                  icon: Building2,    color: 'text-sky-400',  bg: 'bg-sky-500/10 border-sky-500/20',  sub: `${tenants.length} toplam bayi` },
    { label: 'Bu Ay Beklenen',   value: formatCurrency(monthlyExpected), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', sub: `${pendingPayments.length} ödeme bekliyor` },
    { label: 'Gecikmiş Tutar',   value: formatCurrency(overdueAmount),   icon: AlertTriangle, color: 'text-red-400',  bg: 'bg-red-500/10 border-red-500/20',       sub: `${overduePayments.length} gecikmiş` },
    { label: 'Bu Ay Yeni Bayi',  value: newThisMonth,                 icon: UserPlus,     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',  sub: 'Bu ay kayıt oldu' },
  ]

  return (
    <div className="space-y-8 animate-fade-in-up">
      <AdminPageHeader
        title="Komuta Merkezi"
        description={`${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} — Bayi, ödeme ve operasyon özeti`}
        icon={LayoutDashboard}
      />

      <AdminOpsAlerts />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map(m => {
          const Icon = m.icon
          return (
            <div
              key={m.label}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-5 space-y-4 shadow-lg shadow-black/20"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{m.label}</p>
                  <p className="text-2xl font-black text-white mt-1 tabular-nums">{m.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${m.bg}`}>
                  <Icon size={18} className={m.color} />
                </div>
              </div>
              <p className="text-zinc-500 text-xs">{m.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border border-sky-500/10">
          <h2 className="text-white font-bold text-sm mb-3">Modül Olgunluğu</h2>
          <ModuleMaturityPanel />
        </div>
        <AdminAiCostWidget />
      </div>

      <AdminChurnPanel />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-sky-400" /> Son 30 Gün Gelir Trendi
          </h3>
          <AdminRevenueChart />
        </div>

        <div className="card p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-purple-400" /> Paket Dağılımı
          </h3>
          <div className="space-y-3">
            {PLAN_DISTRIBUTION.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.color}`} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 font-medium">{p.name}</span>
                    <span className="text-zinc-500">{p.count} bayi</span>
                  </div>
                  <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.color} opacity-80`}
                      style={{ width: tenants.length ? `${(p.count / tenants.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
          <h3 className="text-white font-semibold">Yaklaşan & Geciken Ödemeler</h3>
          <a href="/admin/odemeler" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Tümünü Gör →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Bayi</th><th>Paket</th><th>Tutar</th><th>Vade</th><th>Durum</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map(p => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium text-white">{p.tenants?.company_name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{p.tenants?.email}</p>
                  </td>
                  <td className="text-zinc-400">{p.subscription_plans?.name ?? '—'}</td>
                  <td className="font-mono text-white">{formatCurrency(Number(p.amount))}</td>
                  <td className={`font-mono text-xs ${p.status === 'overdue' ? 'text-red-400' : 'text-zinc-400'}`}>{formatDate(p.due_date)}</td>
                  <td>
                    <span className={`badge border ${PAYMENT_STATUS_COLORS[p.status]}`}>
                      {PAYMENT_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td>
                    <a href={`/admin/odemeler`} className="btn btn-sm btn-secondary">İşle</a>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-500">Bekleyen ödeme yok</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
