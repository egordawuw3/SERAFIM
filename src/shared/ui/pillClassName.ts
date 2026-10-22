import { cn } from '@/shared/lib/cn'

const VARIANTS = {
  solid: 'border-ink bg-ink text-paper hover:bg-ink/85',
  outline: 'border-ink text-ink hover:bg-ink hover:text-paper',
}

/** Классы «таблетки» — и для кнопки, и для ссылки, оформленной как кнопка (например, «Купить на Авито»). */
export const pillClassName = (variant: 'solid' | 'outline' = 'outline', className?: string) =>
  cn(
    'inline-flex h-8 items-center justify-center rounded-lg border px-3.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant],
    className,
  )
