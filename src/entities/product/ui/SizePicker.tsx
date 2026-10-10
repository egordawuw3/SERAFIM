import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { isSizeAvailable } from '../lib/availability'
import type { Product, ProductColor, Size } from '../model/types'

interface Props {
  product: Product
  color: ProductColor
  value: Size | undefined
  onChange: (size: Size) => void
}

/*
 * Выбор размера плашками в ряд — стандарт магазинов одежды: все размеры и наличие видны сразу, без раскрытия списка.
 * Под капотом — настоящие радиокнопки: стрелки клавиатуры, Tab и скринридеры работают без доработок.
 * Проданные размеры зачёркнуты и недоступны, а для скринридера подписаны «нет в наличии».
 */
export function SizePicker({ product, color, value, onChange }: Props) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2">Размер</legend>
      <div className="flex flex-wrap gap-2">
        {product.sizes.map((s) => {
          const available = isSizeAvailable(color, s)
          const checked = value === s
          return (
            <label
              key={s}
              className={cn(
                'relative flex h-10 min-w-12 items-center justify-center rounded-lg border px-3 text-[13px] transition-colors',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2',
                !available && 'cursor-not-allowed border-ink/15 text-ink/40 line-through',
                available && checked && 'border-ink bg-ink text-paper',
                available && !checked && 'cursor-pointer border-ink/25 hover:border-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={s}
                checked={checked}
                disabled={!available}
                onChange={() => onChange(s)}
                className="sr-only"
              />
              {s}
              {!available && <span className="sr-only">, нет в наличии</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
