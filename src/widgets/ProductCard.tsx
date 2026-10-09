import { memo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { isColorSoldOut } from '@/entities/product/lib/availability'
import { photoAlt } from '@/entities/product/lib/photoAlt'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import type { Product } from '@/entities/product/model/types'
import { ProductBadges } from '@/entities/product/ui/ProductBadges'
import { ProductPhoto } from '@/entities/product/ui/ProductPhoto'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'
import { prefetch } from '@/shared/lib/prefetch'

/** Ширина карточки в сетке каталога: 2 колонки на телефоне, 4 — от 1024 px. */
const CATALOG_CARD_SIZES = '(min-width: 1024px) 23vw, 46vw'

const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

interface Props {
  product: Product
  /** Цвет, который показать первым (например, выбранный в фильтре). */
  colorId?: string
  /** Ширина карточки на экране — для выбора файла фото из srcset. */
  sizes?: string
  /** Первые карточки в видимой области: грузим сразу и с высоким приоритетом (влияет на LCP). */
  priority?: boolean
  /** Кружки цветов под ценой (в ленте новинок не нужны). */
  showColors?: boolean
  /** В ленте-дубле карточка не должна попадать в порядок Tab и в дерево доступности. */
  inert?: boolean
  /** Уровень заголовка с названием — по месту в иерархии страницы (h2 под h1, h3 под h2). */
  headingLevel?: 2 | 3
}

export const ProductCard = memo(function ProductCard({
  product,
  colorId,
  sizes = CATALOG_CARD_SIZES,
  priority = false,
  showColors = true,
  inert = false,
  headingLevel = 3,
}: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const location = useLocation()
  const { color, selectColor } = useProductSelection(product, colorId)
  // Фото сзади нужно только для эффекта при наведении: монтируем его после первого наведения мышью.
  // На телефонах наведения нет — лишний файл на каждую карточку не скачивается вовсе.
  const [showBack, setShowBack] = useState(false)
  const [front, back] = color.images
  const to = `/product/${product.slug}?color=${color.id}`
  const linkState = { background: location }

  const onIntent = () => {
    prefetch('product')
    if (back && !showBack && canHover()) setShowBack(true)
  }

  return (
    <article
      className="group/card flex flex-col items-center text-center"
      onPointerEnter={onIntent}
      onFocus={onIntent}
      aria-hidden={inert || undefined}
    >
      {/* Картинка — дубль ссылки с названием: убираем её из Tab и из дерева доступности, чтобы не было двух одинаковых ссылок. */}
      <Link
        to={to}
        state={linkState}
        tabIndex={-1}
        aria-hidden
        className="relative mb-5 block aspect-[4/5] w-full overflow-hidden bg-paper-deep"
      >
        <ProductBadges product={product} />
        <ProductPhoto
          image={front}
          alt={photoAlt(product, color, front.view)}
          sizes={sizes}
          priority={priority}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            showBack && 'group-hover/card:opacity-0',
          )}
        />
        {showBack && back && (
          <ProductPhoto
            image={back}
            alt=""
            sizes={sizes}
            loading="eager"
            className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition-[opacity,transform] duration-700 group-hover/card:scale-100 group-hover/card:opacity-100"
          />
        )}
      </Link>

      <Heading className="font-mono text-[14px] font-normal leading-snug md:text-[15px]">
        <Link to={to} state={linkState} tabIndex={inert ? -1 : undefined} className="transition-opacity hover:opacity-60">
          {product.name}
        </Link>
      </Heading>
      <p className="mt-1.5 font-mono text-[16px] font-medium md:text-[18px]">{formatPrice(product.price)}</p>

      {showColors && product.colors.length > 1 && (
        <div className="mt-2 flex" role="group" aria-label={`Цвет: ${product.name}`}>
          {product.colors.map((c) => {
            const soldOut = isColorSoldOut(product, c)
            return (
              // Кнопка 24×24 — минимальная зона касания (WCAG 2.5.8); видимый кружок внутри — 14 px.
              <button
                key={c.id}
                type="button"
                title={soldOut ? `${c.name} — нет в наличии` : c.name}
                aria-label={soldOut ? `${c.name}, нет в наличии` : c.name}
                aria-pressed={c.id === color.id}
                tabIndex={inert ? -1 : undefined}
                onClick={() => selectColor(c.id)}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    'relative h-3.5 w-3.5 overflow-hidden rounded-full border border-ink/15 ring-offset-2 ring-offset-paper transition-shadow',
                    c.id === color.id ? 'ring-1 ring-ink' : 'hover:ring-1 hover:ring-ink/30',
                    soldOut && 'opacity-50',
                  )}
                  style={{ background: c.hex }}
                >
                  {soldOut && <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-45 bg-ink" aria-hidden />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
})
