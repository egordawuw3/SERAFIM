import { serve } from '@hono/node-server'
import { app } from './app.ts'
import { config, telegramConfigured } from './config.ts'
import { pruneOrders } from './storage.ts'

if (!telegramConfigured()) {
  const msg = 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы — заявки будут только в логе и в ' + config.ordersFile
  if (config.isProduction) {
    console.error(`[server] ${msg}`)
    process.exit(1)
  }
  console.warn(`[server] ${msg}`)
}

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.info(`[server] http://localhost:${port}`)
})

/* Заявки старше срока из политики конфиденциальности удаляем при старте и раз в сутки. */
const prune = () =>
  pruneOrders()
    .then((n) => n && console.info(`[orders] удалено устаревших заявок: ${n}`))
    .catch((err) => console.error('[orders] не удалось почистить устаревшие заявки', err))
void prune()
setInterval(prune, 24 * 60 * 60 * 1000).unref()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
