import { useState } from 'react'
import type { Product, ProductColor, Size } from '../model/types'
import { findColor, firstAvailableSize, isSizeAvailable } from './availability'

/**
 * Выбор цвета и размера товара. Размер заранее не выбираем — иначе легко заказать не свой и потом возвращать;
 * исключение — товар с единственным размером (ONE SIZE). При смене цвета выбранный размер сохраняется,
 * если он есть в новом цвете, иначе сбрасывается.
 */
export function useProductSelection(product: Product, initialColorId?: string) {
  const [colorId, setColorId] = useState(() => findColor(product, initialColorId).id)
  const color = findColor(product, colorId)
  const preselect = (c: ProductColor) => (product.sizes.length === 1 ? firstAvailableSize(product, c) : undefined)
  const [size, setSize] = useState<Size | undefined>(() => preselect(color))

  const selectColor = (id: string) => {
    const next = findColor(product, id)
    setColorId(next.id)
    if (!size || !isSizeAvailable(next, size)) setSize(preselect(next))
  }

  // Если снаружи сменился предпочтительный цвет (например, фильтр каталога) — следуем ему.
  const [prevInitial, setPrevInitial] = useState(initialColorId)
  if (prevInitial !== initialColorId) {
    setPrevInitial(initialColorId)
    selectColor(initialColorId ?? product.colors[0].id)
  }

  return { color, size, selectColor, selectSize: setSize }
}
