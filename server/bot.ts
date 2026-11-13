import { waitlistToken } from '../src/entities/product/lib/waitlist.ts'
import { products } from '../src/entities/product/model/catalog.ts'
import type { Product, Size } from '../src/entities/product/model/types.ts'
import { sizeLabel } from './order.ts'
import type { StockStore } from './stock.ts'
import { telegramCall, type InlineKeyboard, type TelegramConfig } from './telegram.ts'
import type { WaitlistStore } from './waitlist.ts'

/*
 * Бот продавца (@Serafim_orders_bot): остатки по размерам.
 * Команды принимаются только от продавца (TelegramConfig.chatId) и помощников (adminIds) — остальным бот не отвечает.
 *   /stock (или «остатки») — по карточке на товар: у каждого размера остаток и кнопки −1 / +1;
 *   «The only way M 5» — поставить остаток, «The only way M +3» / «-1» — изменить, «Рюкзак 10» — для товара без размеров.
 * Покупателям — лист ожидания: /start w_<товар>_<цвет>_<размер> (ссылка «Сообщить о поступлении» на сайте);
 * когда продавец снова добавит размер, бот пишет всем, кто ждал.
 */

export interface BotPlatform extends StockStore {
  telegram: TelegramConfig
  /** Адрес сайта для ссылок в уведомлениях; пусто — https://serafim6s.ru. */
  siteOrigin?: string
  /** Нет — лист ожидания выключен (воркер Cloudflare). */
  waitlist?: WaitlistStore
}

interface Article {
  sku: string
  /** Код размера в ссылке на бота (лист ожидания). */
  token: string
  product: Product
  colorId: string
  size: Size
}

/** Все артикулы каталога: цвет × размер (тот же SKU, что в заказе и в таблице stock). */
const ARTICLES: Article[] = products.flatMap((product) =>
  product.colors.flatMap((color) =>
    product.sizes.map((size) => ({ sku: `${color.sku}/${size}`, token: waitlistToken(product.id, color.id, size), product, colorId: color.id, size })),
  ),
)
const articleBySku = new Map(ARTICLES.map((a) => [a.sku, a]))
const articleByToken = new Map(ARTICLES.map((a) => [a.token, a]))

const sizeText = (a: Article) => (a.product.sizes.length > 1 ? `, размер ${a.size}` : '')

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const HELP = [
  '<b>Остатки</b>',
  '/stock — остатки по размерам, кнопки −1 / +1 меняют их сразу на сайте.',
  '',
  'Или напишите сообщением:',
  '<code>The only way M 5</code> — поставить 5 шт.',
  '<code>Salvation XL +3</code> — пришло ещё 3',
  '<code>Регбийка S -1</code> — продали вживую',
  '<code>Рюкзак 10</code> — для вещи без размеров',
  '',
  'На нуле размер на сайте становится «нет в наличии».',
].join('\n')

// ---------- карточка остатков товара ----------

function stockCard(product: Product, left: Record<string, number>, waiting: Record<string, number> = {}): { text: string; keyboard: InlineKeyboard } {
  const articles = ARTICLES.filter((a) => a.product === product)
  const tracked = articles.filter((a) => a.sku in left)
  const lines = [`<b>${escapeHtml(product.name)}</b>`]
  if (!tracked.length) lines.push(`Остаток не ведётся — продаётся без ограничений. Чтобы вести: «${escapeHtml(product.name)}${product.sizes.length > 1 ? ' M' : ''} 10».`)
  const keyboard: InlineKeyboard = tracked.map((a) => [
    { text: `${sizeLabel(a.size)}: ${left[a.sku]} шт.${waiting[a.sku] ? ` · ждут ${waiting[a.sku]}` : ''}`, callback_data: 'n' },
    { text: '−1', callback_data: `d:${a.sku}:-1` },
    { text: '+1', callback_data: `d:${a.sku}:1` },
  ])
  return { text: lines.join('\n'), keyboard }
}

// ---------- текстовая команда «товар размер число» ----------

/** Русские буквы, похожие на латинские размеры: «М», «С», «ХЛ». */
const LOOKALIKE: Record<string, string> = { м: 'm', с: 's', х: 'x', л: 'l' }
const normSize = (w: string) => [...w.toLowerCase()].map((ch) => LOOKALIKE[ch] ?? ch).join('').toUpperCase()

