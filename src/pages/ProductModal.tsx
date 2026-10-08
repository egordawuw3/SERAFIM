import { useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { getProductBySlug } from '@/entities/product/api/productApi'
import type { Product } from '@/entities/product/model/types'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { useEscape } from '@/shared/lib/useEscape'
import { useFocusTrap } from '@/shared/lib/useFocusTrap'
import { useLockBodyScroll } from '@/shared/lib/useLockBodyScroll'
import { ArrowLeft, Close } from '@/shared/ui/icons'
import { ProductView } from '@/widgets/ProductView'

/* Карточка товара поверх каталога (открывается кликом из каталога). */
export function ProductModal() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const product = getProductBySlug(slug)
  if (!product) return <Navigate to="/catalog" replace />
  return <ProductSheet product={product} close={() => navigate(-1)} />
}

function ProductSheet({ product, close }: { product: Product; close: () => void }) {
  useDocumentTitle(product.name)
  const ref = useRef<HTMLDivElement>(null)
  useEscape(close)
  useLockBodyScroll()
  useFocusTrap(ref)

  return (
    <div ref={ref} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="absolute inset-0 animate-fade-in bg-[#0d1110]/70 backdrop-blur-sm" onClick={close} />
      <div className="absolute inset-2 animate-sheet-in overflow-y-auto overscroll-contain rounded-lg bg-white md:inset-3">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 py-4 backdrop-blur md:px-6">
          <button type="button" onClick={close} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink/70 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Назад
          </button>
          <button type="button" onClick={close} aria-label="Закрыть" className="-m-2 p-2 text-ink hover:opacity-60">
            <Close className="h-6 w-6" />
          </button>
        </div>
        <ProductView product={product} />
      </div>
    </div>
  )
}
