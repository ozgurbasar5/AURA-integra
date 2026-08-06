'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { hasError: boolean; errorKey: number }

export default class MainContentErrorBoundary extends Component<Props, State> {
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
        <div className="flex items-center justify-center min-h-[50vh] p-6">
          <div className="max-w-md w-full surface p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Sayfa yüklenirken bir hata oluştu.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-sky-600 hover:text-sky-500"
            >
              <RefreshCw size={14} /> Tekrar dene
            </button>
          </div>
        </div>
      )
    }
    return <div key={this.state.errorKey} className="contents">{this.props.children}</div>
  }
}
