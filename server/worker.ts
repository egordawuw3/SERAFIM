import type { Hono } from 'hono'
import { createApi } from './api.ts'
import { deliveryFrom, type DeliveryEnv } from './cdek.ts'
import { ORDER_RATE_LIMIT, ORDER_RETENTION_DAYS, PERSONAL_DATA_RETENTION_DAYS } from './limits.ts'
import type { Order } from './order.ts'
import type { StockLine, StockResult } from './stock.ts'

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
  all<T>(): Promise<{ results: T[] }>
}
interface D1Database {
  prepare(query: string): D1PreparedStatement
}
interface Env extends DeliveryEnv {
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
    ...deliveryFrom(env),
    // Ответ покупателю не ждёт номера СДЭК и Telegram: задача доживает после ответа (до 30 с).
    background: (c: { executionCtx: { waitUntil(p: Promise<unknown>): void } }, task: Promise<unknown>) => c.executionCtx.waitUntil(task),
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
      // Повторное сохранение того же заказа (пришёл номер СДЭК) обновляет запись.
      await env.DB.prepare(
        'INSERT INTO orders (number, created_at, data) VALUES (?1, ?2, ?3) ON CONFLICT(number) DO UPDATE SET data = excluded.data',
      )
        .bind(order.number, order.createdAt, JSON.stringify(order))
        .run()
    },
    async stock() {
      const { results } = await env.DB.prepare('SELECT sku, qty FROM stock').all<{ sku: string; qty: number }>()
      return Object.fromEntries(results.map((r) => [r.sku, r.qty]))
    },
    // Каждая строка списывается атомарно (UPDATE … WHERE qty >= ?), двух последних штук двум покупателям не продать.
    // Если какой-то строки не хватило — уже списанное возвращаем.
    async takeStock(lines: StockLine[]): Promise<StockResult> {
      const taken: StockLine[] = []
      const left: Record<string, number> = {}
      for (const l of lines) {
        const row = await env.DB.prepare('UPDATE stock SET qty = qty - ?2 WHERE sku = ?1 AND qty >= ?2 RETURNING qty')
          .bind(l.sku, l.qty)
          .first<{ qty: number }>()
        if (row) {
          taken.push(l)
          left[l.sku] = row.qty
          continue
        }
        const have = await env.DB.prepare('SELECT qty FROM stock WHERE sku = ?1').bind(l.sku).first<{ qty: number }>()
        if (!have) continue // остаток этого артикула не ведётся
        for (const t of taken) await env.DB.prepare('UPDATE stock SET qty = qty + ?2 WHERE sku = ?1').bind(t.sku, t.qty).run()
        return { ok: false, sku: l.sku, left: have.qty }
      }
      return { ok: true, left }
    },
  }
}

let api: Hono | undefined

export default {
  fetch(request: Request, env: Env, ctx: unknown): Response | Promise<Response> {
    const { pathname } = new URL(request.url)
    // Всё, что не API, — статика (на случай, если запрос всё же дошёл до Worker).
    if (!pathname.startsWith('/api/') && pathname !== '/catalog' && !pathname.startsWith('/p/')) return env.ASSETS.fetch(request)
    // Переменные окружения в Workers постоянны в пределах выкладки — приложение собираем один раз.
    api ??= createApi(platformFor(env))
    return api.fetch(request, env, ctx as never)
  },

  /**
   * Раз в сутки: персональные данные из заказов старше 30 дней (сбойные, которые не обезличились сразу),
   * обезличенные заказы старше 3 лет и истёкшие счётчики лимита.
   */
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const day = 24 * 60 * 60 * 1000
    const pdCutoff = new Date(Date.now() - PERSONAL_DATA_RETENTION_DAYS * day).toISOString()
    await env.DB.prepare(
      `UPDATE orders SET data = json_remove(json_set(data,
         '$.customer', json('{"name":"","phone":"","telegram":"","comment":""}'),
         '$.personalDataRemovedAt', ?2), '$.delivery.note')
       WHERE created_at < ?1 AND json_extract(data, '$.personalDataRemovedAt') IS NULL`,
    )
      .bind(pdCutoff, new Date().toISOString())
      .run()
    const cutoff = new Date(Date.now() - ORDER_RETENTION_DAYS * day).toISOString()
    await env.DB.prepare('DELETE FROM orders WHERE created_at < ?1').bind(cutoff).run()
    await env.DB.prepare('DELETE FROM rate_limits WHERE reset_at <= ?1').bind(Date.now()).run()
  },
}
