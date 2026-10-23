import type { ButtonHTMLAttributes } from 'react'
import { pillClassName } from './pillClassName'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid — главное действие на экране (залитая), outline — второстепенное (обводка). */
  variant?: 'solid' | 'outline'
}

/* Кнопка-«таблетка». На странице товара «Оформить заказ» — solid: взгляд сразу падает на главное действие. */
export function PillButton({ className, variant = 'outline', ...rest }: Props) {
  return <button type="button" className={pillClassName(variant, className)} {...rest} />
}