type Parsed = { article: Article; change: { qty: number } | { delta: number } } | { error: string }

export function parseStockCommand(text: string): Parsed | null {
  const words = text.trim().split(/\s+/)
  const num = /^([+-])?(\d{1,4})$/.exec(words.at(-1) ?? '')
  if (!num || words.length < 2) return null
  const amount = Number(num[2])
  const change = num[1] ? { delta: num[1] === '-' ? -amount : amount } : { qty: amount }

  let rest = words.slice(0, -1)
  const sizeWord = normSize(rest.at(-1) ?? '')
  const query = (s: string[]) => s.join(' ').toLowerCase()
  const match = (q: string) => products.filter((p) => p.name.toLowerCase().includes(q))

  let candidates: Product[]
  let size: Size | undefined
  if (rest.length > 1 && ['S', 'M', 'L', 'XL'].includes(sizeWord)) {
    size = sizeWord as Size
    rest = rest.slice(0, -1)
    candidates = match(query(rest))
  } else {
    candidates = match(query(rest))
  }
  if (!candidates.length) return { error: `Не нашёл товар «${escapeHtml(query(rest))}». Список — /stock.` }
  if (candidates.length > 1) return { error: `Под «${escapeHtml(query(rest))}» подходит несколько: ${candidates.map((p) => escapeHtml(p.name)).join(', ')}. Уточните.` }
  const product = candidates[0]
  if (!size) {
    if (product.sizes.length > 1) return { error: `Укажите размер: например «${escapeHtml(product.name)} M ${num[0]}».` }
    size = product.sizes[0]
  }
  if (product.colors.length > 1) return { error: 'У товара несколько цветов — измените остаток кнопками в /stock.' }
  const article = ARTICLES.find((a) => a.product === product && a.size === size)
  if (!article) return { error: `У «${escapeHtml(product.name)}» нет размера ${size}.` }
  return { article, change }
}

// ---------- лист ожидания ----------

const productUrl = (p: BotPlatform, a: Article) =>
  `${p.siteOrigin || 'https://serafim6s.ru'}/product/${a.product.slug}?color=${a.colorId}`

/** Размер снова появился (было 0) — пишем всем, кто ждал. Возвращает, скольким написали. */
async function notifyWaiters(p: BotPlatform, a: Article, before: number | undefined, now: number): Promise<number> {
  if (!p.waitlist || before !== 0 || now <= 0) return 0
  const chats = await p.waitlist.take(a.sku)
  let sent = 0
  for (const chatId of chats) {
    // Кто-то мог остановить бота — его пропускаем, остальным пишем.
    await telegramCall(
      'sendMessage',
      {
        chat_id: chatId,
        text: `🔔 <b>${escapeHtml(a.product.name)}</b>${sizeText(a)} снова в наличии!`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: 'Открыть на сайте', url: productUrl(p, a) }]] },
      },
      p.telegram.token,
    ).then(
      () => sent++,
      () => {},
    )
  }
  return sent
}

const notifiedNote = (n: number) => (n ? `\n🔔 Сообщил о поступлении: ${n}` : '')

// ---------- обработка обновлений Telegram ----------

interface Update {
  message?: { chat?: { id?: number }; from?: { id?: number }; text?: string }
  callback_query?: { id: string; from?: { id?: number }; data?: string; message?: { chat?: { id?: number }; message_id?: number } }
}

