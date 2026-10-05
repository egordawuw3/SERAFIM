import { useState } from 'react'
import type { Product, Size } from '../model/types'
import { findColor, firstAvailableSize, isSizeAvailable } from './availability'

/**
 * Выбор цвета и размера товара. При смене цвета размер сохраняется,
 * если он есть в новом цвете, иначе подставляется первый доступный.
 */
export function useProductSelection(product: Product, initialColorId?: string) {
  const [colorId, setColorId] = useState(() => findColor(product, initialColorId).id)
  const color = findColor(product, colorId)
  const [size, setSize] = useState<Size | undefined>(() => firstAvailableSize(product, color))

  const selectColor = (id: string) => {
    const next = findColor(product, id)
    setColorId(next.id)
    if (!size || !isSizeAvailable(next, size)) setSize(firstAvailableSize(product, next))
  }

  // Если снаружи сменился предпочтительный цвет (например, фильтр каталога) — следуем ему.
  const [prevInitial, setPrevInitial] = useState(initialColorId)
  if (prevInitial !== initialColorId) {
    setPrevInitial(initialColorId)
    selectColor(initialColorId ?? product.colors[0].id)
  }

  return { color, size, selectColor, selectSize: setSize }
}
