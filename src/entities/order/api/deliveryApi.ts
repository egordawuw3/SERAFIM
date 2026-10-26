/*
 * Доставка СДЭК для формы заказа: подсказки городов, пункты выдачи, расчёт. Ключи СДЭК — только на сервере,
 * сайт обращается к своему /api/cdek/*. Ошибка «СДЭК недоступен» — DeliveryUnavailableError: форма переходит
 * в ручной режим (покупатель пишет город и пункт сам), заказ не теряется.
 */
import type { CountryCode } from '../model/countries'
import type { OrderTotals } from '../model/pricing'
import type { OrderPayment } from '../model/schema'

export interface City {
  code: number
  name: string
}

export interface PickupPoint {
  code: string
  name: string
  cityCode: number
  city: string
  address: string
  workTime: string
  lat: number
  lon: number
  /** Есть примерочная. */
  fitting: boolean
}

export interface DeliveryQuote {
  sum: number
  periodMin: number
  periodMax: number
}

export class DeliveryUnavailableError extends Error {}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new DeliveryUnavailableError('Нет соединения')
  }
  if (res.status === 503) throw new DeliveryUnavailableError('СДЭК недоступен')
  if (!res.ok) throw new Error(`Ошибка ${res.status}`)
  return (await res.json()) as T
}

export const fetchCities = (q: string, country: CountryCode, signal?: AbortSignal) =>
  getJson<{ cities: City[] }>(`/api/cdek/cities?${new URLSearchParams({ q, country })}`, signal).then((d) => d.cities)

export const fetchPoints = (cityCode: number, country: CountryCode, signal?: AbortSignal) =>
  getJson<{ points: PickupPoint[] }>(`/api/cdek/points?city=${cityCode}&country=${country}`, signal).then((d) => d.points)

/** Доставка посылки из этих вещей (одна посылка на весь заказ). */
export const fetchQuote = (items: { productId: string; qty: number }[], cityCode: number, country: CountryCode, signal?: AbortSignal) =>
  getJson<{ quote: DeliveryQuote; totals: OrderTotals; payment: OrderPayment }>(
    `/api/cdek/quote?${new URLSearchParams({ items: items.map((i) => `${i.productId}:${i.qty}`).join(','), city: String(cityCode), country })}`,
    signal,
  )
