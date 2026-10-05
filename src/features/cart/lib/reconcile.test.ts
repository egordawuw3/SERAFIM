import { describe, expect, it } from 'vitest'
import { getProductById } from '@/entities/product/api/productApi'
import type { CartItem } from '../model/cart'
import { reconcileCart } from './reconcile'

const base: CartItem = {
  productId: 'p1',
  slug: 'old-slug',
  name: 'Старое название',
  colorId: 'blue',
  colorName: 'Синий',
  size: 'M',
  price: 1,
  image: '/old.svg',
  qty: 2,
}

describe('reconcileCart', () => {
  it('refreshes price and labels from the catalog, keeping quantity', () => {
    const [item] = reconcileCart([base], getProductById)
    const product = getProductById('p1')!
    expect(item).toMatchObject({ price: product.price, name: product.name, slug: product.slug, qty: 2 })
  })

  it('drops unknown products, colors and sold-out sizes', () => {
    const items = [
      { ...base, productId: 'nope' },
      { ...base, colorId: 'nope' },
      { ...base, colorId: 'moss', size: 'XS' }, // XS мха распродан
    ]
    expect(reconcileCart(items, getProductById)).toEqual([])
  })
})
