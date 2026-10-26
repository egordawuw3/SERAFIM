import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { COUNTRIES, type CountryCode } from '../src/entities/order/model/countries.ts'
import { orderTotals } from '../src/entities/order/model/pricing.ts'
import {
  ORDER_FORM_FIELDS,
  orderRequestSchema,
  type ApiError,
  type OrderResponse,
  MANUAL_POINT,
} from '../src/entities/order/model/schema.ts'
import { MAX_ITEM_QTY } from '../src/entities/order/model/limits.ts'
import { shortLinkTarget } from '../src/entities/product/lib/shortLink.ts'
import { products } from '../src/entities/product/model/catalog.ts'
import { site } from '../src/shared/config/site.ts'
import { CdekError, type CdekClient, type CdekPoint, type CdekQuote } from './cdek.ts'
import { codAmounts, kztPerRub } from './currency.ts'
import { rateLimitKey } from './limits.ts'
import {
  anonymize,
  canAnonymizeNow,
  createOrder,
  orderPayment,
  OrderValidationError,
  packageFor,
  resolveItems,
  sizeLabel,
  cdekWareKey,
  unitPackage,
  type Order,
  type OrderCdek,
  type OrderDelivery,
} from './order.ts'
import { createRateLimiter } from './rateLimit.ts'
import { SECURITY_HEADERS } from './securityHeaders.ts'
import { mergeStockLines, type StockStore } from './stock.ts'
import { handleBotUpdate } from './bot.ts'
import { formatOrderMessage, sendToTelegram, type TelegramConfig } from './telegram.ts'

/*
 * API магазина без привязки к площадке. Что зависит от неё — хранение заказов, лимит, IP посетителя, фоновые задачи —
 * передаётся снаружи: Node-сервер (app.ts, Docker) пишет в файл, Cloudflare (worker.ts) — в базу D1.
 */
export interface ApiPlatform extends StockStore {
  /** Адрес сайта, например https://serafim.ru. Если задан — изменяющие запросы с другим Origin отклоняются. */
  siteOrigin: string
  telegram: TelegramConfig
  /** null — СДЭК не подключён: заказы принимаются и уходят в Telegram с пометкой «оформите вручную». */
  cdek: CdekClient | null
  /** Отправитель для СДЭК: ПВЗ, куда продавец сдаёт посылки, имя и телефон. */
  sender: { name: string; phone: string; pointCode: string }
  clientIp(c: Context): string
  /** true — заказ с этого IP укладывается в лимит. */
  allowOrder(ip: string): boolean | Promise<boolean>
  /** Сохраняет заказ; повторный вызов с тем же номером обновляет запись (номер СДЭК приходит позже). */
  saveOrder(order: Order): Promise<void>
  /** Задача после ответа покупателю: ждать номер СДЭК и написать продавцу (в Workers — waitUntil). */
  background(c: Context, task: Promise<unknown>): void
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Сравнение секретов за одинаковое время — по скорости ответа секрет не подобрать. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < b.length; i++) diff |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i)
  return diff === 0
}
const formFields = new Set<string>(ORDER_FORM_FIELDS)

/** Сколько ждать, пока СДЭК присвоит заказу номер: 8 проверок раз в 2 с. */
const CDEK_POLL = { attempts: 8, intervalMs: 2_000 }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Небольшой кеш ответов СДЭК: города и ПВЗ меняются редко, а лимиты API не бесконечны. */
function ttlCache<T>(ttlMs: number, maxEntries = 500) {
  const map = new Map<string, { value: Promise<T>; expiresAt: number }>()
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = map.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.value
    if (map.size >= maxEntries) map.delete(map.keys().next().value as string)
    const value = load()
    map.set(key, { value, expiresAt: Date.now() + ttlMs })
    // Ошибку не кешируем — следующий запрос попробует снова.
    value.catch(() => map.delete(key))
    return value
  }
}

