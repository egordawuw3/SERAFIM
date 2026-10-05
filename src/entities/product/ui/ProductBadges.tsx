import type { Product } from '../model/types'

const badge = 'px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em]'

export function ProductBadges({ product }: { product: Product }) {
  if (!product.isNew && !product.isPreorder) return null
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1.5">
      {product.isNew && <span className={`${badge} bg-ink text-paper`}>New</span>}
      {product.isPreorder && <span className={`${badge} bg-white/90 text-ink`}>Предзаказ</span>}
    </div>
  )
}
