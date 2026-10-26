/*
 * Клиент API СДЭК v2: подсказки городов, пункты выдачи, расчёт доставки, создание заказа.
 * Работает и в Node, и в Cloudflare Workers (только fetch). Ключи — из переменных окружения, токен OAuth
 * кешируется до истечения. CDEK_ENV=test — учебная среда api.edu.cdek.ru (заказы в ней не настоящие).
 */

export type CdekEnv = 'test' | 'prod'

export interface CdekConfig {
  env: CdekEnv
  clientId: string
  clientSecret: string
}

const BASE_URL: Record<CdekEnv, string> = {
  test: 'https://api.edu.cdek.ru/v2',
  prod: 'https://api.cdek.ru/v2',
}

/** Публичные ключи учебной среды из документации СДЭК — работают только с api.edu.cdek.ru, не секрет. */
const TEST_CREDENTIALS = { clientId: 'wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP', clientSecret: 'RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5' }

/** Тариф «Посылка склад-склад»: продавец сдаёт в ПВЗ, покупатель забирает в ПВЗ. */
const CDEK_TARIFF = 136

/**
 * Настройки из окружения. Без CDEK_ENV СДЭК выключен: заказ всё равно принимается и уходит в Telegram
 * с пометкой «оформите вручную». Боевая среда — только с явно заданными ключами.
 */
function cdekConfigFrom(env: { CDEK_ENV?: string; CDEK_CLIENT_ID?: string; CDEK_CLIENT_SECRET?: string }): CdekConfig | null {
  if (env.CDEK_ENV === 'test') {
    return {
      env: 'test',
      clientId: env.CDEK_CLIENT_ID || TEST_CREDENTIALS.clientId,
      clientSecret: env.CDEK_CLIENT_SECRET || TEST_CREDENTIALS.clientSecret,
    }
  }
  if (env.CDEK_ENV === 'prod' && env.CDEK_CLIENT_ID && env.CDEK_CLIENT_SECRET) {
    return { env: 'prod', clientId: env.CDEK_CLIENT_ID, clientSecret: env.CDEK_CLIENT_SECRET }
  }
  return null
}

export class CdekError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CdekError'
  }
}

export interface CdekCity {
  code: number
  name: string
}

export interface CdekPoint {
  code: string
  /** Страна пункта (RU, KZ, BY…). */
  countryCode: string
  /** Есть примерочная — можно заказать с примеркой. */
  fitting: boolean
  name: string
  cityCode: number
  city: string
  address: string
  workTime: string
  lat: number
  lon: number
}

export interface CdekQuote {
  /** Стоимость доставки для покупателя, ₽ (с НДС, округлена вверх). */
  sum: number
  periodMin: number
  periodMax: number
}

export interface CdekPackage {
  weightG: number
  /** Длина × ширина × высота, см. */
  dimsCm: readonly [number, number, number]
}

export interface CdekOrderInput {
  number: string
  shipmentPoint: string
  deliveryPoint: string
  sender: { name: string; phone: string }
  recipient: { name: string; phone: string }
  /**
   * Вещи в посылке: price — объявленная стоимость штуки, ₽ (страховка); cod — оплата за штуку при получении
   * в валюте страны получателя (₽, в Казахстане ₸); вес — одной штуки, г.
   */
  items: { name: string; wareKey: string; price: number; cod: number; qty: number; weightG: number }[]
  /** Посылка целиком: суммарный вес и габариты. */
  pkg: CdekPackage
  /** Сколько покупатель платит за доставку при получении — в валюте страны получателя. */
  deliveryCost: number
  /** Примерка в пункте выдачи с частичным выкупом: покупатель оплачивает только то, что забрал. */
  tryOn?: boolean
  /** Сколько покупатель уже оплатил заранее, ₽ (вычитается из наложенного платежа за товар пропорционально). */
  prepaid: number
}

export interface CdekOrderState {
  state: 'pending' | 'ready' | 'invalid'
  cdekNumber?: string
  error?: string
}

type Fetch = typeof fetch

interface RawError {
  code?: string
  message?: string
}

