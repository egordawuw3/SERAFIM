/*
 * Итог заказа: товары + доставка + комиссия за наложенный платёж. Общий для сайта (показ суммы) и сервера (сумма в СДЭК и в Telegram) —
 * считается одинаково, а сервер всё равно пересчитывает цены и доставку сам.
 */
export interface OrderTotals {
  goods: number
  delivery: number
  /** Комиссия за оплату при получении (codFeeFor); 0 — при предоплате. */
  codFee: number
  total: number
  /** Предоплата (site.shipping.prepaymentAmount), но не больше суммы заказа. */
  prepayment: number
  /** Оплата при получении в пункте СДЭК (наложенный платёж). */
  payOnPickup: number
}

export function orderTotals(goods: number, delivery: number, prepaymentAmount = 0, codFee = 0): OrderTotals {
  const total = goods + delivery + codFee
  const prepayment = Math.min(Math.max(0, prepaymentAmount), total)
  return { goods, delivery, codFee, total, prepayment, payOnPickup: total - prepayment }
}

/**
 * Комиссия за наложенный платёж с одной вещи: СДЭК удерживает percent % того, что покупатель платит при получении,
 * поэтому оплата за вещь — цена / (1 − percent), и продавцу доходит полная цена. Вверх до рубля.
 */
export const codFeePerUnit = (price: number, percent: number) => (percent > 0 ? Math.ceil((price * 100) / (100 - percent)) - price : 0)

/** Комиссия за все вещи заказа. Считается по каждой вещи: при примерке не выкупленная вещь не оплачивается вместе с комиссией. */
export const codFeeFor = (items: { price: number; qty: number }[], percent: number) =>
  items.reduce((sum, i) => sum + codFeePerUnit(i.price, percent) * i.qty, 0)
