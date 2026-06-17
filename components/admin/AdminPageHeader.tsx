import type { LucideIcon } from 'lucide-react'

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6" data-tour="admin-page-header">
      <div>
        <h1 className="text-white text-2xl font-black flex items-center gap-2.5">
          {Icon && (
            <span className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
              <Icon size={18} className="text-sky-400" />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="text-zinc-500 text-sm mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function AdminCard({ title, children, className = '', action }: {
  title?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between bg-zinc-900/30">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
