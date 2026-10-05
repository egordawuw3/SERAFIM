import { CONTACT_METHODS } from '../src/entities/order/model/schema.ts'
import { config } from './config.ts'
import type { Order } from './order.ts'

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

export function formatOrderMessage(order: Order): string {
  const c = order.customer
  const phoneHref = `tel:${c.phone.replace(/[^\d+]/g, '')}`
  const rows = [
    `<b>Новая заявка ${order.number}</b>`,
    '',
    `<b>Имя:</b> ${escapeHtml(c.name)}`,
    `<b>Телефон:</b> <a href="${phoneHref}">${escapeHtml(c.phone)}</a>`,
    c.telegram ? `<b>Telegram:</b> @${escapeHtml(c.telegram)}` : null,
    `<b>Связаться через:</b> ${CONTACT_METHODS[c.contactMethod]}`,
    c.city ? `<b>Город:</b> ${escapeHtml(c.city)}` : null,
    c.comment ? `<b>Комментарий:</b> ${escapeHtml(c.comment)}` : null,
    '',
    ...order.lines.map(
      (l) => `• ${escapeHtml(l.name)} — ${escapeHtml(l.color)}, ${escapeHtml(l.size)} × ${l.qty} = ${rub(l.price * l.qty)}`,
    ),
    '',
    `<b>Итого: ${rub(order.total)}</b> (без доставки)`,
  ]
  return rows.filter((r) => r !== null).join('\n')
}

export async function sendToTelegram(text: string): Promise<void> {
  const { token, chatId } = config.telegram
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status}: ${await res.text()}`)
  }
}
