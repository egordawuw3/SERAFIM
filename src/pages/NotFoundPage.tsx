import { Link } from 'react-router'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Страница не найдена')
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center font-mono">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">404</p>
      <h1 className="font-sans text-2xl font-light uppercase tracking-widest">Страница не найдена</h1>
      <Link to="/catalog" className="link-hover text-[12px] uppercase tracking-[0.15em]">
        Перейти в каталог →
      </Link>
    </section>
  )
}
