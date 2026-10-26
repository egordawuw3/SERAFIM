import { z } from 'zod'
import { COUNTRIES, COUNTRY_CODES, normalizePhone } from './countries.ts'
import { MAX_ITEM_QTY } from './limits.ts'

export { normalizeRuPhone } from './countries.ts'

/*
 * Схема заказа — общая для формы на сайте и для сервера. Товары из корзины, доставка СДЭК до пункта выдачи одной посылкой.
 * Импортирует только zod: файл исполняется и в браузере, и на сервере.
 */

/** Пункт выдачи не выбран на карте (СДЭК не ответил) — покупатель описал его сам, продавец оформит доставку вручную. */
export const MANUAL_POINT = 'MANUAL_POINT'

const orderItemSchema = z.object({
  productId: z.string().min(1).max(64),
  colorId: z.string().min(1).max(64),
  size: z.string().min(1).max(16),
  qty: z.number().int().min(1).max(MAX_ITEM_QTY),
})

export const orderRequestSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Корзина пуста').max(30),
  /** Страна доставки; старые версии сайта её не присылают — значит, Россия. */
  country: z.enum(COUNTRY_CODES).default('RU'),
  cityCode: z.number({ error: 'Выберите город' }).int().min(0),
  /** Код ПВЗ СДЭК или MANUAL_POINT, если СДЭК не ответил и покупатель описал пункт сам (deliveryNote). */
  pointCode: z
    .string({ error: 'Выберите пункт выдачи' })
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,32}$/, 'Выберите пункт выдачи'),
  deliveryNote: z.string().trim().max(200, 'Слишком длинно'),
  name: z.string().trim().min(2, 'Укажите имя и фамилию').max(80, 'Слишком длинное имя'),
  /**
   * Похож ли на номер хоть одной страны — проверяется сразу (вместе с остальными полями); номер именно выбранной
   * страны и вид +7… / +375… — ниже, когда известна страна.
   */
  phone: z
    .string()
    .trim()
    .max(32)
    .refine((v) => COUNTRY_CODES.some((c) => normalizePhone(v, c)), 'Укажите номер телефона'),
  telegram: z
    .string()
    .trim()
    .max(64)
    .transform((v) => v.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''))
    .refine((v) => v === '' || /^[a-zA-Z0-9_]{5,32}$/.test(v), 'Ник в Telegram — латиница, цифры и _, от 5 символов, например @serafim_6s'),
  comment: z.string().trim().max(500, 'Комментарий слишком длинный'),
  /** Принятие публичной оферты (договор купли-продажи). */
  offerAccepted: z.literal(true, { error: 'Нужно принять условия оферты' }),
  /**
   * Согласие на обработку персональных данных — отдельно от оферты: с 01.09.2025 (156-ФЗ, ч. 4 ст. 9 152-ФЗ)
   * его нельзя совмещать с другими документами одной галочкой. Сервер требует и сохраняет оба.
   */
  consent: z.literal(true, { error: 'Нужно согласие на обработку персональных данных' }),
}).superRefine((v, ctx) => {
  if (v.pointCode === MANUAL_POINT) {
    if (v.deliveryNote.length < 5) ctx.addIssue({ code: 'custom', path: ['deliveryNote'], message: 'Напишите город и адрес удобного пункта СДЭК' })
  } else if (v.cityCode <= 0) {
    ctx.addIssue({ code: 'custom', path: ['cityCode'], message: 'Выберите город' })
  }
  if (!normalizePhone(v.phone, v.country)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: `Укажите номер: ${COUNTRIES[v.country].phoneExample}` })
  }
  // Беларусь — предоплата переводом: продавец пишет покупателю в Telegram.
  if (COUNTRIES[v.country].payment === 'prepay' && !v.telegram) {
    ctx.addIssue({ code: 'custom', path: ['telegram'], message: 'Укажите ник в Telegram — продавец напишет вам про оплату' })
  }
}).transform((v) => ({ ...v, phone: normalizePhone(v.phone, v.country) ?? v.phone }))

/** Поля формы, ошибки по которым показываются под полем. Остальные — общей ошибкой формы. */
export const ORDER_FORM_FIELDS = [
  'items',
  'cityCode',
  'pointCode',
  'deliveryNote',
  'name',
  'phone',
  'telegram',
  'comment',
  'offerAccepted',
  'consent',
] as const

export type OrderRequest = z.input<typeof orderRequestSchema>
export type OrderRequestParsed = z.output<typeof orderRequestSchema>

/** Как и сколько платит покупатель: при получении (₽ или ₸) или переводом продавцу до отправки (₽). */
export interface OrderPayment {
  method: 'cod' | 'prepay'
  currency: 'RUB' | 'KZT'
  amount: number
}

export interface OrderResponse {
  number: string
  total: number
  /** Сколько заплатить при получении в пункте СДЭК. */
  payOnPickup: number
  payment: OrderPayment
  /** Заказ создан в СДЭК: трек придёт покупателю по смс. false — заказ принят, продавец оформит доставку сам. */
  cdekCreated: boolean
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}
