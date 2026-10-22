/*
 * Доставка СДЭК для формы заказа: подсказки городов, пункты выдачи, расчёт. Ключи СДЭК — только на сервере,
 * сайт обращается к своему /api/cdek/*. Ошибка «СДЭК недоступен» — DeliveryUnavailableError: форма переходит
 * в ручной режим (покупатель пишет город и пункт сам), заказ не теряется.
 */
import type { OrderTotals } from '../model/pricing'

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

export const fetchCities = (q: string, signal?: AbortSignal) =>
  getJson<{ cities: City[] }>(`/api/cdek/cities?${new URLSearchParams({ q })}`, signal).then((d) => d.cities)

export const fetchPoints = (cityCode: number, signal?: AbortSignal) =>
  getJson<{ points: PickupPoint[] }>(`/api/cdek/points?city=${cityCode}`, signal).then((d) => d.points)

export const fetchQuote = (productId: string, qty: number, cityCode: number, signal?: AbortSignal) =>
  getJson<{ quote: DeliveryQuote; totals: OrderTotals }>(
    `/api/cdek/quote?${new URLSearchParams({ product: productId, qty: String(qty), city: String(cityCode) })}`,
    signal,
  )
