import type { Product, ProductColor, Size } from '@/entities/product/model/types'
import type { CartItem } from '../model/cart'

export const toCartItem = (product: Product, color: ProductColor, size: Size, qty = 1): CartItem => ({
  productId: product.id,
  slug: product.slug,
  name: product.name,
  colorId: color.id,
  colorName: color.name,
  size,
  price: product.price,
  image: color.images[0],
  qty,
})
