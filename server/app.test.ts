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
  consent: true,
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

  it('silently drops honeypot submissions with a realistic answer', async () => {
    const before = readFileSync(ordersFile, 'utf8')
    const res = await post({ ...validOrder, website: 'http://spam' })
    expect(res.status).toBe(201)
    const data = (await res.json()) as { number: string; total: number }
    expect(data.number).toMatch(/^SRF-\d{6}-[0-9A-F]{4}$/)
    expect(data.number).not.toBe('SRF-000000-0000')
    expect(data.total).toBe(11990 * 2)
    expect(readFileSync(ordersFile, 'utf8')).toBe(before)
  })

  it('stores consent time and requires consent', async () => {
    const saved = JSON.parse(readFileSync(ordersFile, 'utf8').trim().split('\n')[0])
    expect(saved.consentAt).toBe(saved.createdAt)
    expect(saved.customer).not.toHaveProperty('consent')

    const res = await post({ ...validOrder, consent: false }, '2.2.2.1')
    expect(res.status).toBe(400)
    expect(((await res.json()) as { fields: Record<string, string> }).fields).toHaveProperty('consent')
  })

  it('does not leak validator internals for malformed input', async () => {
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' },
      body: '{bad json',
    })
    expect(res.status).toBe(400)
    const data = (await res.json()) as { fields: Record<string, string> }
    expect(Object.keys(data.fields)).toEqual(['form'])
    expect(data.fields.form).not.toMatch(/Invalid input|expected/)
  })
})

describe('request guards', () => {
  const body = JSON.stringify(validOrder)

  it('rejects cross-site form posts (CSRF)', async () => {
    const asForm = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'https://evil.example', 'x-forwarded-for': '3.3.3.1' },
      body,
    })
    expect(asForm.status).toBe(415)

    const crossSite = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site', 'x-forwarded-for': '3.3.3.2' },
      body,
    })
    expect(crossSite.status).toBe(403)

    const sameOrigin = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '3.3.3.3' },
      body,
    })
    expect(sameOrigin.status).toBe(201)
  })

  it('answers 413 for oversized bodies', async () => {
    const res = await app.request('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '3.3.3.4' },
      body: JSON.stringify({ ...validOrder, comment: 'x'.repeat(40_000) }),
    })
    expect(res.status).toBe(413)
  })

  it('sends hardened headers and does not expose config in health', async () => {
    const res = await app.request('/api/health')
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers.get('strict-transport-security')).toBe('max-age=15552000')
    expect(res.headers.get('permissions-policy')).toContain('camera=()')
    expect(res.headers.get('content-security-policy')).not.toContain('googleapis')
  })
})

describe('createRateLimiter', () => {
  it('never keeps more than maxKeys entries', async () => {
    const { createRateLimiter } = await import('./rateLimit.ts')
    const allow = createRateLimiter({ max: 1, windowMs: 60_000, maxKeys: 3 })
    for (let i = 0; i < 100; i++) expect(allow(`ip-${i}`, 0)).toBe(true)
    // Самые старые вытеснены — у последнего лимит по-прежнему работает.
    expect(allow('ip-99', 0)).toBe(false)
  })
})

describe('formatOrderMessage', () => {
  it('escapes user input for Telegram HTML', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({
      number: 'SRF-1',
      createdAt: '',
      consentAt: '',
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

  it('ignores client-supplied X-Forwarded-For entries left of the proxy', async () => {
    // Клиент подставляет случайный IP слева, прокси дописывает реальный справа — лимит должен считаться по реальному.
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await post(validOrder, `10.0.0.${i}, 8.8.8.8`)).status)
    expect(statuses[5]).toBe(429)
  })
})

describe('formatOrderMessage length', () => {
  it('fits Telegram limit without breaking HTML', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({
      number: 'SRF-1',
      createdAt: '',
      consentAt: '',
      customer: { ...validOrder, contactMethod: 'telegram', comment: 'x'.repeat(1000) },
      lines: Array.from({ length: 30 }, (_, i) => ({
        name: `Очень длинное название товара номер ${i} `.repeat(3),
        color: 'Глубокий синий',
        size: 'XL',
        qty: 10,
        price: 11990,
      })),
      total: 1,
    })
    expect(text.length).toBeLessThanOrEqual(4096)
    expect(text.endsWith('</i>')).toBe(true)
  })
})
