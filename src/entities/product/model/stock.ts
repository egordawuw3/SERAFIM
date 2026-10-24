import { create } from 'zustand'
import type { ProductColor, Size } from './types'

/*
 * Остатки с сервера (/api/stock): сколько штук артикула ещё можно заказать. Пока не загрузились (и в готовом HTML
 * из сборки) — остатков нет, размеры доступны; сервер всё равно не примет заказ сверх остатка.
 */
export const useStock = create<{ left: Record<string, number> }>(() => ({ left: {} }))

/** Тот же артикул, что в заказе (OrderItem.sku) и в таблице stock. */
const stockKey = (color: ProductColor, size: Size) => `${color.sku}/${size}`

/** Остаток размера; undefined — остаток не ведётся (не ограничен). */
export const stockLeft = (color: ProductColor, size: Size): number | undefined => useStock.getState().left[stockKey(color, size)]

let loading: Promise<void> | null = null

/** Загружает остатки один раз за визит; force — заново (например, заказ отклонён: размер только что раскупили). */
export function loadStock(force = false): Promise<void> {
  if (loading && !force) return loading
  loading = fetch('/api/stock')
    .then((res) => (res.ok ? (res.json() as Promise<{ left?: Record<string, number> }>) : null))
    .then((data) => {
      if (data?.left) useStock.setState({ left: data.left })
    })
    .catch(() => {
      loading = null
    })
  return loading
}
