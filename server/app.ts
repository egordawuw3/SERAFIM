import { getConnInfo } from '@hono/node-server/conninfo'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'
import { orderRequestSchema, type ApiError, type OrderResponse } from '../src/entities/order/model/schema.ts'
import { config, telegramConfigured } from './config.ts'
import { createOrder, OrderValidationError } from './order.ts'
import { createRateLimiter } from './rateLimit.ts'
import { saveOrder } from './storage.ts'
import { formatOrderMessage, sendToTelegram } from './telegram.ts'

const allow = createRateLimiter(config.rateLimit)

function clientIp(c: Parameters<typeof getConnInfo>[0]): string {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  return getConnInfo(c).remote.address ?? 'unknown'
}

export const app = new Hono()

app.use('*', secureHeaders({ contentSecurityPolicy: undefined, crossOriginEmbedderPolicy: false }))

app.get('/api/health', (c) => c.json({ ok: true, telegram: telegramConfigured() }))

app.post('/api/orders', bodyLimit({ maxSize: 32 * 1024 }), async (c) => {
  const body = await c.req.json().catch(() => null)

  // Honeypot: скрытое поле, которое заполняют только боты. Отвечаем «успехом», ничего не делая.
  if (body && typeof body === 'object' && 'website' in body && body.website) {
    return c.json<OrderResponse>({ number: 'SRF-000000-0000', total: 0 }, 201)
  }

  if (!allow(clientIp(c))) {
    return c.json<ApiError>({ error: 'Слишком много заявок. Попробуйте позже или напишите нам в Telegram.' }, 429)
  }

  const parsed = orderRequestSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fields[key] ??= issue.message
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
  console.error('[server]', err)
  return c.json<ApiError>({ error: 'Что-то пошло не так. Попробуйте ещё раз.' }, 500)
})

// Продакшен: отдаём собранный фронтенд, все прочие пути — index.html (SPA).
if (config.isProduction) {
  app.use('/assets/*', serveStatic({ root: config.distDir, onFound: (_p, c) => c.header('cache-control', 'public, max-age=31536000, immutable') }))
  app.use('*', serveStatic({ root: config.distDir }))
  app.get('*', serveStatic({ root: config.distDir, path: 'index.html' }))
}
