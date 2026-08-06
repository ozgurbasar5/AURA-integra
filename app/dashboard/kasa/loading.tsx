import { LoadingCenter, PageShell } from '@/components/ui/PageShell'

export default function KasaLoading() {
  return (
    <PageShell>
      <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="surface min-h-[280px] flex items-center justify-center">
        <LoadingCenter />
      </div>
    </PageShell>
  )
}
