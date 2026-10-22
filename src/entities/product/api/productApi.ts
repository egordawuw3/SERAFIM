import { products } from '../model/catalog'
import type { Product } from '../model/types'

/*
 * Единая точка доступа к товарам. Сейчас данные статические,
 * позже функции станут запросами к API — сигнатуры сохранятся.
 */
export const getProducts = (): Product[] => products

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug)