export function createApi(platform: ApiPlatform): Hono {
  const app = new Hono()
  const telegramConfigured = Boolean(platform.telegram.token && platform.telegram.chatId)
  const { cdek, sender } = platform

  const citiesCache = ttlCache<{ code: number; name: string }[]>(60 * 60_000)
  const pointsCache = ttlCache<CdekPoint[]>(60 * 60_000)
  const pointCache = ttlCache<CdekPoint | null>(60 * 60_000)
  const quoteCache = ttlCache<CdekQuote>(15 * 60_000)
  // Подсказки и расчёт — без записи, но каждый запрос стоит обращения к СДЭК: ограничиваем частоту с одного IP.
  const allowLookup = createRateLimiter({ max: 120, windowMs: 10 * 60_000, maxKeys: 10_000 })

  const senderCity = async (): Promise<number> => {
    const point = await pointCache(sender.pointCode, () => cdek!.point(sender.pointCode))
    if (!point) throw new CdekError(`ПВЗ отправителя ${sender.pointCode} не найден в СДЭК`)
    return point.cityCode
  }

  /**
   * Доставка посылки из этих вещей в город — тариф СДЭК с наценкой deliveryMarkupPercent (вверх до рубля).
   * Ключ кеша — состав посылки, а не порядок позиций.
   */
  const quoteFor = async (lines: { product: (typeof products)[number]; qty: number }[], toCity: number): Promise<CdekQuote> => {
    const from = await senderCity()
    const key = lines.map((l) => `${l.product.id}*${l.qty}`).sort().join(',')
    const quote = await quoteCache(`${key}:${toCity}`, () => cdek!.quote(from, toCity, packageFor(lines)))
    return { ...quote, sum: Math.ceil((quote.sum * (100 + site.shipping.deliveryMarkupPercent)) / 100) }
  }

  app.use('*', async (c, next) => {
    await next()
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.header(name, value)
  })

  /*
   * Защита от подделки запросов с чужих сайтов (CSRF): HTML-форма с любого сайта может отправить POST,
   * но только как form-data или text/plain. Поэтому изменяющие запросы принимаем только в JSON
   * (кросс-доменный JSON браузер без разрешения CORS не отправит) и отклоняем всё, что браузер пометил
   * как пришедшее с другого сайта. Серверные уведомления (вебхуки) Sec-Fetch-Site не присылают и проходят.
   */
  const guardMutations = createMiddleware(async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next()
    const fetchSite = c.req.header('sec-fetch-site')
    const origin = c.req.header('origin')
    const crossSite =
      (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') ||
      (platform.siteOrigin && origin && origin !== platform.siteOrigin)
    if (crossSite) return c.json<ApiError>({ error: 'Запрос с другого сайта отклонён' }, 403)
    if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
      return c.json<ApiError>({ error: 'Ожидается JSON' }, 415)
    }
    await next()
  })
  app.use('/api/*', guardMutations)

  app.get('/api/health', (c) => c.json({ ok: true }))

  // Отдельной страницы каталога больше нет — он на главной. Постоянный редирект: поисковики переносят адрес, фильтры сохраняются.
  app.get('/catalog', (c) => c.redirect(`/${new URL(c.req.url).search}#catalog`, 301))

  // Короткая ссылка из переписки: /p/p2?size=M&order=1 → сразу форма заказа с размером (без загрузки лишней страницы).
  app.get('/p/:id', (c) => c.redirect(shortLinkTarget(c.req.param('id'), new URL(c.req.url).searchParams), 302))

  // ---------- Доставка СДЭК: подсказки и расчёт для формы заказа ----------

  /** ?country=KZ — страна доставки; неизвестная или без параметра — Россия. */
  const countryParam = (c: Context): CountryCode => {
    const v = c.req.query('country')?.toUpperCase()
    return v && v in COUNTRIES ? (v as CountryCode) : 'RU'
  }

  const deliveryUnavailable = (c: Context) =>
    c.json<ApiError>({ error: 'Расчёт доставки СДЭК сейчас недоступен. Оформите заказ — мы посчитаем доставку сами.' }, 503)

  app.use('/api/cdek/*', async (c, next) => {
    if (!allowLookup(rateLimitKey(platform.clientIp(c)))) return c.json<ApiError>({ error: 'Слишком много запросов' }, 429)
    if (!cdek) return deliveryUnavailable(c)
    await next()
  })

  // Остатки для сайта: размер с нулём — «нет в наличии», с малым остатком — «осталось N шт.». Без кеша: остаток меняется с каждым заказом.
  app.get('/api/stock', async (c) => {
    c.header('cache-control', 'no-store')
    return c.json({ left: await platform.stock() })
  })

  app.get('/api/cdek/cities', async (c) => {
    const q = (c.req.query('q') ?? '').trim()
    const country = countryParam(c)
    if (q.length < 2 || q.length > 60) return c.json({ cities: [] })
    try {
      return c.json({ cities: await citiesCache(`${country}:${q.toLowerCase()}`, () => cdek!.suggestCities(q, country)) })
    } catch (err) {
      console.error('[cdek] cities', err)
      return deliveryUnavailable(c)
    }
  })

  app.get('/api/cdek/points', async (c) => {
    const city = Number(c.req.query('city'))
    if (!Number.isInteger(city) || city <= 0) return c.json<ApiError>({ error: 'Не указан город' }, 400)
    try {
      // При предоплате (Беларусь) годится любой пункт выдачи, при оплате на месте — только с наложенным платежом.
      const cod = COUNTRIES[countryParam(c)].payment === 'cod'
      return c.json({ points: await pointsCache(`${city}:${cod}`, () => cdek!.points(city, { cod })) })
    } catch (err) {
      console.error('[cdek] points', err)
      return deliveryUnavailable(c)
    }
  })

  // ?city=424&items=p2:1,p5:2 — товары и количество (размер на вес не влияет).
  app.get('/api/cdek/quote', async (c) => {
    const city = Number(c.req.query('city'))
    const lines = (c.req.query('items') ?? '')
      .split(',')
      .slice(0, 30)
      .map((part) => {
        const [id, n] = part.split(':')
        return { product: products.find((p) => p.id === id), qty: Number(n) }
      })
    const valid = lines.length > 0 && lines.every((l) => l.product && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= MAX_ITEM_QTY)
    if (!valid || !Number.isInteger(city) || city <= 0) return c.json<ApiError>({ error: 'Некорректный запрос' }, 400)
    const known = lines as { product: (typeof products)[number]; qty: number }[]
    try {
      const country = countryParam(c)
      const quote = await quoteFor(known, city)
      const goods = known.reduce((sum, l) => sum + l.product.price * l.qty, 0)
      const totals = orderTotals(goods, quote.sum, site.shipping.prepaymentAmount)
      const rate = COUNTRIES[country].currency === 'KZT' ? await kztPerRub() : undefined
      const { method, currency, amount } = orderPayment(country, known.map((l) => ({ price: l.product.price, qty: l.qty })), totals, rate)
      return c.json({ quote, totals, payment: { method, currency, amount } })
    } catch (err) {
      console.error('[cdek] quote', err)
      return deliveryUnavailable(c)
    }
  })

  // ---------- Заказ ----------

  const limitBody = bodyLimit({
    maxSize: 32 * 1024,
    onError: (c) => c.json<ApiError>({ error: 'Слишком большой запрос' }, 413),
  })

  /** Ждёт номер СДЭК (или отказ), сохраняет итог и пишет продавцу. Ошибки — только в лог: заказ уже сохранён. */
  async function finishOrder(order: Order): Promise<void> {
    const uuid = order.cdek.uuid
    if (cdek && order.cdek.status === 'created' && uuid) {
      for (let i = 0; i < CDEK_POLL.attempts; i++) {
        await sleep(CDEK_POLL.intervalMs)
        try {
          const state = await cdek.orderState(uuid)
          if (state.state === 'ready') {
            order.cdek.number = state.cdekNumber
            break
          }
          if (state.state === 'invalid') {
            order.cdek = { ...order.cdek, status: 'failed', error: state.error }
            break
          }
        } catch (err) {
          console.error(`[orders] ${order.number}: не удалось узнать статус в СДЭК`, err)
        }
      }
      await platform.saveOrder(order).catch((err) => console.error(`[orders] ${order.number}: не удалось обновить`, err))
    }
    let sent = false
    if (!telegramConfigured) {
      // Только номер: логи площадки (панель Cloudflare, журнал Docker) — не место для имён и телефонов.
      console.info(`[orders] ${order.number} сохранён (Telegram не настроен — уведомление не отправлено)`)
    } else {
      try {
        await sendToTelegram(formatOrderMessage(order), platform.telegram)
        sent = true
      } catch (err) {
        console.error(`[orders] ${order.number}: не удалось отправить в Telegram`, err)
      }
      // Помощникам (TELEGRAM_ADMIN_IDS) — копия без покупателя: его данные получает только продавец (согласие на обработку).
      for (const id of (platform.telegram.adminIds ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
        await sendToTelegram(formatOrderMessage(anonymize(order), { withCustomer: false }), { ...platform.telegram, chatId: id }).catch((err) =>
          console.error(`[orders] ${order.number}: копия помощнику не отправлена`, err),
        )
      }
    }
    // Заказ у СДЭК и у продавца — персональные данные на сервере сайта больше не нужны. Сбойные заказы остаются
    // с данными для ручного оформления и обезличиваются ежедневной чисткой через PERSONAL_DATA_RETENTION_DAYS.
    if (canAnonymizeNow(order, sent)) {
      await platform.saveOrder(anonymize(order)).catch((err) => console.error(`[orders] ${order.number}: не удалось обезличить`, err))
    }
  }

  // Вебхук бота продавца: Telegram подписывает запросы секретом, заданным при setWebhook (npm run bot:setup).
  // Отвечаем сразу, команду выполняем в фоне — иначе Telegram повторит запрос.
  app.post('/api/telegram', limitBody, async (c) => {
    const secret = platform.telegram.webhookSecret
    if (!secret || !safeEqual(c.req.header('x-telegram-bot-api-secret-token') ?? '', secret)) return c.json<ApiError>({ error: 'Нет доступа' }, 403)
    const update: unknown = await c.req.json().catch(() => null)
    platform.background(c, handleBotUpdate(update, platform).catch((err) => console.error('[bot]', err)))
    return c.json({ ok: true })
  })

  app.post('/api/orders', limitBody, async (c) => {
    const body: unknown = await c.req.json().catch(() => null)
    // Honeypot: скрытое поле, которое заполняют только боты. Бот проходит те же проверки и получает
    // правдоподобный ответ — но заказ не сохраняется, не создаётся в СДЭК и не уходит в Telegram.
    const isBot = Boolean(body && typeof body === 'object' && 'website' in body && body.website)

    if (!(await platform.allowOrder(rateLimitKey(platform.clientIp(c))))) {
      return c.json<ApiError>({ error: 'Слишком много заказов. Попробуйте позже или напишите нам в Telegram.' }, 429)
    }

    const parsed = orderRequestSchema.safeParse(body)
    if (!parsed.success) {
      // Наружу — только наши сообщения по полям формы; внутренние тексты валидатора не показываем.
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (formFields.has(key)) fields[key] ??= issue.message
        else fields.form ??= 'Не удалось обработать заказ. Обновите страницу и попробуйте ещё раз.'
      }
      return c.json<ApiError>({ error: 'Проверьте поля формы', fields }, 400)
    }
    const input = parsed.data

    let resolved
    try {
      resolved = resolveItems(input.items)
    } catch (err) {
      if (err instanceof OrderValidationError) return c.json<ApiError>({ error: err.message }, 409)
      throw err
    }
    const items = resolved.map((r) => r.item)
    const lines = resolved.map((r) => ({ product: r.product, qty: r.item.qty }))

    const respond = (order: Order) =>
      c.json<OrderResponse>(
        {
          number: order.number,
          total: order.totals.total,
          payOnPickup: order.totals.payOnPickup,
          payment: { method: order.payment!.method, currency: order.payment!.currency, amount: order.payment!.amount },
          cdekCreated: order.cdek.status === 'created',
        },
        201,
      )

    const manual = input.pointCode === MANUAL_POINT
    const delivery: OrderDelivery = {
      cityCode: input.cityCode,
      pointCode: input.pointCode,
      ...(manual ? { note: input.deliveryNote } : {}),
      ...(input.tryOn ? { tryOn: { fee: site.shipping.tryOn.fee } } : {}),
    }
    let cdekState: OrderCdek = manual
      ? { status: 'failed', env: cdek?.env, error: 'пункт выдачи не выбран на сайте — покупатель указал его сам' }
      : { status: 'off' }

    if (isBot) return respond(createOrder(input, items, delivery, cdekState))

    // Пункт выдачи и доставку сервер проверяет и считает сам: суммы из браузера не принимаются на веру.
    // Если СДЭК недоступен — заказ всё равно принимается и уходит продавцу с пометкой «оформите вручную».
    let kztRate: number | undefined
    if (cdek && !manual) {
      cdekState = { status: 'failed', env: cdek.env }
      try {
        const point = await pointCache(input.pointCode, () => cdek.point(input.pointCode))
        if (!point || point.cityCode !== input.cityCode || point.countryCode !== input.country) {
          return c.json<ApiError>({ error: 'Проверьте поля формы', fields: { pointCode: 'Пункт выдачи не найден — выберите другой' } }, 400)
        }
        if (input.tryOn && !point.fitting) {
          return c.json<ApiError>({ error: 'Проверьте поля формы', fields: { pointCode: 'В этом пункте нет примерочной — выберите другой' } }, 400)
        }
        delivery.point = { city: point.city, address: point.address, name: point.name, workTime: point.workTime }
        delivery.quote = await quoteFor(lines, input.cityCode)
        if (COUNTRIES[input.country].currency === 'KZT') kztRate = await kztPerRub()
      } catch (err) {
        console.error('[orders] СДЭК: проверка пункта, расчёт доставки или курс тенге', err)
        cdekState.error = err instanceof CdekError ? err.message : kztRate === undefined && delivery.quote ? 'не удалось получить курс тенге' : 'СДЭК недоступен'
      }
    }
    // Беларусь: наложенного платежа нет — продавец берёт оплату переводом и оформляет посылку сам.
    const prepay = COUNTRIES[input.country].payment === 'prepay'
    if (prepay && !manual) cdekState = { status: 'prepay', env: cdek?.env }

    // Остаток списывается последним, когда заказ точно принимается (пункт выдачи проверен).
    const taken = await platform.takeStock(mergeStockLines(items.map((i) => ({ sku: i.sku, qty: i.qty }))))
    if (!taken.ok) {
      const item = items.find((i) => i.sku === taken.sku)!
      const what = `${item.name} (${item.color.toLowerCase()}, ${sizeLabel(item.size)})`
      return c.json<ApiError>(
        { error: taken.left ? `${what}: осталось только ${taken.left} шт. Уменьшите количество в корзине.` : `${what} закончился. Уберите его из корзины.` },
        409,
      )
    }
    for (const i of items) if (i.sku in taken.left) i.left = taken.left[i.sku]

    const order = createOrder(input, items, delivery, cdekState, kztRate)

    const needsRate = COUNTRIES[input.country].currency === 'KZT'
    if (cdek && delivery.quote && !prepay && (!needsRate || kztRate)) {
      // Наложенный платёж — в валюте страны получателя (Казахстан — тенге).
      const cod = codAmounts(items, order.totals.delivery, kztRate)
      try {
        const uuid = await cdek.createOrder({
          number: order.number,
          shipmentPoint: sender.pointCode,
          deliveryPoint: input.pointCode,
          sender: { name: sender.name, phone: sender.phone },
          recipient: { name: input.name, phone: input.phone },
          items: resolved.map(({ product, item }, i) => ({
            name: `${item.name}, ${item.color.toLowerCase()}, ${sizeLabel(item.size)}`,
            wareKey: cdekWareKey({ ...item, colorId: input.items[i].colorId }),
            price: item.price,
            cod: cod.units[i],
            qty: item.qty,
            weightG: unitPackage(product).weightG,
          })),
          pkg: packageFor(lines),
          deliveryCost: cod.delivery,
          tryOn: input.tryOn,
          prepaid: order.totals.prepayment,
        })
        order.cdek = { status: 'created', env: cdek.env, uuid }
      } catch (err) {
        console.error(`[orders] ${order.number}: СДЭК не создал заказ`, err)
        order.cdek = { status: 'failed', env: cdek.env, error: err instanceof CdekError ? err.message : 'СДЭК недоступен' }
      }
    }

    await platform.saveOrder(order)
    platform.background(c, finishOrder(order))
    return respond(order)
  })

  app.all('/api/*', (c) => c.json<ApiError>({ error: 'Not found' }, 404))

  app.onError((err, c) => {
    // Штатные ошибки фреймворка (413, 400…) отдаём с их кодом; подробности и стек — только в лог сервера.
    if (err instanceof HTTPException && err.status < 500) {
      return c.json<ApiError>({ error: 'Некорректный запрос' }, err.status)
    }
    console.error('[server]', err)
    return c.json<ApiError>({ error: 'Что-то пошло не так. Попробуйте ещё раз.' }, 500)
  })

  return app
}
