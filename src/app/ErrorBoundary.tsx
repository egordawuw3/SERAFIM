import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

const RELOAD_KEY = 'serafim-chunk-reload'

/**
 * Не загрузился чанк страницы: после выкладки новой версии старые файлы с хешами удаляются,
 * и у вкладки, открытой до выкладки, ломается переход на ленивую страницу.
 */
const isChunkLoadError = (error: Error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  )

/** Перезагружаем страницу один раз за минуту — чтобы при настоящей поломке не уйти в бесконечный цикл. */
function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY))
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnce()) return
    console.error(error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center font-mono text-[13px]">
        <p className="font-sans text-2xl font-light uppercase tracking-widest">
          {offline ? 'Нет соединения' : 'Что-то пошло не так'}
        </p>
        {offline && <p className="text-ink/70">Проверьте интернет и обновите страницу</p>}
        <button type="button" className="link-hover min-h-6 uppercase tracking-[0.15em]" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </div>
    )
  }
}
