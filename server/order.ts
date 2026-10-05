import { randomBytes } from 'node:crypto'
import { products } from '../src/entities/product/model/catalog.ts'
import type { OrderRequestParsed } from '../src/entities/order/model/schema.ts'

export interface OrderLine {
  name: string
  color: string
  size: string
  qty: number
  price: number
}

export interface Order {
  number: string
  createdAt: string
  customer: Omit<OrderRequestParsed, 'items'>
  lines: OrderLine[]
  total: number
}

export class OrderValidationError extends Error {}

/** Пересчитывает корзину по серверному каталогу: цены и наличие с клиента не принимаются на веру. */
export function priceItems(items: OrderRequestParsed['items']): { lines: OrderLine[]; total: number } {
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    const color = product?.colors.find((c) => c.id === item.colorId)
    if (!product || !color) throw new OrderValidationError('Один из товаров больше недоступен. Обновите корзину.')
    const size = product.sizes.find((s) => s === item.size)
    if (!size || color.soldOut?.includes(size)) {
      throw new OrderValidationError(`${product.name} (${color.name}, ${item.size}) закончился. Обновите корзину.`)
    }
    return { name: product.name, color: color.name, size, qty: item.qty, price: product.price }
  })
  return { lines, total: lines.reduce((sum, l) => sum + l.price * l.qty, 0) }
}

/** Номер вида SRF-261005-K3F9: дата + случайный суффикс, удобно диктовать по телефону. */
export function orderNumber(now = new Date()): string {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '')
  const suffix = randomBytes(3).toString('hex').slice(0, 4).toUpperCase()
  return `SRF-${date}-${suffix}`
}

export function createOrder(input: OrderRequestParsed, now = new Date()): Order {
  const { items, ...customer } = input
  const { lines, total } = priceItems(items)
  return { number: orderNumber(now), createdAt: now.toISOString(), customer, lines, total }
}
