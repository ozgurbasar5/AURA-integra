import { LoadingCenter, PageShell } from '@/components/ui/PageShell'

export default function StokLoading() {
  return (
    <PageShell>
      <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="surface min-h-[360px] flex items-center justify-center">
        <LoadingCenter />
      </div>
    </PageShell>
  )
}
