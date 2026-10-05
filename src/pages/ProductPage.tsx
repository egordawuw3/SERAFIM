import { Link, useParams } from 'react-router'
import { getProductBySlug } from '@/entities/product/api/productApi'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { ArrowLeft } from '@/shared/ui/icons'
import { ProductView } from '@/widgets/ProductView'
import { NotFoundPage } from './NotFoundPage'

/* Карточка товара отдельной страницей — при прямом заходе по ссылке. */
export function ProductPage() {
  const { slug = '' } = useParams()
  const product = getProductBySlug(slug)
  useDocumentTitle(product?.name)
  if (!product) return <NotFoundPage />

  return (
    <div className="mx-3 mb-8 rounded-lg bg-white md:mx-8">
      <div className="px-4 pt-5 md:px-6">
        <Link to="/catalog" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink/70 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Каталог
        </Link>
      </div>
      <ProductView product={product} />
    </div>
  )
}
