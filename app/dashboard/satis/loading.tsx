import { LoadingCenter, PageShell } from '@/components/ui/PageShell'

export default function SatisLoading() {
  return (
    <PageShell>
      <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="surface min-h-[400px] flex items-center justify-center">
        <LoadingCenter />
      </div>
    </PageShell>
  )
}
