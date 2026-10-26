import { site } from '../src/shared/config/site.ts'

/*
 * Наложенный платёж в Казахстане СДЭК принимает в тенге. Цены сайта в рублях — переводим по курсу ЦБ РФ
 * (зеркало cbr-xml-daily.ru: JSON и без блокировок зарубежных IP, как бывает у cbr.ru) с запасом на конвертацию.
 */

const RATE_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'
const RATE_TTL_MS = 6 * 60 * 60_000

let cached: { rate: number; at: number } | null = null

/** Сколько тенге за рубль по курсу ЦБ. Кеш 6 часов: ЦБ меняет курс раз в день. */
export async function kztPerRub(): Promise<number> {
  if (cached && Date.now() - cached.at < RATE_TTL_MS) return cached.rate
  const res = await fetch(RATE_URL, { signal: AbortSignal.timeout(8_000) })
  const data = (await res.json().catch(() => null)) as { Valute?: { KZT?: { Nominal?: number; Value?: number } } } | null
  const kzt = data?.Valute?.KZT
  if (!res.ok || !kzt?.Value || !kzt.Nominal) throw new Error('Не удалось получить курс тенге')
  cached = { rate: kzt.Nominal / kzt.Value, at: Date.now() }
  return cached.rate
}

/** Рубли → тенге для оплаты при получении: курс с запасом site.shipping.kzt, вверх до roundTo. */
function toKzt(rub: number, rate: number): number {
  const { markupPercent, roundTo } = site.shipping.kzt
  return Math.ceil((rub * rate * (100 + markupPercent)) / 100 / roundTo) * roundTo
}

/** Наложенный платёж в валюте покупателя: за каждую вещь (за штуку) и за доставку; rate — тенге за рубль, без него — рубли. */
export function codAmounts(items: { price: number; qty: number }[], deliveryRub: number, rate?: number) {
  const conv = (rub: number) => (rate ? toKzt(rub, rate) : rub)
  const units = items.map((i) => conv(i.price))
  const delivery = conv(deliveryRub)
  return { units, delivery, total: units.reduce((sum, u, i) => sum + u * items[i].qty, 0) + delivery }
}