/** Тело заказа для POST /v2/orders. Чистая функция — проверяется тестами без сети. */
export function buildCdekOrder(o: CdekOrderInput) {
  const [length, width, height] = o.pkg.dimsCm
  // Наложенный платёж: за товары покупатель платит при получении всё, кроме предоплаты (вычитается пропорционально цене).
  const goods = o.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const codShare = goods > 0 ? Math.max(0, 1 - o.prepaid / goods) : 0
  return {
    type: 1, // интернет-магазин
    number: o.number,
    tariff_code: CDEK_TARIFF,
    shipment_point: o.shipmentPoint,
    delivery_point: o.deliveryPoint,
    delivery_recipient_cost: { value: o.deliveryCost },
    ...(o.tryOn ? { services: [{ code: 'TRYING_ON' }, { code: 'PART_DELIV' }] } : {}),
    sender: { name: o.sender.name, phones: [{ number: o.sender.phone }] },
    recipient: { name: o.recipient.name, phones: [{ number: o.recipient.phone }] },
    packages: [
      {
        number: '1',
        weight: o.pkg.weightG,
        length,
        width,
        height,
        items: o.items.map((i) => ({
          name: i.name,
          // Лимит API v2 — 20 символов (иначе заказ отклоняется).
          ware_key: i.wareKey.slice(0, 20),
          payment: { value: Math.round(i.cod * codShare * 100) / 100 },
          cost: i.price,
          weight: i.weightG,
          amount: i.qty,
        })),
      },
    ],
  }
}

const tokens = new Map<string, { value: string; expiresAt: number }>()

export class CdekClient {
  private readonly base: string
  private readonly config: CdekConfig
  private readonly fetchImpl: Fetch

  constructor(config: CdekConfig, fetchImpl?: Fetch) {
    this.config = config
    this.base = BASE_URL[config.env]
    // Через обёртку: в Cloudflare Workers fetch, сохранённый в поле объекта и вызванный как метод, падает с Illegal invocation.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init))
  }

  get env(): CdekEnv {
    return this.config.env
  }

