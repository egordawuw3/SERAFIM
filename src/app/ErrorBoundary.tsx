import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center font-mono text-[13px]">
        <p className="font-sans text-2xl font-light uppercase tracking-widest">Что-то пошло не так</p>
        <button type="button" className="link-hover uppercase tracking-[0.15em]" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </div>
    )
  }
}
