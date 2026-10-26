import { cdekTrackingUrl } from './cdek.ts'
import { COUNTRIES } from '../src/entities/order/model/countries.ts'
import { sizeLabel, type Order } from './order.ts'

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** Telegram отклоняет сообщения длиннее 4096 символов — тогда заказ дошёл бы только до базы. */
const TELEGRAM_LIMIT = 4096
const TRUNCATED_NOTE = '\n…\n<i>Сообщение обрезано, полный заказ — в базе заказов</i>'

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const tenge = (n: number) => `${n.toLocaleString('ru-RU')} ₸`

/** Строка СДЭК в конце сообщения: номер со ссылкой на отслеживание или понятное предупреждение. */
function cdekLine(order: Order): string {
  const { cdek } = order
  if (cdek.status === 'created') {
    return cdek.number
      ? `<b>СДЭК:</b> № ${escapeHtml(cdek.number)} · <a href="${cdekTrackingUrl(cdek.number)}">отследить</a>`
      : '<b>СДЭК:</b> заказ создан, номер — в личном кабинете СДЭК'
  }
  if (cdek.status === 'prepay') {
    return '💳 <b>Предоплата переводом.</b> Напишите покупателю, после оплаты оформите посылку в СДЭК вручную.'
  }
  if (cdek.status === 'failed') return `⚠️ <b>В СДЭК не создан — оформите вручную.</b> ${escapeHtml(cdek.error ?? '')}`.trim()
  return '⚠️ <b>СДЭК не подключён — оформите доставку вручную.</b>'
}

/** +7 (999) 123-45-67 — Telegram сам делает номер нажимаемым (ссылки tel: в сообщениях бота не поддерживаются). */
const prettyPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.length === 11 && d.startsWith('7') ? `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}` : phone
}

/*
 * Сообщение продавцу: блоки через пустую строку — товары, суммы, пункт выдачи, покупатель, СДЭК.
 * Только жирные подзаголовки, без лишнего оформления; всё, что ввёл покупатель, экранируется.
 */
export function formatOrderMessage(order: Order, { withCustomer = true } = {}): string {
  const { customer: c, items, delivery, totals } = order
  const quote = delivery.quote
  const country = order.country && order.country !== 'RU' ? `${COUNTRIES[order.country].name}, ` : ''
  const point = delivery.note
    ? `${country}${escapeHtml(delivery.note)} (указал покупатель)`
    : delivery.point
      ? `${country}${escapeHtml(delivery.point.city)}, ${escapeHtml(delivery.point.address)} (${escapeHtml(delivery.pointCode)})`
      : escapeHtml(delivery.pointCode)
  const payment = order.payment
  const pay =
    payment?.method === 'prepay'
      ? 'предоплата переводом продавцу'
      : payment?.currency === 'KZT'
        ? `при получении <b>${tenge(payment.amount)}</b>`
        : totals.prepayment
          ? `предоплата ${rub(totals.prepayment)}, при получении ${rub(totals.payOnPickup)}`
          : 'оплата при получении'
  const rows: (string | null)[] = [
    '<b>Новый заказ</b>',
    ...items.flatMap((i) => [
      '',
      `<b>${escapeHtml(i.name)}</b>`,
      `${escapeHtml(i.color)} · ${escapeHtml(sizeLabel(i.size))} · ${i.qty} шт. — ${rub(i.price * i.qty)}`,
      ...(i.left === undefined ? [] : [i.left ? `Осталось в этом размере: ${i.left} шт.` : 'Это был последний в этом размере']),
    ]),
    '',
    quote
      ? `Доставка СДЭК: ${rub(quote.sum)}${quote.periodMax ? `, ${quote.periodMin}–${quote.periodMax} дн.` : ''}`
      : 'Доставка СДЭК: не рассчитана — уточните с покупателем',
    `<b>Итого: ${rub(totals.total)}</b> — ${pay}`,
    '',
    '<b>Пункт выдачи</b>',
    point,
    ...(withCustomer
      ? [
          '',
          '<b>Покупатель</b>',
          escapeHtml(c.name),
          escapeHtml(prettyPhone(c.phone)),
          c.telegram ? `@${escapeHtml(c.telegram)}` : null,
          c.comment ? `Комментарий: ${escapeHtml(c.comment)}` : null,
        ]
      : []),
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
  /** Чат продавца: сюда приходят заказы, и только его команды выполняет бот (server/bot.ts). */
  chatId: string
  /** Ещё кто может управлять ботом (id через запятую), кроме chatId; заказы им не приходят. */
  adminIds?: string
  /** Секрет вебхука бота (заголовок X-Telegram-Bot-Api-Secret-Token); пусто — бот не принимает команды. */
  webhookSecret?: string
}

interface InlineButton {
  text: string
  callback_data: string
}
export type InlineKeyboard = InlineButton[][]

/** Вызов Bot API; ошибка Telegram — исключение. */
export async function telegramCall(method: string, body: Record<string, unknown>, token: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status}: ${await res.text()}`)
  }
}

export function sendToTelegram(text: string, { token, chatId }: TelegramConfig, keyboard?: InlineKeyboard): Promise<void> {
  return telegramCall(
    'sendMessage',
    {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    },
    token,
  )
}
