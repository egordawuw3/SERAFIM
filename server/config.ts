import { resolve } from 'node:path'

const env = process.env

export const config = {
  port: Number(env.PORT) || 3000,
  isProduction: env.NODE_ENV === 'production',
  /** Включать, только если сервер стоит за обратным прокси (nginx, Render, Railway). */
  trustProxy: env.TRUST_PROXY === '1',
  distDir: resolve(env.DIST_DIR ?? 'dist'),
  ordersFile: resolve(env.ORDERS_FILE ?? 'data/orders.jsonl'),
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: env.TELEGRAM_CHAT_ID ?? '',
  },
  /** Количество заявок с одного IP за окно. */
  rateLimit: { max: 5, windowMs: 10 * 60_000 },
} as const

export const telegramConfigured = () => Boolean(config.telegram.token && config.telegram.chatId)
