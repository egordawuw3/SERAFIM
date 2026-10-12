import type { Hono } from 'hono'
import { createApi } from './api.ts'
import { ORDER_RATE_LIMIT, ORDER_RETENTION_DAYS } from './limits.ts'
import type { Order } from './order.ts'

/*
 * Cloudflare Workers: статику (готовые страницы из пререндера, фото, шрифты) Cloudflare отдаёт сам —
 * сюда доходят только /api/* и /catalog (run_worker_first в wrangler.jsonc). Заявки хранятся в D1 (SQLite),
 * устаревшие удаляются по расписанию (triggers.crons). Схема базы — migrations/.
 */

// Минимум типов Cloudflare, которые нам нужны (полный @cloudflare/workers-types конфликтует с типами Node).
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  run(): Promise<unknown>
  first<T>(): Promise<T | null>
}
interface D1Database {
  prepare(query: string): D1PreparedStatement
}
interface Env {
  DB: D1Database
  ASSETS: { fetch(request: Request): Promise<Response> }
  /** Секреты: wrangler secret put TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID. */
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
  /** Адрес сайта после подключения домена, например https://serafim.ru (vars в wrangler.jsonc). */
  SITE_ORIGIN?: string
}

function platformFor(env: Env) {
  return {
    siteOrigin: env.SITE_ORIGIN?.replace(/\/+$/, '') ?? '',
    telegram: { token: env.TELEGRAM_BOT_TOKEN ?? '', chatId: env.TELEGRAM_CHAT_ID ?? '' },
    // Cloudflare сам подставляет настоящий IP посетителя — подделать его клиент не может.
    clientIp: (c: { req: { header(name: string): string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'unknown',
    // Фиксированное окно в одной строке на IP; вставка и счёт атомарны (один запрос), гонок между инстансами нет.
    async allowOrder(ip: string) {
      const now = Date.now()
      const row = await env.DB.prepare(
        `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2 + ?3)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN reset_at <= ?2 THEN 1 ELSE count + 1 END,
           reset_at = CASE WHEN reset_at <= ?2 THEN ?2 + ?3 ELSE reset_at END
         RETURNING count`,
      )
        .bind(ip, now, ORDER_RATE_LIMIT.windowMs)
        .first<{ count: number }>()
      return (row?.count ?? 1) <= ORDER_RATE_LIMIT.max
    },
    async saveOrder(order: Order) {
      await env.DB.prepare('INSERT INTO orders (number, created_at, data) VALUES (?1, ?2, ?3)')
        .bind(order.number, order.createdAt, JSON.stringify(order))
        .run()
    },
  }
}

let api: Hono | undefined

export default {
  fetch(request: Request, env: Env, ctx: unknown): Response | Promise<Response> {
    const { pathname } = new URL(request.url)
    // Всё, что не API, — статика (на случай, если запрос всё же дошёл до Worker).
    if (!pathname.startsWith('/api/') && pathname !== '/catalog') return env.ASSETS.fetch(request)
    // Переменные окружения в Workers постоянны в пределах выкладки — приложение собираем один раз.
    api ??= createApi(platformFor(env))
    return api.fetch(request, env, ctx as never)
  },

  /** Раз в сутки: заявки старше срока из политики конфиденциальности и истёкшие счётчики лимита. */
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const cutoff = new Date(Date.now() - ORDER_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await env.DB.prepare('DELETE FROM orders WHERE created_at < ?1').bind(cutoff).run()
    await env.DB.prepare('DELETE FROM rate_limits WHERE reset_at <= ?1').bind(Date.now()).run()
  },
}
