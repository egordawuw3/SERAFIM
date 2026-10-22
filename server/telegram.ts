import { cdekTrackingUrl } from './cdek.ts'
import { sizeLabel, type Order } from './order.ts'

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** Telegram отклоняет сообщения длиннее 4096 символов — тогда заказ дошёл бы только до базы. */
const TELEGRAM_LIMIT = 4096
const TRUNCATED_NOTE = '\n…\n<i>Сообщение обрезано, полный заказ — в базе заказов</i>'

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

function cdekLine(order: Order): string {
  const { cdek } = order
  const test = cdek.env === 'test' ? ' (тестовая среда)' : ''
  if (cdek.status === 'created') {
    if (cdek.number) return `<b>СДЭК${test}:</b> заказ № ${escapeHtml(cdek.number)} — ${cdekTrackingUrl(cdek.number)}`
    return `<b>СДЭК${test}:</b> заказ принят, номер появится в личном кабинете СДЭК (id ${escapeHtml(cdek.uuid ?? '—')})`
  }
  if (cdek.status === 'failed') return `⚠️ <b>В СДЭК не создан, оформите вручную:</b> ${escapeHtml(cdek.error ?? 'неизвестная ошибка')}`
  return '⚠️ <b>СДЭК не подключён — оформите доставку вручную</b>'
}

export function formatOrderMessage(order: Order): string {
  const { customer: c, items, delivery, totals } = order
  const phoneHref = `tel:${c.phone.replace(/[^\d+]/g, '')}`
  const point = delivery.note
    ? `указан покупателем: ${escapeHtml(delivery.note)}`
    : delivery.point
      ? `${escapeHtml(delivery.pointCode)}, ${escapeHtml(delivery.point.city)}, ${escapeHtml(delivery.point.address)}`
      : `${escapeHtml(delivery.pointCode)} (город СДЭК ${delivery.cityCode})`
  const quote = delivery.quote
  const rows = [
    `<b>Новый заказ ${order.number}</b>`,
    '',
    ...items.map((i) => `• ${escapeHtml(i.name)} — ${escapeHtml(i.color)}, ${escapeHtml(sizeLabel(i.size))} × ${i.qty} = ${rub(i.price * i.qty)}`),
    quote
      ? `<b>Доставка СДЭК:</b> ${rub(quote.sum)}${quote.periodMax ? ` (${quote.periodMin}–${quote.periodMax} дн.)` : ''}`
      : '<b>Доставка СДЭК:</b> не рассчитана — уточните с покупателем',
    `<b>Итого: ${rub(totals.total)}</b>`,
    totals.prepayment
      ? `Предоплата: ${rub(totals.prepayment)}, при получении: ${rub(totals.payOnPickup)}`
      : `Оплата при получении в ПВЗ: ${rub(totals.payOnPickup)}`,
    '',
    `<b>ПВЗ:</b> ${point}`,
    `<b>Имя:</b> ${escapeHtml(c.name)}`,
    `<b>Телефон:</b> <a href="${phoneHref}">${escapeHtml(c.phone)}</a>`,
    c.telegram ? `<b>Telegram:</b> @${escapeHtml(c.telegram)}` : null,
    c.comment ? `<b>Комментарий:</b> ${escapeHtml(c.comment)}` : null,
    '',
    cdekLine(order),
  ]
  const text = rows.filter((r) => r !== null).join('\n')
  if (text.length <= TELEGRAM_LIMIT) return text
  // Режем по границе строки, чтобы не разорвать HTML-тег или сущность.
  const head = text.slice(0, TELEGRAM_LIMIT - TRUNCATED_NOTE.length)
  return head.slice(0, head.lastIndexOf('\n')) + TRUNCATED_NOTE
}

export interface TelegramConfig {
  token: string
  chatId: string
}

export async function sendToTelegram(text: string, { token, chatId }: TelegramConfig): Promise<void> {
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
