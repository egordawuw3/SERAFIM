/* Общие для обеих площадок (Node и Cloudflare) правила приёма заявок. */

/** Не больше 5 заявок с одного IP за 10 минут. */
export const ORDER_RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const

/**
 * Ключ лимита по IP. Для IPv6 — подсеть /64: провайдер обычно выдаёт абоненту целый блок /64,
 * и перебором адресов внутри него лимит обходился бы без труда.
 */
export function rateLimitKey(ip: string): string {
  // IPv4, в том числе в виде IPv6 (::ffff:1.2.3.4 — так его часто отдаёт Node), — это отдельный адрес, а не подсеть.
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)?.[1]
  if (v4) return v4
  if (!ip.includes(':')) return ip
  const [head = '', tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const full = ip.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left
  return `${full.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`
}

/** Сколько дней хранить заявки: в политике конфиденциальности — не дольше 3 лет. */
export const ORDER_RETENTION_DAYS = 3 * 365
