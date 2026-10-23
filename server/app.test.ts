import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { orderTotals } from '../src/entities/order/model/pricing.ts'
import { normalizeRuPhone, orderRequestSchema } from '../src/entities/order/model/schema.ts'
import type { Order } from './order.ts'

const ordersFile = join(mkdtempSync(join(tmpdir(), 'serafim-')), 'orders.jsonl')
let app: typeof import('./app.ts').app

/*
 * СДЭК и Telegram подменены: тесты не ходят в сеть. cdekMode переключает поведение «создания заказа» в СДЭК.
 */
let cdekMode: 'ok' | 'down' | 'timeout' | 'lookup-down' = 'ok'
const cdekOrders: unknown[] = []
const point = (code: string, cityCode: number, city: string, address: string) => ({
  code,
  name: `${code}, ${city}`,
  work_time: 'Пн-Вс 10:00-20:00',
  allowed_cod: true,
  is_handout: true,
  location: { city_code: cityCode, city, address, latitude: 55.7, longitude: 49.1 },
})
const POINTS: Record<string, ReturnType<typeof point>> = {
  MSK65: point('MSK65', 44, 'Москва', 'ул. Динамовская, 1А'),
  KZN3: point('KZN3', 424, 'Казань', 'ул. Спартаковская, 2'),
}

async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
  if (url.hostname === 'api.telegram.org') return json({ ok: true })
  if (url.hostname !== 'api.edu.cdek.ru') throw new Error(`unexpected fetch ${url}`)
  const path = url.pathname.replace('/v2', '')
  if (path === '/oauth/token') return json({ access_token: 'test-token', expires_in: 3600 })
  if (path === '/location/suggest/cities') return json([{ code: 424, full_name: 'Казань, Татарстан, Россия' }])
  if (path === '/deliverypoints' && cdekMode === 'lookup-down') throw new TypeError('fetch failed')
  if (path === '/deliverypoints') {
    const code = url.searchParams.get('code')
    if (code) return json(POINTS[code] ? [POINTS[code]] : [])
    return json(Object.values(POINTS).filter((p) => String(p.location.city_code) === url.searchParams.get('city_code')))
  }
  if (path === '/calculator/tariff') return json({ total_sum: 281.4, delivery_sum: 235, period_min: 8, period_max: 12 })
  if (path === '/orders' && init?.method === 'POST') {
    if (cdekMode === 'down') return json({ requests: [{ state: 'INVALID', errors: [{ message: 'Сервис недоступен' }] }] }, 500)
    if (cdekMode === 'timeout') throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    cdekOrders.push(JSON.parse(String(init.body)))
    return json({ entity: { uuid: 'uuid-1' }, requests: [{ type: 'CREATE', state: 'ACCEPTED' }] })
  }
  if (path.startsWith('/orders/')) return json({ entity: { cdek_number: '1234567890' }, requests: [{ type: 'CREATE', state: 'SUCCESSFUL' }] })
  throw new Error(`unexpected CDEK call ${path}`)
}

beforeAll(async () => {
  vi.stubEnv('ORDERS_FILE', ordersFile)
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
  vi.stubEnv('TRUST_PROXY', '1')
  vi.stubEnv('CDEK_ENV', 'test')
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  ;({ app } = await import('./app.ts'))
})

const validOrder = {
  items: [{ productId: 'p2', colorId: 'grey', size: 'M', qty: 1 }],
  cityCode: 424,
  pointCode: 'KZN3',
  deliveryNote: '',
  name: 'Иван Петров',
  phone: '8 (999) 123-45-67',
  telegram: '@ivan_petrov',
  comment: '',
  offerAccepted: true,
  consent: true,
}

const post = (body: unknown, ip = '1.1.1.1') =>
  app.request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })

const lastSaved = (): Order => JSON.parse(readFileSync(ordersFile, 'utf8').trim().split('\n').at(-1)!)

