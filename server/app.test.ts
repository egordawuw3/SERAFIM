import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const ordersFile = join(mkdtempSync(join(tmpdir(), 'serafim-')), 'orders.jsonl')
let app: typeof import('./app.ts').app

beforeAll(async () => {
  vi.stubEnv('ORDERS_FILE', ordersFile)
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
  vi.stubEnv('TRUST_PROXY', '1')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  ;({ app } = await import('./app.ts'))
})

const validOrder = {
  name: 'Иван',
  phone: '+7 999 123-45-67',
  telegram: '@ivan_petrov',
  contactMethod: 'telegram',
  city: 'Москва',
  comment: '',
  items: [{ productId: 'p1', colorId: 'blue', size: 'M', qty: 2 }],
}

const post = (body: unknown, ip = '1.1.1.1') =>
  app.request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })

describe('POST /api/orders', () => {
  it('accepts a valid order, prices it on the server and stores it', async () => {
    const res = await post({ ...validOrder, items: [{ ...validOrder.items[0] }] })
    expect(res.status).toBe(201)
    const data = (await res.json()) as { number: string; total: number }
    expect(data.number).toMatch(/^SRF-\d{6}-[0-9A-F]{4}$/)
    expect(data.total).toBe(11990 * 2)

    const saved = JSON.parse(readFileSync(ordersFile, 'utf8').trim().split('\n').at(-1)!)
    expect(saved.customer.telegram).toBe('ivan_petrov')
    expect(saved.lines[0]).toMatchObject({ name: 'Зип-худи Seraph', size: 'M', qty: 2 })
  })

  it('returns field errors for invalid input', async () => {
    const res = await post({ ...validOrder, name: '', phone: '123', telegram: '' })
    expect(res.status).toBe(400)
    const data = (await res.json()) as { fields: Record<string, string> }
    expect(Object.keys(data.fields)).toEqual(expect.arrayContaining(['name', 'phone', 'telegram']))
  })

  it('rejects sold-out sizes and unknown products', async () => {
    const soldOut = await post({ ...validOrder, items: [{ productId: 'p1', colorId: 'moss', size: 'XS', qty: 1 }] })
    expect(soldOut.status).toBe(409)
    const unknown = await post({ ...validOrder, items: [{ productId: 'zzz', colorId: 'blue', size: 'M', qty: 1 }] })
    expect(unknown.status).toBe(409)
  })

  it('silently drops honeypot submissions', async () => {
    const before = readFileSync(ordersFile, 'utf8')
    const res = await post({ ...validOrder, website: 'http://spam' })
    expect(res.status).toBe(201)
    expect(readFileSync(ordersFile, 'utf8')).toBe(before)
  })
})

describe('formatOrderMessage', () => {
  it('escapes user input for Telegram HTML', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({
      number: 'SRF-1',
      createdAt: '',
      customer: { ...validOrder, telegram: '', comment: '<b>hi</b> & bye', contactMethod: 'phone' },
      lines: [{ name: 'Худи', color: 'Синий', size: 'M', qty: 1, price: 1000 }],
      total: 1000,
    })
    expect(text).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye')
    expect(text).not.toContain('Telegram:')
    expect(text).toContain('Связаться через:</b> Звонок')
  })
})

describe('rate limit', () => {
  it('limits repeated submissions from one IP', async () => {
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await post(validOrder, '9.9.9.9')).status)
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true)
    expect(statuses[5]).toBe(429)
  })
})
