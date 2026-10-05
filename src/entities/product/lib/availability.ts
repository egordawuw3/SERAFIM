import type { Product, ProductColor, Size } from '../model/types'

export const isSizeAvailable = (color: ProductColor, size: Size) =>
  !color.soldOut?.includes(size)

export const firstAvailableSize = (product: Product, color: ProductColor): Size | undefined =>
  product.sizes.find((s) => isSizeAvailable(color, s))

export const findColor = (product: Product, colorId?: string | null): ProductColor =>
  product.colors.find((c) => c.id === colorId) ?? product.colors[0]
