import { z } from 'zod'
import { MAX_ITEM_QTY } from './limits.ts'

/*
 * Схема заявки — общая для формы на сайте и для сервера.
 * Импортирует только zod: файл исполняется и в браузере, и в Node.
 */

export const CONTACT_METHODS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  phone: 'Звонок',
} as const

export type ContactMethod = keyof typeof CONTACT_METHODS

const phoneDigits = (v: string) => v.replace(/\D/g, '')

const orderItemSchema = z.object({
  productId: z.string().min(1).max(64),
  colorId: z.string().min(1).max(64),
  size: z.string().min(1).max(16),
  qty: z.number().int().min(1).max(MAX_ITEM_QTY),
})

export const orderRequestSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(80, 'Слишком длинное имя'),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const n = phoneDigits(v).length
      return n >= 10 && n <= 15
    }, 'Укажите номер телефона'),
  telegram: z
    .string()
    .trim()
    .max(64)
    .transform((v) => v.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''))
    .refine((v) => v === '' || /^[a-zA-Z0-9_]{5,32}$/.test(v), 'Ник в Telegram выглядит неверно'),
  contactMethod: z.enum(Object.keys(CONTACT_METHODS) as [ContactMethod, ...ContactMethod[]]),
  city: z.string().trim().max(80, 'Слишком длинное название'),
  comment: z.string().trim().max(1000, 'Комментарий слишком длинный'),
  items: z.array(orderItemSchema).min(1, 'Корзина пуста').max(30),
  /** Согласие с офертой и политикой обработки персональных данных — сервер его требует и сохраняет. */
  consent: z.literal(true, { error: 'Нужно согласие с офертой и на обработку персональных данных' }),
}).superRefine((v, ctx) => {
  if (v.contactMethod === 'telegram' && !v.telegram) {
    ctx.addIssue({ code: 'custom', path: ['telegram'], message: 'Укажите ник, чтобы мы написали вам в Telegram' })
  }
})

/** Поля формы, ошибки по которым показываются под полем. Остальные — общей ошибкой формы. */
export const ORDER_FORM_FIELDS = ['name', 'phone', 'telegram', 'contactMethod', 'city', 'comment', 'consent'] as const

export type OrderRequest = z.input<typeof orderRequestSchema>
export type OrderRequestParsed = z.output<typeof orderRequestSchema>

export interface OrderResponse {
  number: string
  total: number
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}
