import type { ImageView, Product, ProductColor } from '../model/types'

const VIEW_LABEL: Record<ImageView, string> = {
  front: 'вид спереди',
  back: 'вид сзади',
  detail: 'деталь',
}

/**
 * Alt для фото одежды: название, цвет и ракурс — «Худи Raised, графит — вид сзади».
 * Размер в alt не пишем: фото одинаковы для всех размеров, это ввело бы в заблуждение.
 */
export function photoAlt(product: Product, color: ProductColor, view: ImageView): string {
  return `${product.name}, ${color.name.toLowerCase()} — ${VIEW_LABEL[view]}`
}
