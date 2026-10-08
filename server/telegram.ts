import { CONTACT_METHODS } from '../src/entities/order/model/schema.ts'
import { config } from './config.ts'
import type { Order } from './order.ts'

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** Telegram отклоняет сообщения длиннее 4096 символов — тогда заявка дошла бы только до файла. */
const TELEGRAM_LIMIT = 4096
const TRUNCATED_NOTE = '\n…\n<i>Сообщение обрезано, полная заявка — в data/orders.jsonl</i>'

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
  const text = rows.filter((r) => r !== null).join('\n')
  if (text.length <= TELEGRAM_LIMIT) return text
  // Режем по границе строки, чтобы не разорвать HTML-тег или сущность.
  const head = text.slice(0, TELEGRAM_LIMIT - TRUNCATED_NOTE.length)
  return head.slice(0, head.lastIndexOf('\n')) + TRUNCATED_NOTE
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
