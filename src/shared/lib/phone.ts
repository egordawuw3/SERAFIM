/**
 * Маска номера при вводе: «+7 (999) 123-45-67» (Россия, Казахстан — 8…, 7…, +7… и номер без кода) или
 * «+375 (29) 123-45-67» (Беларусь — 80…, 375… и номер без кода). Только оформление — проверяет и нормализует
 * номер схема заказа (normalizePhone).
 */
export function formatPhoneInput(value: string, country: 'RU' | 'KZ' | 'BY' = 'RU'): string {
  let digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (country === 'BY') return formatBelarus(digits)
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  else if (!digits.startsWith('7')) digits = `7${digits}`
  const d = digits.slice(1, 11)
  let out = '+7'
  if (d.length > 0) out += ` (${d.slice(0, 3)}`
  if (d.length >= 3) out += ')'
  if (d.length > 3) out += ` ${d.slice(3, 6)}`
  if (d.length > 6) out += `-${d.slice(6, 8)}`
  if (d.length > 8) out += `-${d.slice(8, 10)}`
  return out
}

function formatBelarus(input: string): string {
  let digits = input
  if (digits.startsWith('80')) digits = `375${digits.slice(2)}`
  else if (!digits.startsWith('375')) digits = `375${digits}`
  const d = digits.slice(3, 12)
  let out = '+375'
  if (d.length > 0) out += ` (${d.slice(0, 2)}`
  if (d.length >= 2) out += ')'
  if (d.length > 2) out += ` ${d.slice(2, 5)}`
  if (d.length > 5) out += `-${d.slice(5, 7)}`
  if (d.length > 7) out += `-${d.slice(7, 9)}`
  return out
}
