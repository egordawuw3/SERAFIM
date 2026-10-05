import { useEffect, useState } from 'react'
import { MOCKUP_DISCLAIMER } from '@/entities/product/model/catalog'
import { findColor, firstAvailableSize, isSizeAvailable } from '@/entities/product/lib/availability'
import type { Product, Size } from '@/entities/product/model/types'
import { SizeSelect } from '@/entities/product/ui/SizeSelect'
import { toCartItem } from '@/features/cart/lib/toCartItem'
import { useCart } from '@/features/cart/model/store'
import { formatPrice } from '@/shared/lib/format'
import { PillButton } from '@/shared/ui/PillButton'
import { Select } from '@/shared/ui/Select'
import { ProductGallery } from './ProductGallery'

export function ProductView({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const [colorId, setColorId] = useState(product.colors[0].id)
  const color = findColor(product, colorId)
  const [size, setSize] = useState<Size | undefined>(() => firstAvailableSize(product, color))
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1800)
    return () => clearTimeout(t)
  }, [added])

  const changeColor = (id: string) => {
    const next = findColor(product, id)
    setColorId(next.id)
    if (!size || !isSizeAvailable(next, size)) setSize(firstAvailableSize(product, next))
  }

  const images = product.sizeChart ? [...color.images, product.sizeChart] : color.images

  return (
    <div className="grid gap-10 px-4 pb-16 pt-4 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:gap-16 lg:pt-10 xl:pr-[8vw]">
      <ProductGallery images={images} alt={`${product.name}, ${color.name.toLowerCase()}`} />

      <div className="font-mono text-[12px] leading-[1.6] text-ink lg:pt-2">
        <h1 className="text-[16px] font-medium leading-snug">{product.name}</h1>
        <p className="mt-1 text-[11px] text-ink/45">Артикул: {color.sku}</p>

        <p className="mt-6 text-[13px]">{formatPrice(product.price)}</p>

        <div className="mt-2 flex w-36 flex-col gap-1.5">
          <SizeSelect product={product} color={color} value={size} onChange={setSize} />
          <Select
            label="Цвет"
            value={color.id}
            onChange={changeColor}
            options={product.colors.map((c) => ({ value: c.id, label: c.name }))}
          />
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
          <p className="text-ink/60">{MOCKUP_DISCLAIMER}</p>
        </section>
      </div>
    </div>
  )
}
