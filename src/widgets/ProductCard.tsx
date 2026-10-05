import { memo } from 'react'
import { Link, useLocation } from 'react-router'
import type { Product } from '@/entities/product/model/types'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import { ColorSelect } from '@/entities/product/ui/ColorSelect'
import { ProductBadges } from '@/entities/product/ui/ProductBadges'
import { SizeSelect } from '@/entities/product/ui/SizeSelect'
import { toCartItem } from '@/features/cart/lib/toCartItem'
import { useCart } from '@/features/cart/model/store'
import { formatPrice } from '@/shared/lib/format'
import { PillButton } from '@/shared/ui/PillButton'

interface Props {
  product: Product
  /** Цвет, который показать первым (например, выбранный в фильтре). */
  colorId?: string
  /** Первые карточки грузим сразу, остальные — лениво. */
  eager?: boolean
}

export const ProductCard = memo(function ProductCard({ product, colorId, eager }: Props) {
  const location = useLocation()
  const add = useCart((s) => s.add)
  const { color, size, selectColor, selectSize } = useProductSelection(product, colorId)
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
      <p className="mt-1 font-mono text-[13px] md:text-[14px]">{formatPrice(product.price)}</p>

      <div className="mt-4 flex w-full max-w-[180px] flex-col gap-1.5">
        {product.sizes.length > 1 && <SizeSelect product={product} color={color} value={size} onChange={selectSize} />}
        {product.colors.length > 1 && <ColorSelect product={product} value={color} onChange={selectColor} />}
      </div>

      <PillButton className="mt-4 px-5" disabled={!size} onClick={() => size && add(toCartItem(product, color, size))}>
        {size ? 'В корзину' : 'Нет в наличии'}
      </PillButton>
    </article>
  )
})
