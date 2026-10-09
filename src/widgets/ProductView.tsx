import { useEffect, useState } from 'react'
import { MOCKUP_DISCLAIMER } from '@/entities/product/model/catalog'
import { useSearchParams } from 'react-router'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import type { Product } from '@/entities/product/model/types'
import { ColorSelect } from '@/entities/product/ui/ColorSelect'
import { SizeSelect } from '@/entities/product/ui/SizeSelect'
import { toCartItem } from '@/features/cart/lib/toCartItem'
import { useCart } from '@/features/cart/model/store'
import { formatPrice } from '@/shared/lib/format'
import { useIsClient } from '@/shared/lib/useIsClient'
import { PillButton } from '@/shared/ui/PillButton'
import { ProductGallery } from './ProductGallery'

export function ProductView({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const [params] = useSearchParams()
  // ?color=… из адреса — только после гидратации: в готовом HTML страница товара собрана с основным цветом.
  const isClient = useIsClient()
  const { color, size, selectColor, selectSize } = useProductSelection(product, (isClient && params.get('color')) || undefined)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1800)
    return () => clearTimeout(t)
  }, [added])

  return (
    <div className="grid gap-10 px-4 pb-16 pt-4 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:gap-16 lg:pt-10 xl:pr-[8vw]">
      <ProductGallery product={product} color={color} />

      <div className="font-mono text-[12px] leading-[1.6] text-ink lg:pt-2">
        <h1 className="text-[16px] font-medium leading-snug">{product.name}</h1>
        <p className="mt-1 text-[11px] text-ink/70">Артикул: {color.sku}</p>

        <p className="mt-6 text-[13px]">{formatPrice(product.price)}</p>

        <div className="mt-2 flex w-36 flex-col gap-1.5">
          <SizeSelect product={product} color={color} value={size} onChange={selectSize} />
          <ColorSelect product={product} value={color} onChange={selectColor} />
        </div>

        <PillButton
          className="mt-4"
          disabled={!size}
          onClick={() => {
            if (!size) return
            add(toCartItem(product, color, size))
            setAdded(true)
          }}
        >
          {!size ? 'Нет в наличии' : added ? 'Добавлено ✓' : 'В корзину'}
        </PillButton>

        <section className="mt-8 max-w-[340px] space-y-5">
          <p>Информация →</p>
          <p>{product.shippingNote}</p>
          <ul>
            {product.details.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
          {product.sizeChart && <p>Размерная сетка — на последней фотографии</p>}
          {product.modelNotes && (
            <div>
              {product.modelNotes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          )}
          <p className="text-ink/70">{MOCKUP_DISCLAIMER}</p>
        </section>
      </div>
    </div>
  )
}
