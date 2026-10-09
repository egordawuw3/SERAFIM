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

describe('reconcileCart: untrusted localStorage', () => {
  it('clamps quantity and drops malformed entries', () => {
    const items: unknown[] = [
      { ...base, qty: 1e9 },
      { ...base, size: 'L', qty: 2.7 },
      { ...base, size: 'S', qty: -3 },
      { ...base, size: 'XL', qty: '<img src=x onerror=alert(1)>' },
      null,
      'garbage',
      { ...base, productId: 42 },
    ]
    const res = reconcileCart(items, getProductById)
    expect(res.map((i) => [i.size, i.qty])).toEqual([
      ['M', 10],
      ['L', 2],
    ])
  })

  it('keeps only known fields', () => {
    const [item] = reconcileCart([{ ...base, evil: 'x', image: 'javascript:alert(1)' }], getProductById)
    expect(item).not.toHaveProperty('evil')
    expect(item.image).toBe(getProductById('p1')!.colors[0].images[0].src)
  })
})
