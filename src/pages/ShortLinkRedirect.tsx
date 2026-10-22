import { Navigate, useParams, useSearchParams } from 'react-router'
import { products } from '@/entities/product/model/catalog'

/*
 * Короткая ссылка для переписки: /p/<id или slug>?size=M&order=1. С order=1 — сразу форма заказа с размером,
 * без — карточка товара. Серафим кидает её покупателю, чтобы тот не искал вещь и размер сам.
 */
export function ShortLinkRedirect() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const product = products.find((p) => p.id === id || p.slug === id)
  if (!product) return <Navigate to="/" replace />

  const query = new URLSearchParams({ product: product.slug })
  const color = params.get('color')
  const size = params.get('size')
  if (color) query.set('color', color)
  if (size) query.set('size', size.toUpperCase())
  if (params.get('order') === '1') return <Navigate to={`/checkout?${query}`} replace />

  const productQuery = new URLSearchParams(color ? { color } : {})
  return <Navigate to={`/product/${product.slug}${productQuery.size ? `?${productQuery}` : ''}`} replace />
}
