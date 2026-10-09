import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getConnInfo } from '@hono/node-server/conninfo'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { compress } from 'hono/compress'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import {
  ORDER_FORM_FIELDS,
  orderRequestSchema,
  type ApiError,
  type OrderResponse,
} from '../src/entities/order/model/schema.ts'
import { config, telegramConfigured } from './config.ts'
import { createOrder, OrderValidationError } from './order.ts'
import { createRateLimiter } from './rateLimit.ts'
import { saveOrder } from './storage.ts'
import { formatOrderMessage, sendToTelegram } from './telegram.ts'

const allow = createRateLimiter(config.rateLimit)

let warnedAboutProxy = false

function clientIp(c: Parameters<typeof getConnInfo>[0]): string {
  const xff = c.req.header('x-forwarded-for')
  if (config.trustProxy) {
    const chain = xff?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
    const forwarded = chain[Math.max(0, chain.length - config.trustProxy)]
    if (forwarded) return forwarded
  } else if (xff && config.isProduction && !warnedAboutProxy) {
    // Похоже, сервер стоит за прокси: без TRUST_PROXY все покупатели делят один IP и один лимит заявок.
    warnedAboutProxy = true
    console.warn('[server] Пришёл X-Forwarded-For, но TRUST_PROXY=0 — лимит заявок считается по IP прокси. Проверьте TRUST_PROXY.')
  }
  return getConnInfo(c).remote.address ?? 'unknown'
}

/*
 * Защита от подделки запросов с чужих сайтов (CSRF): HTML-форма с любого сайта может отправить POST,
 * но только как form-data или text/plain. Поэтому изменяющие запросы принимаем только в JSON
 * (кросс-доменный JSON браузер без разрешения CORS не отправит) и отклоняем всё, что браузер пометил
 * как пришедшее с другого сайта. Серверные уведомления (вебхуки) Sec-Fetch-Site не присылают и проходят.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const guardMutations = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next()
  const fetchSite = c.req.header('sec-fetch-site')
  const origin = c.req.header('origin')
  const crossSite = (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') || (config.siteOrigin && origin && origin !== config.siteOrigin)
  if (crossSite) return c.json<ApiError>({ error: 'Запрос с другого сайта отклонён' }, 403)
  if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
    return c.json<ApiError>({ error: 'Ожидается JSON' }, 415)
  }
  await next()
})

export const app = new Hono()

app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // 'unsafe-inline' — для style={{…}} (кружки цветов в фильтре).
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    crossOriginEmbedderPolicy: false,
    // Без includeSubDomains: иначе все поддомены клиента обязаны работать по HTTPS.
    strictTransportSecurity: 'max-age=15552000',
    permissionsPolicy: { camera: [], microphone: [], geolocation: [], usb: [], bluetooth: [], serial: [], hid: [] },
  }),
)

app.use('/api/*', guardMutations)

app.get('/api/health', (c) => c.json({ ok: true }))

const limitBody = bodyLimit({
  maxSize: 32 * 1024,
  onError: (c) => c.json<ApiError>({ error: 'Слишком большой запрос' }, 413),
})

const formFields = new Set<string>(ORDER_FORM_FIELDS)

app.post('/api/orders', limitBody, async (c) => {
  const body: unknown = await c.req.json().catch(() => null)
  // Honeypot: скрытое поле, которое заполняют только боты. Бот проходит те же проверки и получает
  // правдоподобный ответ — но заявка не сохраняется и не уходит в Telegram.
  const isBot = Boolean(body && typeof body === 'object' && 'website' in body && body.website)

  if (!allow(clientIp(c))) {
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

  await saveOrder(order)

  if (telegramConfigured()) {
    try {
      await sendToTelegram(formatOrderMessage(order))
    } catch (err) {
      // Заявка уже сохранена в файл — покупателю не показываем ошибку, но громко логируем.
      console.error(`[orders] ${order.number}: не удалось отправить в Telegram`, err)
    }
  } else {
    console.info(`[orders] ${order.number} (Telegram не настроен)\n${formatOrderMessage(order)}`)
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

// Продакшен: отдаём собранный фронтенд. Каждая страница — готовый HTML из пререндера (dist/<путь>/index.html,
// serveStatic сам подставляет index.html для адресов без расширения); неизвестные адреса — dist/404.html с кодом 404.
if (config.isProduction) {
  const cache = (value: string) => (_p: string, c: Parameters<typeof getConnInfo>[0]) => c.header('cache-control', value)
  // HTML не кешируем: после выкладки браузер сразу получит ссылки на новые бандлы.
  const htmlNoCache = (path: string, c: Parameters<typeof getConnInfo>[0]) => {
    if (path.endsWith('.html')) c.header('cache-control', 'no-cache')
  }
  let notFoundHtml: string | undefined

  app.use('*', compress())
  // Бандлы с хешем в имени — навсегда; фото и картинки — сутки, потом фоновая перепроверка без ожидания.
  app.use('/assets/*', serveStatic({ root: config.distDir, onFound: cache('public, max-age=31536000, immutable') }))
  app.use('/products/*', serveStatic({ root: config.distDir, onFound: cache('public, max-age=86400, stale-while-revalidate=604800') }))
  app.use('/images/*', serveStatic({ root: config.distDir, onFound: cache('public, max-age=86400, stale-while-revalidate=604800') }))
  app.use('/fonts/*', serveStatic({ root: config.distDir, onFound: cache('public, max-age=2592000, stale-while-revalidate=604800') }))
  app.use('*', serveStatic({ root: config.distDir, onFound: htmlNoCache }))
  app.get('*', async (c) => {
    notFoundHtml ??= await readFile(join(config.distDir, '404.html'), 'utf8')
    c.header('cache-control', 'no-cache')
    return c.html(notFoundHtml, 404)
  })
}
