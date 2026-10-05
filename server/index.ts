import { serve } from '@hono/node-server'
import { app } from './app.ts'
import { config, telegramConfigured } from './config.ts'

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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
