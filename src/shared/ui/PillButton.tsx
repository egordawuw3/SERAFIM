import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid — главное действие на экране (залитая), outline — второстепенное (обводка). */
  variant?: 'solid' | 'outline'
}

const VARIANTS = {
  solid: 'border-ink bg-ink text-paper hover:bg-ink/85',
  outline: 'border-ink text-ink hover:bg-ink hover:text-paper',
}

/* Кнопка-«таблетка». На странице товара «В корзину» — solid: взгляд сразу падает на главное действие. */
export function PillButton({ className, variant = 'outline', ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-lg border px-3.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
