import { products } from '../src/entities/product/model/catalog.ts'
import type { Product } from '../src/entities/product/model/types.ts'
import type { OrderRequestParsed } from '../src/entities/order/model/schema.ts'
import { orderTotals, type OrderTotals } from '../src/entities/order/model/pricing.ts'
import { site } from '../src/shared/config/site.ts'
import type { CdekPackage, CdekPoint, CdekQuote } from './cdek.ts'

export interface OrderItem {
  productId: string
  name: string
  color: string
  size: string
  qty: number
  price: number
  /** Артикул: ware_key в СДЭК. */
  sku: string
}

export interface OrderDelivery {
  cityCode: number
  pointCode: string
  /** Адрес ПВЗ — если СДЭК был доступен при оформлении. */
  point?: Pick<CdekPoint, 'city' | 'address' | 'name' | 'workTime'>
  quote?: CdekQuote
  /** Пункт, описанный покупателем вручную (СДЭК не ответил при оформлении). */
  note?: string
}

export interface OrderCdek {
  /** created — заказ принят СДЭК; failed — не создан, продавец оформляет вручную; off — СДЭК не подключён. */
  status: 'created' | 'failed' | 'off'
  env?: 'test' | 'prod'
  uuid?: string
  number?: string
  error?: string
}

export interface Order {
  number: string
  createdAt: string
  customer: Pick<OrderRequestParsed, 'name' | 'phone' | 'telegram' | 'comment'>
  /** Когда покупатель принял оферту. */
  offerAcceptedAt: string
  /** Когда дал отдельное согласие на обработку персональных данных (152-ФЗ: согласие нужно уметь подтвердить). */
  consentAt: string
  /** Редакция документов, на которые соглашался покупатель (дата из site.terms.documentsDate). */
  documentsVersion: string
  item: OrderItem
  delivery: OrderDelivery
  totals: OrderTotals
  cdek: OrderCdek
}

export class OrderValidationError extends Error {}

/** Товар по серверному каталогу: цена и наличие с клиента не принимаются на веру. */
export function resolveItem(input: Pick<OrderRequestParsed, 'productId' | 'colorId' | 'size' | 'qty'>): { product: Product; item: OrderItem } {
  const product = products.find((p) => p.id === input.productId)
  const color = product?.colors.find((c) => c.id === input.colorId)
  if (!product || !color) throw new OrderValidationError('Этот товар больше недоступен. Обновите страницу.')
  const size = product.sizes.find((s) => s === input.size)
  if (!size || color.soldOut?.includes(size)) {
    throw new OrderValidationError(`${product.name} (${color.name}, ${input.size}) закончился. Выберите другой размер.`)
  }
  return {
    product,
    item: { productId: product.id, name: product.name, color: color.name, size, qty: input.qty, price: product.price, sku: `${color.sku}/${size}` },
  }
}

/** Вес и габариты посылки: свои у товара или значения по умолчанию из конфига. */
export function packageFor(product: Product): CdekPackage {
  const fallback = site.shipping.defaultPackage
  return {
    weightG: product.weightG ?? fallback.weightG,
    dimsCm: product.dimsCm ?? (fallback.dimsCm as unknown as [number, number, number]),
  }
}

/** Номер вида SRF-261005-K3F9: дата + случайный суффикс, удобно диктовать по телефону. */
function orderNumber(now = new Date()): string {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '')
  // Web Crypto, а не node:crypto: этот код работает и в Node, и в Cloudflare Workers.
  const [a, b] = crypto.getRandomValues(new Uint8Array(2))
  const suffix = ((a << 8) | b).toString(16).padStart(4, '0').toUpperCase()
  return `SRF-${date}-${suffix}`
}

export function createOrder(
  input: OrderRequestParsed,
  item: OrderItem,
  delivery: OrderDelivery,
  cdek: OrderCdek,
  now = new Date(),
): Order {
  const at = now.toISOString()
  return {
    number: orderNumber(now),
    createdAt: at,
    offerAcceptedAt: at,
    consentAt: at,
    documentsVersion: site.terms.documentsDate,
    customer: { name: input.name, phone: input.phone, telegram: input.telegram, comment: input.comment },
    item,
    delivery,
    totals: orderTotals(item.price, item.qty, delivery.quote?.sum ?? 0, site.shipping.prepaymentAmount),
    cdek,
  }
}
