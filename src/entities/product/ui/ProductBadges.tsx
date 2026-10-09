import { isProductSoldOut } from '../lib/availability'
import type { Product } from '../model/types'

const badge = 'px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]'

export function ProductBadges({ product }: { product: Product }) {
  const soldOut = isProductSoldOut(product)
  if (!product.isNew && !product.isPreorder && !soldOut) return null
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1.5">
      {soldOut ? (
        <span className={`${badge} bg-white/90 text-ink`}>Нет в наличии</span>
      ) : (
        <>
          {product.isNew && <span className={`${badge} bg-ink text-paper`}>New</span>}
          {product.isPreorder && <span className={`${badge} bg-white/90 text-ink`}>Предзаказ</span>}
        </>
      )}
    </div>
  )
}