  private async token(): Promise<string> {
    const key = `${this.config.env}:${this.config.clientId}`
    const cached = tokens.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const res = await this.fetchImpl(`${this.base}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number }
    if (!res.ok || !data.access_token) throw new CdekError(`СДЭК: не удалось авторизоваться (${res.status})`)
    // Минута запаса, чтобы токен не истёк посреди запроса.
    tokens.set(key, { value: data.access_token, expiresAt: Date.now() + Math.max(0, (data.expires_in ?? 3600) - 60) * 1000 })
    return data.access_token
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method,
      headers: { authorization: `Bearer ${await this.token()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const data = (await res.json().catch(() => null)) as (T & { errors?: RawError[]; requests?: { errors?: RawError[] }[] }) | null
    if (!res.ok || data === null) {
      const errors = data?.errors ?? data?.requests?.flatMap((r) => r.errors ?? []) ?? []
      throw new CdekError(errors.map((e) => e.message ?? e.code).join('; ') || `СДЭК: ошибка ${res.status}`)
    }
    return data
  }

  async suggestCities(name: string, countryCode = 'RU'): Promise<CdekCity[]> {
    const q = new URLSearchParams({ name, country_code: countryCode })
    const list = await this.request<{ code: number; full_name: string }[]>('GET', `/location/suggest/cities?${q}`)
    return list.slice(0, 10).map((c) => ({ code: c.code, name: c.full_name }))
  }

  /** Пункты выдачи города; cod — только те, где можно оплатить при получении (не нужно при предоплате). */
  async points(cityCode: number, { cod = true } = {}): Promise<CdekPoint[]> {
    const q = new URLSearchParams({ city_code: String(cityCode), type: 'PVZ', is_handout: 'true', ...(cod ? { allowed_cod: 'true' } : {}) })
    const list = await this.request<RawPoint[]>('GET', `/deliverypoints?${q}`)
    return list.filter((p) => (!cod || p.allowed_cod !== false) && p.is_handout !== false).map(toPoint)
  }

  async point(code: string): Promise<CdekPoint | null> {
    const list = await this.request<RawPoint[]>('GET', `/deliverypoints?${new URLSearchParams({ code })}`)
    return list[0] ? toPoint(list[0]) : null
  }

  async quote(fromCity: number, toCity: number, pkg: CdekPackage): Promise<CdekQuote> {
    const [length, width, height] = pkg.dimsCm
    const data = await this.request<{ total_sum?: number; delivery_sum?: number; period_min?: number; period_max?: number }>(
      'POST',
      '/calculator/tariff',
      {
        tariff_code: CDEK_TARIFF,
        from_location: { code: fromCity },
        to_location: { code: toCity },
        packages: [{ weight: pkg.weightG, length, width, height }],
      },
    )
    const sum = data.total_sum ?? data.delivery_sum
    if (sum === undefined) throw new CdekError('СДЭК не рассчитал доставку')
    return { sum: Math.ceil(sum), periodMin: data.period_min ?? 0, periodMax: data.period_max ?? data.period_min ?? 0 }
  }

  /** Создаёт заказ. СДЭК проверяет его асинхронно — итог узнаём через orderState(uuid). */
  async createOrder(input: CdekOrderInput): Promise<string> {
    const data = await this.request<{ entity?: { uuid?: string }; requests?: { state?: string; errors?: RawError[] }[] }>(
      'POST',
      '/orders',
      buildCdekOrder(input),
    )
    const request = data.requests?.[0]
    if (request?.state === 'INVALID') {
      throw new CdekError(request.errors?.map((e) => e.message ?? e.code).join('; ') || 'СДЭК отклонил заказ')
    }
    if (!data.entity?.uuid) throw new CdekError('СДЭК не вернул идентификатор заказа')
    return data.entity.uuid
  }

  async orderState(uuid: string): Promise<CdekOrderState> {
    const data = await this.request<{
      entity?: { cdek_number?: string | number }
      requests?: { type?: string; state?: string; errors?: RawError[] }[]
    }>('GET', `/orders/${encodeURIComponent(uuid)}`)
    const create = data.requests?.find((r) => r.type === 'CREATE') ?? data.requests?.[0]
    if (create?.state === 'INVALID') {
      return { state: 'invalid', error: create.errors?.map((e) => e.message ?? e.code).join('; ') || 'СДЭК отклонил заказ' }
    }
    const number = data.entity?.cdek_number
    return number ? { state: 'ready', cdekNumber: String(number) } : { state: 'pending' }
  }
}

interface RawPoint {
  code: string
  name?: string
  work_time?: string
  allowed_cod?: boolean
  is_handout?: boolean
  is_dressing_room?: boolean
  location: { country_code?: string; city_code: number; city: string; address?: string; address_full?: string; latitude: number; longitude: number }
}

const toPoint = (p: RawPoint): CdekPoint => ({
  code: p.code,
  countryCode: p.location.country_code ?? 'RU',
  fitting: p.is_dressing_room === true,
  name: p.name ?? p.code,
  cityCode: p.location.city_code,
  city: p.location.city,
  address: p.location.address ?? p.location.address_full ?? '',
  workTime: p.work_time ?? '',
  lat: p.location.latitude,
  lon: p.location.longitude,
})

/** Ссылка на отслеживание для сообщения продавцу. */
export const cdekTrackingUrl = (cdekNumber: string) => `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(cdekNumber)}`

export interface DeliveryEnv {
  CDEK_ENV?: string
  CDEK_CLIENT_ID?: string
  CDEK_CLIENT_SECRET?: string
  SENDER_NAME?: string
  SENDER_PHONE?: string
  SENDER_PVZ_CODE?: string
}

/** Тестовый отправитель для учебной среды: ПВЗ MSK65 есть в api.edu.cdek.ru. */
const TEST_SENDER = { name: 'SERAFIM (тест)', phone: '+79990000000', pointCode: 'MSK65' }

/**
 * СДЭК и отправитель из окружения — одинаково для Node и Cloudflare. В боевой среде без ПВЗ, имени
 * и телефона отправителя СДЭК не включается: заказ без них не создать, а покупатель получил бы ошибку.
 */
export function deliveryFrom(env: DeliveryEnv, fetchImpl?: typeof fetch) {
  const config = cdekConfigFrom(env)
  const sender = {
    name: env.SENDER_NAME?.trim() || (config?.env === 'test' ? TEST_SENDER.name : ''),
    phone: env.SENDER_PHONE?.trim() || (config?.env === 'test' ? TEST_SENDER.phone : ''),
    pointCode: env.SENDER_PVZ_CODE?.trim() || (config?.env === 'test' ? TEST_SENDER.pointCode : ''),
  }
  const complete = Boolean(sender.name && sender.phone && sender.pointCode)
  if (config && !complete) console.warn('[cdek] не заданы SENDER_NAME / SENDER_PHONE / SENDER_PVZ_CODE — СДЭК выключен')
  return { cdek: config && complete ? new CdekClient(config, fetchImpl) : null, sender }
}
