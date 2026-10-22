import { describe, expect, it } from 'vitest'
import { addItem, countItems, itemKey, MAX_QTY, removeItem, setQty, subtotal, type CartItem } from './cart'

const hoodie: CartItem = {
  productId: 'p1',
  slug: 'seraph-zip-hoodie',
  name: 'Зип-худи Seraph',
  colorId: 'blue',
  colorName: 'Глубокий синий',
  size: 'M',
  price: 11990,
  image: '/x.svg',
  qty: 1,
}

describe('cart', () => {
  it('merges the same product, color and size into one line', () => {
    const items = addItem(addItem([], hoodie), { ...hoodie, qty: 2 })
    expect(items).toHaveLength(1)
    expect(items[0].qty).toBe(3)
  })

  it('keeps different sizes as separate lines', () => {
    const items = addItem(addItem([], hoodie), { ...hoodie, size: 'L' })
    expect(items).toHaveLength(2)
    expect(countItems(items)).toBe(2)
  })

  it('caps quantity and removes the line when set below 1', () => {
    const key = itemKey(hoodie)
    let items = setQty([hoodie], key, 99)
    expect(items[0].qty).toBe(MAX_QTY)
    items = setQty(items, key, 0)
    expect(items).toEqual([])
  })

  it('computes subtotal', () => {
    const items = addItem([hoodie], { ...hoodie, size: 'S', qty: 2 })
    expect(subtotal(items)).toBe(11990 * 3)
    expect(subtotal(removeItem(items, itemKey(hoodie)))).toBe(11990 * 2)
  })
})
