import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import {
  ORDER_FORM_FIELDS,
  orderRequestSchema,
  type ApiError,
  type OrderResponse,
} from '../src/entities/order/model/schema.ts'
import { rateLimitKey } from './limits.ts'
import { createOrder, OrderValidationError, type Order } from './order.ts'
import { SECURITY_HEADERS } from './securityHeaders.ts'
import { formatOrderMessage, sendToTelegram, type TelegramConfig } from './telegram.ts'

/*
 * API магазина без привязки к площадке. Что зависит от неё — хранение заявок, лимит, IP посетителя —
 * передаётся снаружи: Node-сервер (app.ts, Docker) пишет в файл, Cloudflare (worker.ts) — в базу D1.
 */
export interface ApiPlatform {
  /** Адрес сайта, например https://serafim.ru. Если задан — изменяющие запросы с другим Origin отклоняются. */
  siteOrigin: string
  telegram: TelegramConfig
  clientIp(c: Context): string
  /** true — заявка с этого IP укладывается в лимит. */
  allowOrder(ip: string): boolean | Promise<boolean>
  saveOrder(order: Order): Promise<void>
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const formFields = new Set<string>(ORDER_FORM_FIELDS)

export function createApi(platform: ApiPlatform): Hono {
  const app = new Hono()
  const telegramConfigured = Boolean(platform.telegram.token && platform.telegram.chatId)

  app.use('*', async (c, next) => {
    await next()
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.header(name, value)
  })

  /*
   * Защита от подделки запросов с чужих сайтов (CSRF): HTML-форма с любого сайта может отправить POST,
   * но только как form-data или text/plain. Поэтому изменяющие запросы принимаем только в JSON
   * (кросс-доменный JSON браузер без разрешения CORS не отправит) и отклоняем всё, что браузер пометил
   * как пришедшее с другого сайта. Серверные уведомления (вебхуки) Sec-Fetch-Site не присылают и проходят.
   */
  const guardMutations = createMiddleware(async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next()
    const fetchSite = c.req.header('sec-fetch-site')
    const origin = c.req.header('origin')
    const crossSite =
      (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') ||
      (platform.siteOrigin && origin && origin !== platform.siteOrigin)
    if (crossSite) return c.json<ApiError>({ error: 'Запрос с другого сайта отклонён' }, 403)
    if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
      return c.json<ApiError>({ error: 'Ожидается JSON' }, 415)
    }
    await next()
  })
  app.use('/api/*', guardMutations)

  app.get('/api/health', (c) => c.json({ ok: true }))

  // Отдельной страницы каталога больше нет — он на главной. Постоянный редирект: поисковики переносят адрес, фильтры сохраняются.
  app.get('/catalog', (c) => c.redirect(`/${new URL(c.req.url).search}#catalog`, 301))

  const limitBody = bodyLimit({
    maxSize: 32 * 1024,
    onError: (c) => c.json<ApiError>({ error: 'Слишком большой запрос' }, 413),
  })

  app.post('/api/orders', limitBody, async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    // Honeypot: скрытое поле, которое заполняют только боты. Бот проходит те же проверки и получает
    // правдоподобный ответ — но заявка не сохраняется и не уходит в Telegram.
    const isBot = Boolean(body && typeof body === 'object' && 'website' in body && body.website)

    if (!(await platform.allowOrder(rateLimitKey(platform.clientIp(c))))) {
      return c.json<ApiError>({ error: 'Слишком много заявок. Попробуйте позже или напишите нам в Telegram.' }, 429)
    }

    const parsed = orderRequestSchema.safeParse(body)
    if (!parsed.success) {
      // Наружу — только наши сообщения по полям формы; внутренние тексты валидатора не показываем.
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (formFields.has(key)) fields[key] ??= issue.message
        else fields.form ??= 'Не удалось обработать заявку. Обновите страницу и попробуйте ещё раз.'
      }
      return c.json<ApiError>({ error: 'Проверьте поля формы', fields }, 400)
    }

    let order
    try {
      order = createOrder(parsed.data)
    } catch (err) {
      if (err instanceof OrderValidationError) return c.json<ApiError>({ error: err.message }, 409)
      throw err
    }

    if (isBot) return c.json<OrderResponse>({ number: order.number, total: order.total }, 201)

    await platform.saveOrder(order)

    if (telegramConfigured) {
      try {
        await sendToTelegram(formatOrderMessage(order), platform.telegram)
      } catch (err) {
        // Заявка уже сохранена — покупателю не показываем ошибку, но громко логируем.
        console.error(`[orders] ${order.number}: не удалось отправить в Telegram`, err)
      }
    } else {
      // Только номер: логи площадки (панель Cloudflare, журнал Docker) — не место для имён и телефонов.
      console.info(`[orders] ${order.number} сохранена (Telegram не настроен — уведомление не отправлено)`)
    }

    return c.json<OrderResponse>({ number: order.number, total: order.total }, 201)
  })

  app.all('/api/*', (c) => c.json<ApiError>({ error: 'Not found' }, 404))

  app.onError((err, c) => {
    // Штатные ошибки фреймворка (413, 400…) отдаём с их кодом; подробности и стек — только в лог сервера.
    if (err instanceof HTTPException && err.status < 500) {
      return c.json<ApiError>({ error: 'Некорректный запрос' }, err.status)
    }
    console.error('[server]', err)
    return c.json<ApiError>({ error: 'Что-то пошло не так. Попробуйте ещё раз.' }, 500)
  })

  return app
}
