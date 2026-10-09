import { useRef, useState, type KeyboardEvent } from 'react'
import { photoAlt } from '@/entities/product/lib/photoAlt'
import type { Product, ProductColor } from '@/entities/product/model/types'
import { ProductPhoto } from '@/entities/product/ui/ProductPhoto'
import { cn } from '@/shared/lib/cn'
import { ChevronLeft, ChevronRight } from '@/shared/ui/icons'

/** Главное фото — до 640 px в ширину, на телефоне во весь экран. */
const MAIN_SIZES = '(min-width: 768px) 640px, 100vw'
const THUMB_SIZES = '56px'

interface Props {
  product: Product
  color: ProductColor
}

/*
 * Галерея товара: фото выбранного цвета + размерная сетка последней.
 * Скорость: монтируются только уже показанные кадры и соседние — остальные не качаются, пока до них не дошли.
 * Доступность: карусель размечена (aria-roledescription), смена кадра озвучивается, стрелки клавиатуры
 * работают, когда фокус на галерее (а не на всей странице, как раньше).
 */
export function ProductGallery({ product, color }: Props) {
  const images = product.sizeChart ? [...color.images, product.sizeChart] : color.images
  const count = images.length
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState(() => new Set([0, 1]))
  const touchX = useRef<number | null>(null)

  // При смене цвета (нового набора фото) возвращаемся к первому кадру.
  const [prevColor, setPrevColor] = useState(color.id)
  if (prevColor !== color.id) {
    setPrevColor(color.id)
    setIndex(0)
    setSeen(new Set([0, 1]))
  }

  const go = (to: number) => {
    const next = (to + count) % count
    setIndex(next)
    setSeen((s) => (s.has(next) && s.has((next + 1) % count) ? s : new Set([...s, next, (next + 1) % count])))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(index - 1)
    else if (e.key === 'ArrowRight') go(index + 1)
    else return
    e.preventDefault()
  }

  const alts = images.map((img) => photoAlt(product, color, img.view))
  const arrowCls = 'absolute top-1/2 z-10 -translate-y-1/2 p-2 text-ink/70 transition-colors hover:text-ink disabled:opacity-0'

  return (
    <section
      className="flex w-full flex-col"
      aria-roledescription="карусель"
      aria-label={`Фото: ${product.name}`}
    >
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mx-auto aspect-[4/5] w-full max-w-[640px] select-none focus-visible:outline-offset-4"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
      >
        {images.map((img, i) =>
          seen.has(i) ? (
            <div
              key={img.src}
              role="group"
              aria-roledescription="слайд"
              aria-label={`${i + 1} из ${count}`}
              aria-hidden={i !== index}
              className={cn('absolute inset-0 transition-opacity duration-500', i === index ? 'opacity-100' : 'pointer-events-none opacity-0')}
            >
              <ProductPhoto image={img} alt={alts[i]} sizes={MAIN_SIZES} priority={i === 0} className="h-full w-full object-contain" />
            </div>
          ) : null,
        )}
        <button type="button" aria-label="Предыдущее фото" className={cn(arrowCls, 'left-0 md:-left-12')} onClick={() => go(index - 1)} disabled={count < 2}>
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button type="button" aria-label="Следующее фото" className={cn(arrowCls, 'right-0 md:-right-12')} onClick={() => go(index + 1)} disabled={count < 2}>
          <ChevronRight className="h-7 w-7" />
        </button>
        <p className="sr-only" aria-live="polite">
          Фото {index + 1} из {count}: {alts[index]}
        </p>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-[640px] gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Показать фото ${i + 1}: ${alts[i]}`}
            aria-current={i === index}
            className={cn(
              'h-14 w-12 shrink-0 overflow-hidden border transition-colors md:h-16 md:w-14',
              i === index ? 'border-ink/60' : 'border-transparent opacity-70 hover:opacity-100',
            )}
          >
            <ProductPhoto image={img} alt="" sizes={THUMB_SIZES} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  )
}
