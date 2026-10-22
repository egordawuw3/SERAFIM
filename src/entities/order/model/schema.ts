import { z } from 'zod'
import { MAX_ITEM_QTY } from './limits.ts'

/*
 * Схема заказа — общая для формы на сайте и для сервера. Один товар (размер и цвет), доставка СДЭК до пункта выдачи.
 * Импортирует только zod: файл исполняется и в браузере, и на сервере.
 */

/** Пункт выдачи не выбран на карте (СДЭК не ответил) — покупатель описал его сам, продавец оформит доставку вручную. */
export const MANUAL_POINT = 'MANUAL_POINT'

/** Российский номер в виде +7XXXXXXXXXX или null. Принимает 8…, 7…, +7… и 10 цифр без кода страны. */
export function normalizeRuPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('9')) return `+7${digits}`
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return `+7${digits.slice(1)}`
  return null
}

export const orderRequestSchema = z.object({
  productId: z.string().min(1).max(64),
  colorId: z.string().min(1).max(64),
  size: z.string().min(1, 'Выберите размер').max(16),
  qty: z.number().int().min(1).max(MAX_ITEM_QTY),
  cityCode: z.number({ error: 'Выберите город' }).int().min(0),
  /** Код ПВЗ СДЭК или MANUAL_POINT, если СДЭК не ответил и покупатель описал пункт сам (deliveryNote). */
  pointCode: z
    .string({ error: 'Выберите пункт выдачи' })
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,32}$/, 'Выберите пункт выдачи'),
  deliveryNote: z.string().trim().max(200, 'Слишком длинно'),
  name: z.string().trim().min(2, 'Укажите имя и фамилию').max(80, 'Слишком длинное имя'),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const phone = normalizeRuPhone(v)
      if (!phone) ctx.addIssue({ code: 'custom', message: 'Укажите российский номер: +7 900 000-00-00' })
      return phone ?? ''
    }),
  telegram: z
    .string()
    .trim()
    .max(64)
    .transform((v) => v.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''))
    .refine((v) => v === '' || /^[a-zA-Z0-9_]{5,32}$/.test(v), 'Ник в Telegram выглядит неверно'),
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
})

/** Поля формы, ошибки по которым показываются под полем. Остальные — общей ошибкой формы. */
export const ORDER_FORM_FIELDS = [
  'size',
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

export interface OrderResponse {
  number: string
  total: number
  /** Сколько заплатить при получении в пункте СДЭК. */
  payOnPickup: number
  /** Заказ создан в СДЭК: трек придёт покупателю по смс. false — заказ принят, продавец оформит доставку сам. */
  cdekCreated: boolean
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}
