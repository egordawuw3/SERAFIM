import { Link } from 'react-router'
import { site } from '@/shared/config/site'
import { cn } from '@/shared/lib/cn'

/* Текстовый логотип. Когда будет файл логотипа — заменить содержимое на <img>/<svg>. */
export function Logo({ className, hidden = false }: { className?: string; hidden?: boolean }) {
  return (
    <Link
      to="/"
      aria-label={`${site.name} — на главную`}
      // Спрятанный логотип не должен ловить Tab и озвучиваться: на экране его нет.
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={cn('font-logo font-bold uppercase wordmark', className)}
    >
      {site.name}
    </Link>
  )
}
