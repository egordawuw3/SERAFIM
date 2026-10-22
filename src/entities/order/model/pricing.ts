/*
 * Итог заказа: товары + доставка. Общий для сайта (показ суммы) и сервера (сумма в СДЭК и в Telegram) —
 * считается одинаково, а сервер всё равно пересчитывает цены и доставку сам.
 */
export interface OrderTotals {
  goods: number
  delivery: number
  total: number
  /** Предоплата (site.shipping.prepaymentAmount), но не больше суммы заказа. */
  prepayment: number
  /** Оплата при получении в пункте СДЭК (наложенный платёж). */
  payOnPickup: number
}

export function orderTotals(goods: number, delivery: number, prepaymentAmount = 0): OrderTotals {
  const total = goods + delivery
  const prepayment = Math.min(Math.max(0, prepaymentAmount), total)
  return { goods, delivery, total, prepayment, payOnPickup: total - prepayment }
}
