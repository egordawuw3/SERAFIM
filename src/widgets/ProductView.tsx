import { useEffect, useState } from 'react'
import { MOCKUP_DISCLAIMER } from '@/entities/product/model/catalog'
import { useSearchParams } from 'react-router'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import type { Product } from '@/entities/product/model/types'
import { ColorSelect } from '@/entities/product/ui/ColorSelect'
import { SizeSelect } from '@/entities/product/ui/SizeSelect'
import { SizeTable } from '@/entities/product/ui/SizeTable'
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

        <p className="mt-6 text-[18px] font-medium">{formatPrice(product.price)}</p>

        {/* Выбор нужен, только когда есть из чего выбирать: один цвет или один размер — просто подпись. */}
        <div className="mt-3 flex w-40 flex-col gap-1.5">
          {product.sizes.length > 1 ? (
            <SizeSelect product={product} color={color} value={size} onChange={selectSize} />
          ) : (
            <p>Размер: {product.sizes[0] === 'ONE SIZE' ? 'единый' : product.sizes[0]}</p>
          )}
          {product.colors.length > 1 ? <ColorSelect product={product} value={color} onChange={selectColor} /> : <p>Цвет: {color.name.toLowerCase()}</p>}
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

        <div className="mt-8 max-w-[340px] space-y-7">
          <p>{product.shippingNote}</p>

          <section aria-labelledby="product-about">
            <h2 id="product-about" className="mb-2 uppercase tracking-[0.12em]">О модели</h2>
            <ul className="space-y-0.5">
              {product.details.map((d) => (
                <li key={d}>• {d}</li>
              ))}
              {product.composition && <li>• Состав: {product.composition}</li>}
              {product.country && <li>• Производство: {product.country}</li>}
            </ul>
            {product.modelNotes?.map((n) => (
              <p key={n} className="mt-2">
                {n}
              </p>
            ))}
          </section>

          {product.measurements && <SizeTable measurements={product.measurements} caption="Размерная сетка" />}

          {product.care && (
            <section aria-labelledby="product-care">
              <h2 id="product-care" className="mb-2 uppercase tracking-[0.12em]">Уход</h2>
              <ul className="space-y-0.5">
                {product.care.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-ink/70">{MOCKUP_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  )
}
