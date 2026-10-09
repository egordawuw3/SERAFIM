import { findColor, isSizeAvailable } from '@/entities/product/lib/availability'
import type { Product, Size } from '@/entities/product/model/types'
import { MAX_QTY, type CartItem } from '../model/cart'

/**
 * Сверяет сохранённую корзину с актуальным каталогом: убирает снятые с продажи позиции
 * и обновляет цену, название и фото. Вызывается при восстановлении корзины из localStorage.
 * Данные из localStorage не доверенные: позиция пересобирается только из известных полей,
 * количество приводится к целому от 1 до MAX_QTY, мусорные записи отбрасываются.
 */
export function reconcileCart(items: unknown[], lookup: (id: string) => Product | undefined): CartItem[] {
  return items.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Partial<Record<keyof CartItem, unknown>>
    if (typeof item.productId !== 'string' || typeof item.colorId !== 'string' || typeof item.size !== 'string') return []
    if (typeof item.qty !== 'number' || !Number.isFinite(item.qty) || item.qty < 1) return []

    const product = lookup(item.productId)
    const color = product?.colors.find((c) => c.id === item.colorId)
    if (!product || !color) return []
    const size = product.sizes.find((s): s is Size => s === item.size)
    if (!size || !isSizeAvailable(findColor(product, color.id), size)) return []

    return [
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        colorId: color.id,
        colorName: color.name,
        size,
        price: product.price,
        image: color.images[0].src,
        qty: Math.min(MAX_QTY, Math.floor(item.qty)),
      },
    ]
  })
}
