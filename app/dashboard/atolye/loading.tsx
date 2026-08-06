import { LoadingCenter, PageShell } from '@/components/ui/PageShell'

export default function AtolyeLoading() {
  return (
    <PageShell>
      <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="h-10 w-full max-w-md rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="surface min-h-[320px] flex items-center justify-center">
        <LoadingCenter />
      </div>
    </PageShell>
  )
}
