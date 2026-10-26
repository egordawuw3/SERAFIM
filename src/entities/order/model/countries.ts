/*
 * Страны доставки. Россия и Казахстан — наложенный платёж СДЭК (в Казахстане — в тенге), Беларусь — по договору
 * СДЭК наложенного платежа нет: покупатель платит продавцу переводом до отправки, посылку продавец оформляет сам.
 * Общий для сайта и сервера: без зависимостей.
 */
export const COUNTRIES = {
  RU: { name: 'Россия', payment: 'cod', currency: 'RUB', phonePlaceholder: '+7 (900) 000-00-00', phoneExample: '+7 900 000-00-00' },
  KZ: { name: 'Казахстан', payment: 'cod', currency: 'KZT', phonePlaceholder: '+7 (700) 000-00-00', phoneExample: '+7 700 000-00-00' },
  BY: { name: 'Беларусь', payment: 'prepay', currency: 'RUB', phonePlaceholder: '+375 (29) 000-00-00', phoneExample: '+375 29 000-00-00' },
} as const

export type CountryCode = keyof typeof COUNTRIES
export const COUNTRY_CODES = ['RU', 'KZ', 'BY'] as const satisfies readonly CountryCode[]

/** Номер в международном виде (+7…, +375…) или null. Россия и Казахстан — +7, принимаются 8… и номер без кода. */
export function normalizePhone(input: string, country: CountryCode): string | null {
  const digits = input.replace(/\D/g, '')
  if (country === 'BY') {
    if (digits.length === 12 && digits.startsWith('375')) return `+${digits}`
    if (digits.length === 11 && digits.startsWith('80')) return `+375${digits.slice(2)}`
    if (digits.length === 9) return `+375${digits}`
    return null
  }
  const local = country === 'KZ' ? '7' : '9' // первая цифра номера без кода страны
  if (digits.length === 10 && digits.startsWith(local)) return `+7${digits}`
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) return `+7${digits.slice(1)}`
  return null
}

/** Российский номер (+7XXXXXXXXXX) или null. */
export const normalizeRuPhone = (input: string) => normalizePhone(input, 'RU')
