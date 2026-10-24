import { products } from '../src/entities/product/model/catalog.ts'
import type { Product, Size } from '../src/entities/product/model/types.ts'
import { sizeLabel } from './order.ts'
import type { StockStore } from './stock.ts'
import { telegramCall, type InlineKeyboard, type TelegramConfig } from './telegram.ts'

/*
 * Бот продавца (@Serafim_orders_bot): остатки по размерам.
 * Команды принимаются только от продавца (TelegramConfig.chatId) и помощников (adminIds) — остальным бот не отвечает.
 *   /stock (или «остатки») — по карточке на товар: у каждого размера остаток и кнопки −1 / +1;
 *   «The only way M 5» — поставить остаток, «The only way M +3» / «-1» — изменить, «Рюкзак 10» — для товара без размеров.
 */

export interface BotPlatform extends StockStore {
  telegram: TelegramConfig
}

interface Article {
  sku: string
  product: Product
  size: Size
}

/** Все артикулы каталога: цвет × размер (тот же SKU, что в заказе и в таблице stock). */
const ARTICLES: Article[] = products.flatMap((product) =>
  product.colors.flatMap((color) => product.sizes.map((size) => ({ sku: `${color.sku}/${size}`, product, size }))),
)
const articleBySku = new Map(ARTICLES.map((a) => [a.sku, a]))

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

function stockCard(product: Product, left: Record<string, number>): { text: string; keyboard: InlineKeyboard } {
  const articles = ARTICLES.filter((a) => a.product === product)
  const tracked = articles.filter((a) => a.sku in left)
  const lines = [`<b>${escapeHtml(product.name)}</b>`]
  if (!tracked.length) lines.push(`Остаток не ведётся — продаётся без ограничений. Чтобы вести: «${escapeHtml(product.name)}${product.sizes.length > 1 ? ' M' : ''} 10».`)
  const keyboard: InlineKeyboard = tracked.map((a) => [
    { text: `${sizeLabel(a.size)}: ${left[a.sku]} шт.`, callback_data: 'n' },
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
    if (!isAdmin(msg.from?.id) || msg.chat?.id !== msg.from?.id || !msg.text) {
      // Чужим не отвечаем, но id пишем в лог — так проще добавить помощника (TELEGRAM_ADMIN_IDS).
      console.info('[bot] команда не от продавца, id', msg.from?.id)
      return
    }
    const text = msg.text.trim()
    const command = text.toLowerCase().replace(/^\//, '').replace(/@\w+$/, '')
    if (['start', 'help', 'помощь'].includes(command)) return reply(HELP)
    if (['stock', 'остатки', 'склад'].includes(command)) {
      const left = await p.stock()
      for (const product of products) {
        const card = stockCard(product, left)
        await reply(card.text, card.keyboard)
      }
      return
    }
    const parsed = parseStockCommand(text)
    if (!parsed) return reply('Не понял команду. Подсказка — /help')
    if ('error' in parsed) return reply(parsed.error)
    const before = (await p.stock())[parsed.article.sku]
    const now = await p.setStock(parsed.article.sku, parsed.change)
    return reply(
      `${escapeHtml(parsed.article.product.name)}, ${sizeLabel(parsed.article.size)}: <b>${now} шт.</b>${before === undefined ? '' : ` (было ${before})`}`,
    )
  }

  const cb = update.callback_query
  if (!cb) return
  const answer = (text?: string) => call('answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text } : {}) })
  if (!isAdmin(cb.from?.id)) return answer('Бот работает только для продавца')
  const chatId = cb.message?.chat?.id
  const messageId = cb.message?.message_id
  const setKeyboard = (keyboard: InlineKeyboard) =>
    call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } })
  const data = cb.data ?? ''

  const delta = /^d:(.+):(-?1)$/.exec(data)
  if (delta) {
    const article = articleBySku.get(delta[1])
    if (!article) return answer('Такого товара больше нет')
    const now = await p.setStock(article.sku, { delta: Number(delta[2]) })
    await setKeyboard(stockCard(article.product, await p.stock()).keyboard)
    return answer(`${sizeLabel(article.size)}: ${now} шт.`)
  }

  return answer()
}
