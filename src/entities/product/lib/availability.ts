import { stockLeft } from '../model/stock'
import type { Product, ProductColor, Size } from '../model/types'

/** Размер можно заказать: не снят вручную (soldOut) и остаток с сервера не ноль. Компонентам — подписка useStock для перерисовки. */
export const isSizeAvailable = (color: ProductColor, size: Size) =>
  !color.soldOut?.includes(size) && stockLeft(color, size) !== 0

export const firstAvailableSize = (product: Product, color: ProductColor): Size | undefined =>
  product.sizes.find((s) => isSizeAvailable(color, s))

export const findColor = (product: Product, colorId?: string | null): ProductColor =>
  product.colors.find((c) => c.id === colorId) ?? product.colors[0]

/** Цвет полностью раскуплен — ни одного размера в наличии. */
export const isColorSoldOut = (product: Product, color: ProductColor) => !firstAvailableSize(product, color)

/** Товар полностью раскуплен во всех цветах — в каталоге показываем бейдж «Нет в наличии». */
export const isProductSoldOut = (product: Product) => product.colors.every((c) => isColorSoldOut(product, c))
