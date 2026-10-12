import { products } from '../src/entities/product/model/catalog.ts'
import type { OrderRequestParsed } from '../src/entities/order/model/schema.ts'
import { site } from '../src/shared/config/site.ts'

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
  customer: Omit<OrderRequestParsed, 'items' | 'consent' | 'offerAccepted'>
  /** Когда покупатель принял оферту. */
  offerAcceptedAt: string
  /** Когда дал отдельное согласие на обработку персональных данных (152-ФЗ: согласие нужно уметь подтвердить). */
  consentAt: string
  /** Редакция документов, на которые соглашался покупатель (дата из site.terms.documentsDate). */
  documentsVersion: string
  lines: OrderLine[]
  total: number
}

export class OrderValidationError extends Error {}

/** Пересчитывает корзину по серверному каталогу: цены и наличие с клиента не принимаются на веру. */
function priceItems(items: OrderRequestParsed['items']): { lines: OrderLine[]; total: number } {
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
function orderNumber(now = new Date()): string {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '')
  // Web Crypto, а не node:crypto: этот код работает и в Node, и в Cloudflare Workers.
  const [a, b] = crypto.getRandomValues(new Uint8Array(2))
  const suffix = ((a << 8) | b).toString(16).padStart(4, '0').toUpperCase()
  return `SRF-${date}-${suffix}`
}

export function createOrder(input: OrderRequestParsed, now = new Date()): Order {
  const { items, consent: _consent, offerAccepted: _offer, ...customer } = input
  const { lines, total } = priceItems(items)
  const at = now.toISOString()
  return {
    number: orderNumber(now),
    createdAt: at,
    offerAcceptedAt: at,
    consentAt: at,
    documentsVersion: site.terms.documentsDate,
    customer,
    lines,
    total,
  }
}
