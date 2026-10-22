import { products } from '../model/catalog.ts'

/**
 * Куда ведёт короткая ссылка /p/<id или slug>?size=M&color=…&order=1: с order=1 — оформление, куда эта вещь
 * добавляется в корзину (?add=…), без — карточка товара. Неизвестный товар — главная. Общая для сервера (редирект 302) и сайта (переход внутри SPA).
 */
export function shortLinkTarget(id: string, params: URLSearchParams): string {
  const product = products.find((p) => p.id === id || p.slug === id)
  if (!product) return '/'
  const color = params.get('color')
  const size = params.get('size')
  if (params.get('order') === '1') {
    const query = new URLSearchParams({ add: product.slug })
    if (color) query.set('color', color)
    if (size) query.set('size', size.toUpperCase())
    return `/checkout?${query}`
  }
  return `/product/${product.slug}${color ? `?${new URLSearchParams({ color })}` : ''}`
}
