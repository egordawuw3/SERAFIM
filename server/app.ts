import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getConnInfo } from '@hono/node-server/conninfo'
import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'
import { createApi } from './api.ts'
import { deliveryFrom } from './cdek.ts'
import { config } from './config.ts'
import { createRateLimiter } from './rateLimit.ts'
import { CACHE_RULES } from './securityHeaders.ts'
import { memoryStock } from './stock.ts'
import { saveOrder } from './storage.ts'

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

export const app = createApi({
  ...deliveryFrom(process.env),
  // Node-процесс живёт постоянно: фоновой задаче достаточно не потерять ошибку.
  background: (_c, task) => void task.catch((err) => console.error('[orders] фоновая задача', err)),
  siteOrigin: config.siteOrigin,
  telegram: config.telegram,
  clientIp,
  allowOrder: (ip) => allow(ip),
  saveOrder,
  // Учёт остатков ведётся в D1 (Cloudflare); у Node-сервера размеры не ограничены.
  ...memoryStock(),
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
  for (const { prefix, value } of CACHE_RULES) {
    app.use(`${prefix}*`, serveStatic({ root: config.distDir, onFound: cache(value) }))
  }
  app.use('*', serveStatic({ root: config.distDir, onFound: htmlNoCache }))
  app.get('*', async (c) => {
    notFoundHtml ??= await readFile(join(config.distDir, '404.html'), 'utf8')
    c.header('cache-control', 'no-cache')
    return c.html(notFoundHtml, 404)
  })
}
