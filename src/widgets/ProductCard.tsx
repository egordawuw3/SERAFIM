import { memo } from 'react'
import { Link, useLocation } from 'react-router'
import type { Product } from '@/entities/product/model/types'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import { ProductBadges } from '@/entities/product/ui/ProductBadges'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'

interface Props {
  product: Product
  /** Цвет, который показать первым (например, выбранный в фильтре). */
  colorId?: string
  /** Первые карточки грузим сразу, остальные — лениво. */
  eager?: boolean
}

export const ProductCard = memo(function ProductCard({ product, colorId, eager }: Props) {
  const location = useLocation()
  // Размер выбирается только в открытой карточке товара; здесь — лишь цвет для превью.
  const { color, selectColor } = useProductSelection(product, colorId)
  const [front, back = front] = color.images
  const to = `/product/${product.slug}?color=${color.id}`
  const linkState = { background: location }
  const loading = eager ? 'eager' : 'lazy'

  return (
    <article className="group/card flex flex-col items-center text-center">
      <Link
        to={to}
        state={linkState}
        className="relative mb-5 block aspect-[4/5] w-full overflow-hidden bg-paper-deep"
        aria-label={`${product.name}, ${color.name.toLowerCase()}`}
      >
        <ProductBadges product={product} />
        <img
          src={front}
          alt={`${product.name}, ${color.name.toLowerCase()}`}
          width={800}
          height={1000}
          loading={loading}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover/card:opacity-0"
        />
        <img
          src={back}
          alt=""
          aria-hidden
          width={800}
          height={1000}
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition-[opacity,transform] duration-700 group-hover/card:scale-100 group-hover/card:opacity-100"
        />
      </Link>

      <Link to={to} state={linkState} className="font-mono text-[14px] leading-snug transition-opacity hover:opacity-60 md:text-[15px]">
        {product.name}
      </Link>
      <p className="mt-1.5 font-mono text-[16px] font-medium md:text-[18px]">{formatPrice(product.price)}</p>

      {product.colors.length > 1 && (
        <div className="mt-3 flex gap-2" role="group" aria-label="Цвет">
          {product.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={c.id === color.id}
              onClick={() => selectColor(c.id)}
              className={cn(
                'h-4 w-4 rounded-full border border-ink/15 ring-offset-2 ring-offset-paper transition-shadow',
                c.id === color.id ? 'ring-1 ring-ink' : 'hover:ring-1 hover:ring-ink/30',
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      )}
    </article>
  )
})
