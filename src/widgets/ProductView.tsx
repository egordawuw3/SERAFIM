import { useEffect, useState } from 'react'
import { MOCKUP_DISCLAIMER } from '@/entities/product/model/catalog'
import { useSearchParams } from 'react-router'
import { isColorSoldOut } from '@/entities/product/lib/availability'
import { useStock } from '@/entities/product/model/stock'
import { useProductSelection } from '@/entities/product/lib/useProductSelection'
import type { Product } from '@/entities/product/model/types'
import { ColorSelect } from '@/entities/product/ui/ColorSelect'
import { SizePicker } from '@/entities/product/ui/SizePicker'
import { FitGuide } from '@/entities/product/ui/FitGuide'
import { SizeTable } from '@/entities/product/ui/SizeTable'
import { toCartItem } from '@/features/cart/lib/toCartItem'
import { useCart } from '@/features/cart/model/store'
import { site } from '@/shared/config/site'
import { formatPrice } from '@/shared/lib/format'
import { useIsClient } from '@/shared/lib/useIsClient'
import { PillButton } from '@/shared/ui/PillButton'
import { pillClassName } from '@/shared/ui/pillClassName'
import { ProductGallery } from './ProductGallery'

export function ProductView({ product }: { product: Product }) {
  const add = useCart((s) => s.add)
  const [params] = useSearchParams()
  // ?color=… из адреса — только после гидратации: в готовом HTML страница товара собрана с основным цветом.
  const isClient = useIsClient()
  const { color, size, selectColor, selectSize } = useProductSelection(product, (isClient && params.get('color')) || undefined)
  useStock((s) => s.left) // перерисовка, когда пришли остатки
  const colorSoldOut = isColorSoldOut(product, color)
  // «Купить на Авито»: ссылка на товар, иначе на профиль продавца, иначе кнопки нет.
  const avitoUrl = product.avitoUrl || site.avitoProfileUrl
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 1800)
    return () => clearTimeout(t)
  }, [added])

  return (
    <div className="grid gap-10 px-4 pb-16 pt-4 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:gap-16 lg:pt-10 xl:pr-[8vw]">
      <ProductGallery product={product} color={color} />

      {/*
       * Иерархия в три уровня: главное (название, цена, заголовки, значения) — text-ink;
       * обычное (описание, списки) — text-ink/85; второстепенное (подписи, сроки, примечания) — text-ink/70
       * (светлее нельзя: ниже нормы контраста WCAG AA).
       */}
      <div className="font-mono text-[12px] leading-[1.6] text-ink/85 lg:pt-2">
        <h1 className="font-sans text-[28px] font-light leading-[1.1] tracking-[-0.02em] text-ink md:text-[34px]">{product.name}</h1>

        {/* Артикул покупателю не показываем — он остаётся только в микроразметке Schema.org (sku). */}
        <p className="mt-5 font-sans text-[24px] font-normal tracking-[-0.01em] text-ink md:text-[26px]">{formatPrice(product.price)}</p>

        {/* Выбор нужен, только когда есть из чего выбирать: один цвет или один размер — просто подпись. */}
        <div className="mt-4 flex flex-col gap-3">
          {product.colors.length > 1 ? (
            <ColorSelect product={product} value={color} onChange={selectColor} className="w-40" />
          ) : (
            <p>
              <span className="text-ink/70">Цвет: </span>
              <span className="text-ink">{color.name.toLowerCase()}</span>
            </p>
          )}
          {product.sizes.length > 1 ? (
            <SizePicker product={product} color={color} value={size} onChange={selectSize} />
          ) : (
            <p>
              <span className="text-ink/70">Размер: </span>
              <span className="text-ink">{product.sizes[0] === 'ONE SIZE' ? 'единый' : product.sizes[0]}</span>
            </p>
          )}
        </div>

        {/* Одна кнопка — «В корзину»; заказ оформляется из корзины. Авито — только если есть ссылка. */}
        <div className="mt-5 flex w-full max-w-[340px] flex-col gap-2.5">
          <PillButton
            variant="solid"
            className="h-12 w-full text-[12px]"
            disabled={!size}
            onClick={() => {
              if (!size) return
              add(toCartItem(product, color, size))
              setAdded(true)
            }}
          >
            {colorSoldOut ? 'Нет в наличии' : !size ? 'Выберите размер' : added ? 'Добавлено ✓' : 'В корзину'}
          </PillButton>
          {avitoUrl && (
            <a href={avitoUrl} target="_blank" rel="noreferrer" className={pillClassName('outline', 'h-11 w-full text-[11px]')}>
              Купить на Авито
            </a>
          )}
        </div>

        <div className="mt-8 max-w-[340px] space-y-7">
          <p className="text-ink/70">{product.shippingNote}</p>

          <section aria-labelledby="product-about">
            <h2 id="product-about" className="mb-2 font-medium uppercase tracking-[0.12em] text-ink">О модели</h2>
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

          <FitGuide product={product} />

          {product.measurements && <SizeTable measurements={product.measurements} caption="Замеры изделия" />}

          {product.care && (
            <section aria-labelledby="product-care">
              <h2 id="product-care" className="mb-2 font-medium uppercase tracking-[0.12em] text-ink">Уход</h2>
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