describe('POST /api/orders', () => {
  it('prices on the server, adds CDEK delivery and creates a cash-on-delivery order', async () => {
    const res = await post(validOrder)
    expect(res.status).toBe(201)
    const data = (await res.json()) as { number: string; total: number; payOnPickup: number; cdekCreated: boolean }
    expect(data.number).toMatch(/^SRF-\d{6}-[0-9A-F]{4}$/)
    // 4 500 ₽ за худи + 282 ₽ доставки (СДЭК вернул 281.4 — округляем вверх).
    expect(data).toMatchObject({ total: 4782, payOnPickup: 4782, cdekCreated: true })

    const saved = lastSaved()
    expect(saved.customer.phone).toBe('+79991234567')
    expect(saved.customer.telegram).toBe('ivan_petrov')
    expect(saved.items[0]).toMatchObject({ name: 'Худи The only way', size: 'M', price: 4500 })
    expect(saved.delivery.point?.address).toBe('ул. Спартаковская, 2')
    expect(saved.cdek).toMatchObject({ status: 'created', env: 'test', uuid: 'uuid-1' })
    expect(saved.consentAt).toBe(saved.createdAt)

    const sent = cdekOrders.at(-1) as { shipment_point: string; delivery_point: string; delivery_recipient_cost: { value: number }; packages: { items: { ware_key: string; payment: { value: number } }[] }[] }
    expect(sent.packages[0].items[0].ware_key).toBe('p2-grey-M')
    expect(sent.shipment_point).toBe('MSK65')
    expect(sent.delivery_point).toBe('KZN3')
    expect(sent.delivery_recipient_cost.value).toBe(282)
    expect(sent.packages[0].items[0].payment.value).toBe(4500)
  })

  it('ships several items as one parcel with cash on delivery for each', async () => {
    const res = await post(
      {
        ...validOrder,
        items: [
          { productId: 'p2', colorId: 'grey', size: 'M', qty: 2 },
          { productId: 'p5', colorId: 'black', size: 'ONE SIZE', qty: 1 },
        ],
      },
      '1.1.1.10',
    )
    expect(res.status).toBe(201)
    // 2 × 4 500 + 3 900 + 282 доставки.
    expect(((await res.json()) as { total: number }).total).toBe(13182)
    const sent = cdekOrders.at(-1) as { packages: { weight: number; length: number; height: number; items: { amount: number; payment: { value: number } }[] }[] }
    // Худи — упаковка по умолчанию 600 г, 30×25×8; рюкзак — 500 г, 40×30×13: стопкой 40 × 30 × (8·2 + 13).
    expect(sent.packages[0]).toMatchObject({ weight: 1700, length: 40, height: 29 })
    expect(sent.packages[0].items.map((i) => [i.amount, i.payment.value])).toEqual([
      [2, 4500],
      [1, 3900],
    ])
  })

  it('never loses an order when CDEK fails — it is saved and marked for manual processing', async () => {
    cdekMode = 'down'
    const res = await post(validOrder, '1.1.1.2')
    cdekMode = 'ok'
    expect(res.status).toBe(201)
    expect(((await res.json()) as { cdekCreated: boolean }).cdekCreated).toBe(false)
    expect(lastSaved().cdek).toMatchObject({ status: 'failed', error: 'Сервис недоступен' })
  })

  it('never loses an order on a CDEK timeout or when the pickup point cannot be checked', async () => {
    cdekMode = 'timeout'
    const timedOut = await post(validOrder, '1.1.1.11')
    expect(timedOut.status).toBe(201)
    expect(((await timedOut.json()) as { cdekCreated: boolean }).cdekCreated).toBe(false)
    expect(lastSaved().cdek).toMatchObject({ status: 'failed', error: 'СДЭК недоступен' })

    // Другой пункт, чтобы не попасть в кеш: СДЭК не ответил уже на проверке пункта и расчёте доставки.
    cdekMode = 'lookup-down'
    const noLookup = await post({ ...validOrder, pointCode: 'KZN9' }, '1.1.1.12')
    cdekMode = 'ok'
    expect(noLookup.status).toBe(201)
    const saved = lastSaved()
    expect(saved.cdek.status).toBe('failed')
    expect(saved.delivery.quote).toBeUndefined()
    // Ошибки СДЭК не уходят покупателю — только флаг и суммы.
    expect(Object.keys((await noLookup.clone().json()) as object).sort()).toEqual(['cdekCreated', 'number', 'payOnPickup', 'total'])
  })

  it('accepts a manually described pickup point when CDEK lookups were unavailable', async () => {
    const created = cdekOrders.length
    const res = await post({ ...validOrder, cityCode: 0, pointCode: 'MANUAL_POINT', deliveryNote: 'Тверь, ПВЗ на Советской' }, '1.1.1.8')
    expect(res.status).toBe(201)
    expect(((await res.json()) as { cdekCreated: boolean }).cdekCreated).toBe(false)
    expect(lastSaved().delivery.note).toBe('Тверь, ПВЗ на Советской')
    expect(cdekOrders.length).toBe(created)
    const empty = await post({ ...validOrder, cityCode: 0, pointCode: 'MANUAL_POINT', deliveryNote: '' }, '1.1.1.9')
    expect(((await empty.json()) as { fields: Record<string, string> }).fields).toHaveProperty('deliveryNote')
  })

  it('rejects an unknown pickup point and invalid fields', async () => {
    const badPoint = await post({ ...validOrder, pointCode: 'NOPE1' }, '1.1.1.3')
    expect(badPoint.status).toBe(400)
    expect(((await badPoint.json()) as { fields: Record<string, string> }).fields).toHaveProperty('pointCode')

    const res = await post({ ...validOrder, name: '', phone: '123', consent: false, offerAccepted: false }, '1.1.1.4')
    expect(res.status).toBe(400)
    const { fields } = (await res.json()) as { fields: Record<string, string> }
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(['name', 'phone', 'consent', 'offerAccepted']))
  })

  it('rejects sold-out sizes and unknown products', async () => {
    const soldOut = await post({ ...validOrder, items: [{ productId: 'p1', colorId: 'blue', size: 'L', qty: 1 }] }, '1.1.1.5')
    expect(soldOut.status).toBe(409)
    const unknown = await post({ ...validOrder, items: [{ productId: 'zzz', colorId: 'grey', size: 'M', qty: 1 }] }, '1.1.1.6')
    expect(unknown.status).toBe(409)
  })

  it('silently drops honeypot submissions with a realistic answer', async () => {
    const before = readFileSync(ordersFile, 'utf8')
    const created = cdekOrders.length
    const res = await post({ ...validOrder, website: 'http://spam' }, '1.1.1.7')
    expect(res.status).toBe(201)
    expect(((await res.json()) as { number: string }).number).toMatch(/^SRF-\d{6}-[0-9A-F]{4}$/)
    expect(readFileSync(ordersFile, 'utf8')).toBe(before)
    expect(cdekOrders.length).toBe(created)
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

const get = (path: string) => app.request(path, { headers: { 'x-forwarded-for': '4.4.4.4' } })

describe('CDEK lookups', () => {
  it('suggests cities, lists cash-on-delivery points and quotes delivery', async () => {
    const citiesRes = await get(`/api/cdek/cities?q=${encodeURIComponent('Казан')}`)
    const cities = (await citiesRes.json()) as { cities: { code: number }[] }
    expect(citiesRes.status, JSON.stringify(cities)).toBe(200)
    expect(cities.cities[0].code).toBe(424)

    const points = (await (await get('/api/cdek/points?city=424')).json()) as { points: { code: string; address: string }[] }
    expect(points.points).toEqual([expect.objectContaining({ code: 'KZN3', address: 'ул. Спартаковская, 2' })])

    const quote = (await (await get('/api/cdek/quote?items=p2:1&city=424')).json()) as {
      quote: { sum: number; periodMin: number }
      totals: { total: number }
    }
    expect(quote.quote).toMatchObject({ sum: 282, periodMin: 8 })
    expect(quote.totals.total).toBe(4782)

    expect((await get('/api/cdek/quote?items=zzz:1&city=424')).status).toBe(400)
    expect((await get('/api/cdek/quote?items=p2:99&city=424')).status).toBe(400)
  })
})

describe('short links', () => {
  it('redirects /p/<id> to the order form with the size, or to the product card', async () => {
    const order = await get('/p/p2?size=m&order=1')
    expect(order.status).toBe(302)
    expect(order.headers.get('location')).toBe('/checkout?add=the-only-way-hoodie&size=M')
    expect((await get('/p/jesus-backpack')).headers.get('location')).toBe('/product/jesus-backpack')
    expect((await get('/p/nope?order=1')).headers.get('location')).toBe('/')
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

describe('rateLimitKey', () => {
  it('groups IPv6 addresses by /64 and keeps IPv4 as is', async () => {
    const { rateLimitKey } = await import('./limits.ts')
    expect(rateLimitKey('203.0.113.7')).toBe('203.0.113.7')
    expect(rateLimitKey('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(rateLimitKey('2001:db8:0:1:aaaa::1')).toBe('2001:db8:0:1::/64')
    expect(rateLimitKey('2001:0DB8:0000:0001:ffff:ffff:ffff:ffff')).toBe('2001:db8:0:1::/64')
    expect(rateLimitKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(rateLimitKey('::1')).toBe('0:0:0:0::/64')
  })
})

describe('order totals', () => {
  it('adds delivery and splits prepayment from cash on pickup', () => {
    expect(orderTotals(4500, 282)).toEqual({ goods: 4500, delivery: 282, total: 4782, prepayment: 0, payOnPickup: 4782 })
    expect(orderTotals(7800, 300, 1000)).toEqual({ goods: 7800, delivery: 300, total: 8100, prepayment: 1000, payOnPickup: 7100 })
    // Предоплата не может превысить сумму заказа и не бывает отрицательной.
    expect(orderTotals(100, 0, 500).payOnPickup).toBe(0)
    expect(orderTotals(100, 0, -5).prepayment).toBe(0)
  })
})

describe('order validation', () => {
  it('normalizes Russian phone numbers', () => {
    expect(normalizeRuPhone('8 (999) 123-45-67')).toBe('+79991234567')
    expect(normalizeRuPhone('+7 999 123 45 67')).toBe('+79991234567')
    expect(normalizeRuPhone('9991234567')).toBe('+79991234567')
    expect(normalizeRuPhone('+380 99 123 45 67')).toBeNull()
    expect(normalizeRuPhone('123')).toBeNull()
  })

  it('requires a pickup point, a city and both consents', () => {
    const r = orderRequestSchema.safeParse({ ...validOrder, pointCode: '', consent: false })
    expect(r.success).toBe(false)
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['pointCode', 'consent']))
    // Город проверяется, когда остальные поля уже в порядке (проверки между полями в zod идут после основных).
    const noCity = orderRequestSchema.safeParse({ ...validOrder, cityCode: 0 })
    expect(noCity.success ? [] : noCity.error.issues.map((i) => i.path[0])).toEqual(['cityCode'])
    expect(orderRequestSchema.safeParse(validOrder).success).toBe(true)
  })
})

describe('cdekWareKey', () => {
  it('fits the 20-character CDEK limit for every product, colour and size', async () => {
    const { cdekWareKey } = await import('./order.ts')
    const { products } = await import('../src/entities/product/model/catalog.ts')
    const keys = products.flatMap((p) => p.colors.flatMap((c) => p.sizes.map((size) => cdekWareKey({ productId: p.id, colorId: c.id, size }))))
    expect(keys.every((k) => k.length <= 20)).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
    expect(cdekWareKey({ productId: 'p4', colorId: 'grey', size: 'XL' })).toBe('p4-grey-XL')
    expect(cdekWareKey({ productId: 'p5', colorId: 'black', size: 'ONE SIZE' })).toBe('p5-black-ONESIZE')
  })
})

describe('buildCdekOrder', () => {
  it('collects goods and delivery on pickup minus prepayment', async () => {
    const { buildCdekOrder } = await import('./cdek.ts')
    const body = buildCdekOrder({
      number: 'SRF-1',
      shipmentPoint: 'MSK65',
      deliveryPoint: 'KZN3',
      sender: { name: 'S', phone: '+70000000000' },
      recipient: { name: 'R', phone: '+79991234567' },
      items: [{ name: 'Худи', wareKey: 'SKU', price: 4500, qty: 2, weightG: 800 }],
      pkg: { weightG: 1600, dimsCm: [30, 25, 16] },
      deliveryCost: 300,
      prepaid: 900,
    })
    expect(body).toMatchObject({ type: 1, tariff_code: 136, delivery_recipient_cost: { value: 300 } })
    expect(body.packages[0]).toMatchObject({ weight: 1600, height: 16 })
    // Предоплата 900 из 9 000 за товары — при получении 90% цены каждой вещи.
    expect(body.packages[0].items[0]).toMatchObject({ payment: { value: 4050 }, cost: 4500, amount: 2, weight: 800 })
  })
})

describe('formatOrderMessage', () => {
  const base: Order = {
    number: 'SRF-1',
    createdAt: '',
    offerAcceptedAt: '',
    consentAt: '',
    documentsVersion: '',
    customer: { name: 'Иван', phone: '+79991234567', telegram: '', comment: '<b>hi</b> & bye' },
    items: [{ productId: 'p2', name: 'Худи The only way', color: 'Серый меланж', size: 'M', qty: 1, price: 4500, sku: 'X' }],
    delivery: {
      cityCode: 424,
      pointCode: 'KZN3',
      point: { city: 'Казань', address: 'ул. Спартаковская, 2', name: 'KZN3', workTime: '' },
      quote: { sum: 282, periodMin: 8, periodMax: 12 },
    },
    totals: orderTotals(4500, 282),
    cdek: { status: 'created', env: 'prod', uuid: 'u', number: '1234567890' },
  }

  it('lists items, delivery, total, pickup point, buyer and CDEK number in separate blocks', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({ ...base, customer: { ...base.customer, telegram: 'ivan_petrov' } })
    expect(text).toMatch(/<b>Худи The only way<\/b>\nСерый меланж · M · 1 шт\. — 4\s500 ₽/)
    expect(text).toContain('Доставка СДЭК: 282 ₽, 8–12 дн.')
    expect(text).toMatch(/<b>Итого: 4\s782 ₽<\/b> — оплата при получении/)
    expect(text).toContain('<b>Пункт выдачи</b>\nКазань, ул. Спартаковская, 2 (KZN3)')
    expect(text).toContain('<b>Покупатель</b>\nИван\n+7 (999) 123-45-67\n@ivan_petrov')
    expect(text).toContain('№ 1234567890 · <a href="https://www.cdek.ru/ru/tracking?order_id=1234567890">отследить</a>')
    expect(text).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye')
    // Без технических строк: ни «тестовой среды», ни id заказа, ни ссылок tel:.
    expect(text).not.toMatch(/тестовая среда|id |tel:/)
    // Блоки разделены пустой строкой.
    expect(text.split('\n\n').length).toBeGreaterThanOrEqual(5)
  })

  it('writes the one-size backpack as «единый размер», like the site', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({ ...base, items: [{ ...base.items[0], name: 'Рюкзак Jesus', color: 'Чёрный', size: 'ONE SIZE' }] })
    expect(text).toContain('Чёрный · единый размер · 1 шт.')
    expect(text).not.toContain('ONE SIZE')
  })

  it('flags orders that CDEK did not accept', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({ ...base, cdek: { status: 'failed', env: 'test', error: 'Неверный ПВЗ <x>' } })
    expect(text).toContain('⚠️ <b>В СДЭК не создан — оформите вручную.</b> Неверный ПВЗ &lt;x&gt;')
  })

  it('fits the Telegram limit without breaking HTML', async () => {
    const { formatOrderMessage } = await import('./telegram.ts')
    const text = formatOrderMessage({ ...base, customer: { ...base.customer, comment: 'x'.repeat(5000) } })
    expect(text.length).toBeLessThanOrEqual(4096)
    expect(text.endsWith('</i>')).toBe(true)
  })
})

describe('personal data minimisation', () => {
  const run = async (telegramOk: boolean) => {
    const { createApi } = await import('./api.ts')
    const { deliveryFrom } = await import('./cdek.ts')
    const saved: Order[] = []
    const tasks: Promise<unknown>[] = []
    // Telegram «падает» подменой fetch только для api.telegram.org.
    const realFetch = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) =>
      String(input).includes('api.telegram.org') && !telegramOk ? Promise.resolve(new Response('fail', { status: 500 })) : realFetch(input, init),
    ))
    const api = createApi({
      ...deliveryFrom({ CDEK_ENV: 'test' }),
      siteOrigin: '',
      telegram: { token: 'test', chatId: '1' },
      clientIp: () => `7.7.7.${telegramOk ? 1 : 2}`,
      allowOrder: () => true,
      saveOrder: async (o) => void saved.push(structuredClone(o)),
      background: (_c, task) => void tasks.push(task),
    })
    const res = await api.request('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validOrder) })
    await Promise.all(tasks)
    vi.stubGlobal('fetch', realFetch)
    return { res, last: saved.at(-1)! }
  }

  it('erases name, phone and Telegram once the order is with CDEK and the seller', async () => {
    const { res, last } = await run(true)
    expect(res.status).toBe(201)
    expect(last.customer).toEqual({ name: '', phone: '', telegram: '', comment: '' })
    expect(last.personalDataRemovedAt).toBeTruthy()
    // Обезличенное остаётся: номер, товары, суммы, ПВЗ, СДЭК, время согласия.
    expect(last).toMatchObject({ items: [expect.objectContaining({ name: 'Худи The only way' })], cdek: { status: 'created' } })
    expect(last.consentAt).toBeTruthy()
    expect(JSON.stringify(last)).not.toMatch(/Иван|9991234567|ivan_petrov/)
  }, 20_000)

  it('keeps contact details when the seller was not notified (manual processing)', async () => {
    const { last } = await run(false)
    expect(last.customer.phone).toBe('+79991234567')
    expect(last.personalDataRemovedAt).toBeUndefined()
  }, 20_000)

  it('Node storage replaces the record and anonymizes failed orders after 30 days', async () => {
    const { saveOrder, pruneOrders } = await import('./storage.ts')
    const { anonymize } = await import('./order.ts')
    const order = { ...lastSaved(), number: 'SRF-PD-1', createdAt: new Date().toISOString(), personalDataRemovedAt: undefined }
    order.customer = { name: 'Пётр', phone: '+79990001122', telegram: 'petr_pd', comment: '' }
    await saveOrder(order)
    await saveOrder(anonymize(order))
    const lines = readFileSync(ordersFile, 'utf8').split('\n').filter((l) => l.includes('SRF-PD-1'))
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toContain('+79990001122')

    await saveOrder({ ...order, number: 'SRF-PD-2' })
    const { anonymized } = await pruneOrders(3 * 365, Date.now() + 31 * 24 * 60 * 60 * 1000)
    expect(anonymized).toBeGreaterThan(0)
    expect(readFileSync(ordersFile, 'utf8')).not.toContain('+79990001122')
  })
})
