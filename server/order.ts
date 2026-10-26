import { products } from '../src/entities/product/model/catalog.ts'
import type { Product } from '../src/entities/product/model/types.ts'
import { COUNTRIES, type CountryCode } from '../src/entities/order/model/countries.ts'
import type { OrderPayment, OrderRequestParsed } from '../src/entities/order/model/schema.ts'
import { orderTotals, type OrderTotals } from '../src/entities/order/model/pricing.ts'
import { site } from '../src/shared/config/site.ts'
import type { CdekPackage, CdekPoint, CdekQuote } from './cdek.ts'
import { codAmounts } from './currency.ts'

export interface OrderItem {
  productId: string
  name: string
  color: string
  size: string
  qty: number
  price: number
  /** Артикул: ware_key в СДЭК. */
  sku: string
  /** Сколько штук этого артикула осталось после заказа (если остаток ведётся) — для продавца в Telegram. */
  left?: number
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
  /**
   * created — заказ принят СДЭК; failed — не создан, продавец оформляет вручную; off — СДЭК не подключён;
   * prepay — предоплата (Беларусь): продавец сам берёт оплату и оформляет посылку.
   */
  status: 'created' | 'failed' | 'off' | 'prepay'
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
  items: OrderItem[]
  delivery: OrderDelivery
  totals: OrderTotals
  /** Страна доставки (у заказов до появления стран поля нет — Россия). */
  country?: CountryCode
  /** Как и сколько платит покупатель; rate — тенге за рубль, если платёж в тенге. */
  payment?: OrderPayment & { rate?: number }
  cdek: OrderCdek
  /** Когда из заказа стёрты персональные данные (имя, телефон, Telegram, комментарий, описанный вручную пункт). */
  personalDataRemovedAt?: string
}

/**
 * Обезличенная копия заказа: без имени, телефона, ника, комментария и описанного покупателем пункта.
 * Остаются номер, товары, суммы, код ПВЗ, данные СДЭК и время согласия — по ним видно, что заказ был и согласие дано.
 */
export function anonymize(order: Order, now = new Date()): Order {
  const { note: _note, ...delivery } = order.delivery
  return {
    ...order,
    customer: { name: '', phone: '', telegram: '', comment: '' },
    delivery,
    personalDataRemovedAt: now.toISOString(),
  }
}

/** Данные можно стереть сразу: заказ принят СДЭК и продавец получил его в Telegram. Иначе они нужны для ручного оформления. */
export const canAnonymizeNow = (order: Order, sentToTelegram: boolean) => sentToTelegram && order.cdek.status === 'created'

export class OrderValidationError extends Error {}

/**
 * Артикул для СДЭК (ware_key): по документации API v2 — не длиннее 20 символов, а наш полный артикул
 * (SRF/HD/SALVATION/GREY/XL) длиннее. Короткий и однозначный: товар-цвет-размер, например p4-grey-XL.
 */
export const cdekWareKey = (item: Pick<OrderItem, 'productId' | 'size'> & { colorId: string }) =>
  `${item.productId}-${item.colorId}-${item.size.replace(/\s+/g, '')}`.slice(0, 20)

/** Размер по-человечески — как на сайте: «единый размер» вместо ONE SIZE (Telegram, название позиции в СДЭК). */
export const sizeLabel = (size: string) => (size === 'ONE SIZE' ? 'единый размер' : size)

export interface ResolvedItem {
  product: Product
  item: OrderItem
}

/** Товары по серверному каталогу: цены и наличие с клиента не принимаются на веру. */
export function resolveItems(items: OrderRequestParsed['items']): ResolvedItem[] {
  return items.map((input) => {
    const product = products.find((p) => p.id === input.productId)
    const color = product?.colors.find((c) => c.id === input.colorId)
    if (!product || !color) throw new OrderValidationError('Один из товаров больше недоступен. Обновите корзину.')
    const size = product.sizes.find((s) => s === input.size)
    if (!size || color.soldOut?.includes(size)) {
      throw new OrderValidationError(`${product.name} (${color.name}, ${input.size}) закончился. Обновите корзину.`)
    }
    return {
      product,
      item: { productId: product.id, name: product.name, color: color.name, size, qty: input.qty, price: product.price, sku: `${color.sku}/${size}` },
    }
  })
}

/** Вес и габариты одной вещи в упаковке: свои у товара или значения по умолчанию из конфига. */
export function unitPackage(product: Product): CdekPackage {
  const fallback = site.shipping.defaultPackage
  return {
    weightG: product.weightG ?? fallback.weightG,
    dimsCm: product.dimsCm ?? (fallback.dimsCm as unknown as [number, number, number]),
  }
}

/**
 * Посылка из нескольких вещей: вес — сумма, вещи кладутся стопкой (длина и ширина — наибольшие, высота — сумма).
 * Для расчёта тарифа СДЭК этого достаточно; точнее упакует продавец, вес СДЭК перепроверит при приёме.
 */
export function packageFor(lines: { product: Product; qty: number }[]): CdekPackage {
  let weightG = 0
  let length = 0
  let width = 0
  let height = 0
  for (const { product, qty } of lines) {
    const unit = unitPackage(product)
    weightG += unit.weightG * qty
    length = Math.max(length, unit.dimsCm[0])
    width = Math.max(width, unit.dimsCm[1])
    height += unit.dimsCm[2] * qty
  }
  return { weightG, dimsCm: [length, width, height] }
}

/** Номер вида SRF-261005-K3F9: дата + случайный суффикс, удобно диктовать по телефону. */
function orderNumber(now = new Date()): string {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '')
  // Web Crypto, а не node:crypto: этот код работает и в Node, и в Cloudflare Workers.
  const [a, b] = crypto.getRandomValues(new Uint8Array(2))
  const suffix = ((a << 8) | b).toString(16).padStart(4, '0').toUpperCase()
  return `SRF-${date}-${suffix}`
}

/** Как платит покупатель: Беларусь — переводом до отправки, Казахстан — при получении в тенге, Россия — при получении в рублях. */
export function orderPayment(
  country: CountryCode,
  items: { price: number; qty: number }[],
  totals: OrderTotals,
  kztRate?: number,
): OrderPayment & { rate?: number } {
  if (COUNTRIES[country].payment === 'prepay') return { method: 'prepay', currency: 'RUB', amount: totals.total }
  if (kztRate) return { method: 'cod', currency: 'KZT', amount: codAmounts(items, totals.delivery, kztRate).total, rate: kztRate }
  return { method: 'cod', currency: 'RUB', amount: totals.payOnPickup }
}

export function createOrder(
  input: OrderRequestParsed,
  items: OrderItem[],
  delivery: OrderDelivery,
  cdek: OrderCdek,
  /** Тенге за рубль — для наложенного платежа в Казахстане. */
  kztRate?: number,
  now = new Date(),
): Order {
  const at = now.toISOString()
  const totals = orderTotals(
    items.reduce((sum, i) => sum + i.price * i.qty, 0),
    delivery.quote?.sum ?? 0,
    site.shipping.prepaymentAmount,
  )
  const payment = orderPayment(input.country, items, totals, kztRate)
  return {
    number: orderNumber(now),
    createdAt: at,
    offerAcceptedAt: at,
    consentAt: at,
    documentsVersion: site.terms.documentsDate,
    customer: { name: input.name, phone: input.phone, telegram: input.telegram, comment: input.comment },
    items,
    delivery,
    totals,
    country: input.country,
    payment,
    cdek,
  }
}
