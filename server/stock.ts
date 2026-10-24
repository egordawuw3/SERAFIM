/*
 * Остатки по артикулам (SKU цвета + размер, как OrderItem.sku): сколько штук ещё можно заказать.
 * Артикулы без записи остатка не ограничены. В Workers остатки лежат в D1 (таблица stock, migrations/),
 * здесь — общие типы и простая реализация в памяти (Node-сервер и тесты).
 */

export interface StockLine {
  sku: string
  qty: number
}

/** ok — списано, left: сколько осталось по артикулам с учётом; иначе — какого артикула не хватило и сколько его есть. */
export type StockResult = { ok: true; left: Record<string, number> } | { ok: false; sku: string; left: number }

export interface StockStore {
  stock(): Promise<Record<string, number>>
  /** Списывает остаток под заказ — всё или ничего. */
  takeStock(lines: StockLine[]): Promise<StockResult>
  /**
   * Продавец меняет остаток (бот): на delta (не ниже нуля) или ставит qty. Артикул без записи начинает учитываться.
   * Возвращает новый остаток.
   */
  setStock(sku: string, change: StockChange): Promise<number>
}

export type StockChange = { delta: number } | { qty: number }

/** Одинаковые артикулы из разных строк корзины — одной строкой: списываем и проверяем общее количество. */
export function mergeStockLines(lines: StockLine[]): StockLine[] {
  const qty = new Map<string, number>()
  for (const l of lines) qty.set(l.sku, (qty.get(l.sku) ?? 0) + l.qty)
  return [...qty].map(([sku, n]) => ({ sku, qty: n }))
}

/** Остатки в памяти процесса. Пустой набор — ничего не ограничено (Node-сервер: учёт остатков только в D1). */
export function memoryStock(initial: Record<string, number> = {}): StockStore {
  const left = { ...initial }
  return {
    stock: async () => ({ ...left }),
    async takeStock(lines) {
      for (const l of lines) {
        if (l.sku in left && left[l.sku] < l.qty) return { ok: false, sku: l.sku, left: left[l.sku] }
      }
      const after: Record<string, number> = {}
      for (const l of lines) if (l.sku in left) after[l.sku] = left[l.sku] -= l.qty
      return { ok: true, left: after }
    },
    async setStock(sku, change) {
      left[sku] = Math.max(0, 'qty' in change ? change.qty : (left[sku] ?? 0) + change.delta)
      return left[sku]
    },
  }
}
