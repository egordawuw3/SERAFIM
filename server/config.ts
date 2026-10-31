import { resolve } from 'node:path'
import { ORDER_RATE_LIMIT, ORDER_RETENTION_DAYS } from './limits.ts'

const env = process.env

export const config = {
  port: Number(env.PORT) || 3000,
  isProduction: env.NODE_ENV === 'production',
  /**
   * Сколько обратных прокси стоит перед сервером (nginx, Render, Railway). 0 — X-Forwarded-For не доверяем.
   * Клиентский IP берётся справа по этому числу: левые записи заголовка присылает сам клиент и может подделать.
   */
  trustProxy: Math.max(0, Math.floor(Number(env.TRUST_PROXY) || 0)),
  /** Адрес сайта, например https://serafim.ru. Если задан — изменяющие запросы с другим Origin отклоняются. */
  siteOrigin: env.SITE_ORIGIN?.replace(/\/+$/, '') ?? '',
  distDir: resolve(env.DIST_DIR ?? 'dist'),
  ordersFile: resolve(env.ORDERS_FILE ?? 'data/orders.jsonl'),
  /** Остатки по размерам (JSON); нет файла — остатки не ведутся. */
  stockFile: resolve(env.STOCK_FILE ?? 'data/stock.json'),
  /** Сколько дней хранить заявки (в политике конфиденциальности — не дольше 3 лет). */
  ordersRetentionDays: Math.max(1, Number(env.ORDERS_RETENTION_DAYS) || ORDER_RETENTION_DAYS),
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: env.TELEGRAM_CHAT_ID ?? '',
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET ?? '',
    adminIds: env.TELEGRAM_ADMIN_IDS ?? '',
  },
  /** Количество заявок с одного IP за окно. */
  rateLimit: { ...ORDER_RATE_LIMIT, maxKeys: 10_000 },
} as const

export const telegramConfigured = () => Boolean(config.telegram.token && config.telegram.chatId)
