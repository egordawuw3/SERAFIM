/**
 * Маска российского номера при вводе: «+7 (999) 123-45-67». Принимает 8…, 7…, +7… и 9… (без кода страны).
 * Только оформление — проверяет и нормализует номер схема заказа (normalizeRuPhone).
 */
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (!digits) return ''
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
