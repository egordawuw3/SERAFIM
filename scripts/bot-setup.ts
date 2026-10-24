/**
 * Подключает бота продавца к сайту: вебхук на /api/telegram с секретом и меню команд.
 * Запуск после выкладки (и после смены токена бота): npm run bot:setup
 * Берёт из .env.preflight: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (тот же, что в Cloudflare), TELEGRAM_CHAT_ID.
 */
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const chatId = process.env.TELEGRAM_CHAT_ID
const site = (process.env.SITE_URL ?? 'https://serafim6s.ru').replace(/\/+$/, '')
if (!token || !secret || !chatId) {
  console.error('Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET и TELEGRAM_CHAT_ID в .env.preflight')
  process.exit(1)
}

async function call(method: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown }
  if (!data.ok) throw new Error(`${method}: ${data.description}`)
  return data.result
}

await call('setWebhook', { url: `${site}/api/telegram`, secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true })
// Меню команд — только в чате продавца, остальным бот ничего не предлагает.
await call('setMyCommands', {
  commands: [
    { command: 'stock', description: 'Остатки по размерам' },
    { command: 'help', description: 'Как пользоваться' },
  ],
  scope: { type: 'chat', chat_id: Number(chatId) },
})
const info = (await call('getWebhookInfo')) as { url: string; last_error_message?: string }
console.log(`✓ вебхук: ${info.url}${info.last_error_message ? ` (последняя ошибка: ${info.last_error_message})` : ''}`)
console.log('✓ меню команд: /stock, /help')
