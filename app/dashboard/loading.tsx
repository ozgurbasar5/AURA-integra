import { LoadingCenter, PageShell } from '@/components/ui/PageShell'

export default function DashboardLoading() {
  return (
    <PageShell>
      <div className="h-32 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="surface min-h-[240px] flex items-center justify-center">
        <LoadingCenter />
      </div>
    </PageShell>
  )
}
