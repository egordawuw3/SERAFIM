import { resolve } from 'node:path'

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
  /** Сколько дней хранить заявки (в политике конфиденциальности — не дольше 3 лет). */
  ordersRetentionDays: Math.max(1, Number(env.ORDERS_RETENTION_DAYS) || 3 * 365),
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: env.TELEGRAM_CHAT_ID ?? '',
  },
  /** Количество заявок с одного IP за окно. */
  rateLimit: { max: 5, windowMs: 10 * 60_000, maxKeys: 10_000 },
} as const

export const telegramConfigured = () => Boolean(config.telegram.token && config.telegram.chatId)
