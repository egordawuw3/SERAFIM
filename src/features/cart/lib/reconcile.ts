import { findColor, isSizeAvailable } from '@/entities/product/lib/availability'
import type { Product, Size } from '@/entities/product/model/types'
import type { CartItem } from '../model/cart'

/**
 * Сверяет сохранённую корзину с актуальным каталогом: убирает снятые с продажи позиции
 * и обновляет цену, название и фото. Вызывается при восстановлении корзины из localStorage.
 */
export function reconcileCart(items: CartItem[], lookup: (id: string) => Product | undefined): CartItem[] {
  return items.flatMap((item) => {
    const product = lookup(item.productId)
    const color = product?.colors.find((c) => c.id === item.colorId)
    if (!product || !color) return []
    const size = product.sizes.find((s): s is Size => s === item.size)
    if (!size || !isSizeAvailable(findColor(product, color.id), size)) return []
    return [{ ...item, slug: product.slug, name: product.name, price: product.price, colorName: color.name, image: color.images[0] }]
  })
}
