'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { hasError: boolean; errorKey: number }

export default class SidebarErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorKey: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState(s => ({ hasError: false, errorKey: s.errorKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <aside
          className="no-print hidden lg:flex flex-col shrink-0 w-[252px] border-r border-white/5"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Menü yüklenemedi. Sayfayı yenileyin veya tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              <RefreshCw size={12} /> Tekrar dene
            </button>
          </div>
        </aside>
      )
    }
    return <div key={this.state.errorKey} className="contents">{this.props.children}</div>
  }
}
