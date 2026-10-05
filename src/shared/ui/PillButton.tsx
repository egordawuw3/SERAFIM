import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/* Кнопка-«таблетка» с обводкой, как «В корзину» на карточке товара. */
export function PillButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-lg border border-ink px-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    />
  )
}