export async function handleBotUpdate(raw: unknown, p: BotPlatform): Promise<void> {
  const update = (raw ?? {}) as Update
  const admins = new Set([p.telegram.chatId, ...(p.telegram.adminIds ?? '').split(',')].map((s) => Number(s.trim())).filter(Boolean))
  const isAdmin = (id?: number) => id !== undefined && admins.has(id)
  const call = (method: string, body: Record<string, unknown>) => telegramCall(method, body, p.telegram.token)
  const msg = update.message
  const reply = (text: string, keyboard?: InlineKeyboard) =>
    call('sendMessage', { chat_id: msg?.chat?.id, text, parse_mode: 'HTML', ...(keyboard?.length ? { reply_markup: { inline_keyboard: keyboard } } : {}) })

  if (msg) {
    if (msg.chat?.id !== msg.from?.id || !msg.text || msg.from?.id === undefined) return
    const text = msg.text.trim()
    // Лист ожидания — для всех: /start w_p2_grey_M из ссылки «Сообщить о поступлении».
    const wait = /^\/start\s+(w_\w+)$/.exec(text)
    if (wait) {
      const a = articleByToken.get(wait[1])
      if (!a || !p.waitlist) return reply('Такой вещи больше нет в каталоге. Все вещи — на сайте serafim6s.ru')
      const left = (await p.stock())[a.sku]
      if (left === undefined || left > 0) {
        return reply(`<b>${escapeHtml(a.product.name)}</b>${sizeText(a)} уже есть в наличии.`, [[{ text: 'Открыть на сайте', url: productUrl(p, a) }]])
      }
      await p.waitlist.add(a.sku, msg.from.id)
      return reply(`Готово! Напишу сюда, как только <b>${escapeHtml(a.product.name)}</b>${sizeText(a)} снова появится.`, [
        [{ text: 'Отписаться', callback_data: `u:${a.token}` }],
      ])
    }
    if (!isAdmin(msg.from.id)) {
      // Чужим про остатки не отвечаем, но id пишем в лог — так проще добавить помощника (TELEGRAM_ADMIN_IDS).
      console.info('[bot] команда не от продавца, id', msg.from.id)
      return reply('Это бот магазина SERAFIM. Чтобы узнать, когда появится нужный размер, нажмите «Сообщить о поступлении» на странице вещи: serafim6s.ru')
    }
    const command = text.toLowerCase().replace(/^\//, '').replace(/@\w+$/, '')
    if (['start', 'help', 'помощь'].includes(command)) return reply(HELP)
    if (['stock', 'остатки', 'склад'].includes(command)) {
      const left = await p.stock()
      const waiting = (await p.waitlist?.counts()) ?? {}
      for (const product of products) {
        const card = stockCard(product, left, waiting)
        await reply(card.text, card.keyboard)
      }
      return
    }
    const parsed = parseStockCommand(text)
    if (!parsed) return reply('Не понял команду. Подсказка — /help')
    if ('error' in parsed) return reply(parsed.error)
    const before = (await p.stock())[parsed.article.sku]
    const now = await p.setStock(parsed.article.sku, parsed.change)
    const notified = await notifyWaiters(p, parsed.article, before, now)
    return reply(
      `${escapeHtml(parsed.article.product.name)}, ${sizeLabel(parsed.article.size)}: <b>${now} шт.</b>${before === undefined ? '' : ` (было ${before})`}${notifiedNote(notified)}`,
    )
  }

  const cb = update.callback_query
  if (!cb) return
  const answer = (text?: string) => call('answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text } : {}) })
  const chatId = cb.message?.chat?.id
  const messageId = cb.message?.message_id
  const setKeyboard = (keyboard: InlineKeyboard) =>
    call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } })
  const data = cb.data ?? ''

  // Отписка от листа ожидания — кнопка под подтверждением подписки, для всех.
  const unsubscribe = /^u:(w_\w+)$/.exec(data)
  if (unsubscribe) {
    const a = articleByToken.get(unsubscribe[1])
    if (a && p.waitlist && cb.from?.id !== undefined) await p.waitlist.remove(a.sku, cb.from.id)
    await setKeyboard([])
    return answer('Вы отписались')
  }

  if (!isAdmin(cb.from?.id)) return answer('Бот работает только для продавца')

  const delta = /^d:(.+):(-?1)$/.exec(data)
  if (delta) {
    const article = articleBySku.get(delta[1])
    if (!article) return answer('Такого товара больше нет')
    const before = (await p.stock())[article.sku]
    const now = await p.setStock(article.sku, { delta: Number(delta[2]) })
    const notified = await notifyWaiters(p, article, before, now)
    await setKeyboard(stockCard(article.product, await p.stock(), (await p.waitlist?.counts()) ?? {}).keyboard)
    return answer(`${sizeLabel(article.size)}: ${now} шт.${notified ? ` · сообщил ждавшим: ${notified}` : ''}`)
  }

  return answer()
}
