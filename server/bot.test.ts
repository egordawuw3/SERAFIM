import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleBotUpdate, parseStockCommand, type BotPlatform } from './bot.ts'
import { memoryStock } from './stock.ts'
import { memoryWaitlist } from './waitlist.ts'

const ADMIN = 1860235658
const ONLY_WAY_M = 'SRF/HD/ONLYWAY/GREY/M'

let calls: { method: string; body: Record<string, unknown> }[]

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ method: String(input).split('/').at(-1)!, body: JSON.parse(String(init?.body)) })
      return new Response('{"ok":true}')
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

function platform(stock: Record<string, number> = { [ONLY_WAY_M]: 7 }): BotPlatform {
  return {
    telegram: { token: 't', chatId: String(ADMIN), webhookSecret: 's' },
    ...memoryStock(stock),
    waitlist: memoryWaitlist(),
  }
}

const message = (text: string, from = ADMIN) => ({ message: { chat: { id: from }, from: { id: from }, text } })
const press = (data: string, from = ADMIN) => ({ callback_query: { id: 'q', from: { id: from }, data, message: { chat: { id: ADMIN }, message_id: 5 } } })
const sent = () => calls.filter((c) => c.method === 'sendMessage').map((c) => String(c.body.text))

describe('bot: access', () => {
  it('does not let anyone but the seller change stock — only explains what the bot is for', async () => {
    const p = platform()
    await handleBotUpdate(message('The only way M 0', 42), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(7)
    expect(sent()).toEqual([expect.stringContaining('Сообщить о поступлении')])
  })

  it('obeys helpers from adminIds and replies to their own chat', async () => {
    const p = platform()
    p.telegram.adminIds = '777, 888'
    await handleBotUpdate(message('The only way M 3', 888), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(3)
    expect(calls.at(-1)!.body.chat_id).toBe(888)
  })

  it('does not let others press stock buttons', async () => {
    const p = platform()
    await handleBotUpdate(press(`d:${ONLY_WAY_M}:-1`, 42), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(7)
    expect(calls.map((c) => c.method)).toEqual(['answerCallbackQuery'])
  })
})

describe('bot: stock', () => {
  it('/stock shows a card per product with buttons for tracked sizes', async () => {
    await handleBotUpdate(message('/stock'), platform())
    const cards = calls.filter((c) => c.method === 'sendMessage')
    expect(cards).toHaveLength(5)
    const onlyWay = cards.find((c) => String(c.body.text).includes('The only way'))!
    const keyboard = (onlyWay.body.reply_markup as { inline_keyboard: { text: string; callback_data: string }[][] }).inline_keyboard
    expect(keyboard).toEqual([
      [
        { text: 'M: 7 шт.', callback_data: 'n' },
        { text: '−1', callback_data: `d:${ONLY_WAY_M}:-1` },
        { text: '+1', callback_data: `d:${ONLY_WAY_M}:1` },
      ],
    ])
    expect(sent().find((t) => t.includes('Рюкзак'))).toContain('не ведётся')
  })

  it('buttons change stock and redraw the card', async () => {
    const p = platform()
    await handleBotUpdate(press(`d:${ONLY_WAY_M}:-1`), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(6)
    const edit = calls.find((c) => c.method === 'editMessageText')!
    expect(JSON.stringify(edit.body)).toContain('M: 6 шт.')
  })

  it('understands «товар размер число», relative changes and Russian lookalike letters', async () => {
    const p = platform()
    await handleBotUpdate(message('the only way м 5'), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(5)
    expect(sent().at(-1)).toBe('Худи The only way, M: <b>5 шт.</b> (было 7)')
    await handleBotUpdate(message('Only way M +3'), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(8)
    await handleBotUpdate(message('Only way M -20'), p)
    expect((await p.stock())[ONLY_WAY_M]).toBe(0)
    await handleBotUpdate(message('Рюкзак 10'), p)
    expect((await p.stock())['SRF/BP/JESUS/BLACK/ONE SIZE']).toBe(10)
  })

  it('explains what is wrong instead of guessing', () => {
    expect(parseStockCommand('Худи M 5')).toMatchObject({ error: expect.stringContaining('несколько') })
    expect(parseStockCommand('The only way 5')).toMatchObject({ error: expect.stringContaining('Укажите размер') })
    expect(parseStockCommand('Футболка M 5')).toMatchObject({ error: expect.stringContaining('Не нашёл') })
    expect(parseStockCommand('привет')).toBeNull()
  })
})

describe('bot: webhook', () => {
  it('accepts updates only with the webhook secret', async () => {
    const { createApi } = await import('./api.ts')
    const p = platform()
    const tasks: Promise<unknown>[] = []
    const api = createApi({
      ...p,
      siteOrigin: '',
      cdek: null,
      sender: { name: '', phone: '', pointCode: '' },
      clientIp: () => '1.1.1.1',
      allowOrder: () => true,
      saveOrder: async () => {},
      background: (_c, task) => void tasks.push(task),
    })
    const post = (secret?: string) =>
      api.request('/api/telegram', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}) },
        body: JSON.stringify(message('The only way M 1')),
      })
    expect((await post()).status).toBe(403)
    expect((await post('wrong')).status).toBe(403)
    expect((await post('s')).status).toBe(200)
    await Promise.all(tasks)
    expect((await p.stock())[ONLY_WAY_M]).toBe(1)
  })
})

describe('bot: waitlist', () => {
  const START = '/start w_p2_grey_M'

  it('buyer subscribes to a sold-out size and hears when the seller adds it back', async () => {
    const p = platform({ [ONLY_WAY_M]: 0 })
    await handleBotUpdate(message(START, 501), p)
    await handleBotUpdate(message(START, 501), p) // повторное нажатие — без дубля
    await handleBotUpdate(message(START, 502), p)
    expect(sent().at(-1)).toContain('Напишу сюда')
    expect(await p.waitlist!.counts()).toEqual({ [ONLY_WAY_M]: 2 })

    // Продавец видит, сколько ждут.
    calls = []
    await handleBotUpdate(message('/stock'), p)
    expect(sent().find((t) => t.includes('The only way'))).toContain('🔔 Ждут: M — 2')

    calls = []
    await handleBotUpdate(message('The only way M 3'), p)
    const notices = calls.filter((c) => c.method === 'sendMessage' && c.body.chat_id !== ADMIN)
    expect(notices.map((c) => c.body.chat_id)).toEqual([501, 502])
    expect(String(notices[0].body.text)).toContain('снова в наличии')
    expect(JSON.stringify(notices[0].body.reply_markup)).toContain('https://serafim6s.ru/product/the-only-way-hoodie?color=grey')
    expect(sent().at(-1)).toContain('Сообщил о поступлении: 2')
    // Уведомление — один раз.
    expect(await p.waitlist!.counts()).toEqual({})
  })

  it('a size that is in stock is not subscribed to — the buyer gets a link instead', async () => {
    const p = platform({ [ONLY_WAY_M]: 2 })
    await handleBotUpdate(message(START, 501), p)
    expect(sent().at(-1)).toContain('уже есть в наличии')
    expect(await p.waitlist!.counts()).toEqual({})
  })

  it('unsubscribe button works for the buyer', async () => {
    const p = platform({ [ONLY_WAY_M]: 0 })
    await handleBotUpdate(message(START, 501), p)
    await handleBotUpdate(press('u:w_p2_grey_M', 501), p)
    expect(await p.waitlist!.counts()).toEqual({})
  })

  it('the waitlist file survives a restart', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { fileWaitlist } = await import('./waitlist.ts')
    const file = join(mkdtempSync(join(tmpdir(), 'serafim-wait-')), 'waitlist.json')
    await fileWaitlist(file).add(ONLY_WAY_M, 501)
    expect(await fileWaitlist(file).take(ONLY_WAY_M)).toEqual([501])
    expect(await fileWaitlist(file).counts()).toEqual({})
  })
})
