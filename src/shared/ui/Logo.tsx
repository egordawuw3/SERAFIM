import { Link } from 'react-router'
import { site } from '@/shared/config/site'
import { cn } from '@/shared/lib/cn'

/* Текстовый логотип. Когда будет файл логотипа — заменить содержимое на <img>/<svg>. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label={`${site.name} — на главную`}
      className={cn('font-light uppercase tracking-[0.3em]', className)}
    >
      {site.name}
    </Link>
  )
}
