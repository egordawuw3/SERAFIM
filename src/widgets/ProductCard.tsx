import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { firstAvailableSize } from '@/entities/product/lib/availability'
import type { Product, Size } from '@/entities/product/model/types'
import { SizeSelect } from '@/entities/product/ui/SizeSelect'
import { toCartItem } from '@/features/cart/lib/toCartItem'
import { useCart } from '@/features/cart/model/store'
import { formatPrice, plural } from '@/shared/lib/format'
import { PillButton } from '@/shared/ui/PillButton'

export function ProductCard({ product }: { product: Product }) {
  const location = useLocation()
  const add = useCart((s) => s.add)
  const color = product.colors[0]
  const [size, setSize] = useState<Size | undefined>(() => firstAvailableSize(product, color))
  const [front, back] = color.images
  const to = `/product/${product.slug}`
  const linkState = { background: location }

  return (
    <article className="group/card flex flex-col">
      <Link
        to={to}
        state={linkState}
        className="relative mb-4 block aspect-[4/5] overflow-hidden bg-paper-deep"
        aria-label={product.name}
      >
        <img
          src={front}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover/card:opacity-0"
        />
        <img
          src={back ?? front}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition-all duration-700 group-hover/card:scale-100 group-hover/card:opacity-100"
        />
        {product.isPreorder && (
          <span className="absolute left-3 top-3 bg-white/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink backdrop-blur">
            Предзаказ
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col font-mono">
        <Link to={to} state={linkState} className="text-[13px] leading-snug hover:opacity-60">
          {product.name}
        </Link>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-[13px]">{formatPrice(product.price)}</p>
          {product.colors.length > 1 && (
            <p className="text-[11px] text-muted">
              {product.colors.length} {plural(product.colors.length, ['цвет', 'цвета', 'цветов'])}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {product.sizes.length > 1 && (
            <SizeSelect product={product} color={color} value={size} onChange={setSize} className="sm:w-24 sm:shrink-0" />
          )}
          <PillButton
            className="sm:flex-1"
            disabled={!size}
            onClick={() => size && add(toCartItem(product, color, size))}
          >
            {size ? 'В корзину' : 'Нет в наличии'}
          </PillButton>
        </div>
      </div>
    </article>
  )
}
