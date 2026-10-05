/* Чистая логика корзины — без React и хранилища, легко тестируется. */

import { MAX_ITEM_QTY } from '@/entities/order/model/limits'

export interface CartItem {
  productId: string
  slug: string
  name: string
  colorId: string
  colorName: string
  size: string
  price: number
  image: string
  qty: number
}

export const MAX_QTY = MAX_ITEM_QTY

export const itemKey = (i: Pick<CartItem, 'productId' | 'colorId' | 'size'>) =>
  `${i.productId}:${i.colorId}:${i.size}`

const clampQty = (qty: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(qty)))

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const key = itemKey(item)
  const existing = items.find((i) => itemKey(i) === key)
  if (!existing) return [...items, { ...item, qty: clampQty(item.qty) }]
  return items.map((i) => (itemKey(i) === key ? { ...i, qty: clampQty(i.qty + item.qty) } : i))
}

export function setQty(items: CartItem[], key: string, qty: number): CartItem[] {
  if (qty < 1) return removeItem(items, key)
  return items.map((i) => (itemKey(i) === key ? { ...i, qty: clampQty(qty) } : i))
}

export const removeItem = (items: CartItem[], key: string): CartItem[] =>
  items.filter((i) => itemKey(i) !== key)

export const countItems = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0)

export const subtotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0)
