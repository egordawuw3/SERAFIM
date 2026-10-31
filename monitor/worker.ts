/*
 * Мониторинг доступности сайта (wrangler.jsonc рядом). Сбой засчитывается после двух неудачных попыток подряд,
 * чтобы не будить из-за одного потерянного запроса; пока сайт лежит — напоминание раз в час.
 */
interface Env {
  STATE: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void>; delete(key: string): Promise<void> }
  TELEGRAM_BOT_TOKEN: string
  CHECK_URL: string
  ALERT_CHAT_IDS: string
}

const REMIND_MS = 60 * 60_000

async function check(url: string): Promise<string | null> {
  let reason = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'user-agent': 'serafim-monitor' } })
      if (res.ok) return null
      reason = `ответ ${res.status}`
    } catch (err) {
      reason = (err as Error).name === 'TimeoutError' ? 'нет ответа за 10 с' : `ошибка соединения (${(err as Error).message})`
    }
    await new Promise((r) => setTimeout(r, 5_000))
  }
  return reason
}

async function notify(env: Env, text: string) {
  for (const chatId of env.ALERT_CHAT_IDS.split(',').map((s) => s.trim()).filter(Boolean)) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    })
  }
}

export default {
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const failure = await check(env.CHECK_URL)
    const raw = await env.STATE.get('down')
    const down = raw ? (JSON.parse(raw) as { since: number; remindedAt: number }) : null
    const now = Date.now()
    if (failure && !down) {
      await notify(env, `🔴 serafim6s.ru не отвечает: ${failure}`)
      await env.STATE.put('down', JSON.stringify({ since: now, remindedAt: now }))
    } else if (failure && down && now - down.remindedAt >= REMIND_MS) {
      await notify(env, `🔴 serafim6s.ru всё ещё не отвечает (${Math.round((now - down.since) / 60_000)} мин): ${failure}`)
      await env.STATE.put('down', JSON.stringify({ ...down, remindedAt: now }))
    } else if (!failure && down) {
      await notify(env, `🟢 serafim6s.ru снова работает (не отвечал ${Math.round((now - down.since) / 60_000)} мин)`)
      await env.STATE.delete('down')
    }
  },
}
