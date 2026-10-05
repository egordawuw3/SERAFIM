import type { CategoryId, Product, ProductColor } from '../model/types'

export type SortKey = 'default' | 'new' | 'price-asc' | 'price-desc'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'по умолчанию' },
  { value: 'new', label: 'сначала новинки' },
  { value: 'price-asc', label: 'сначала дешевле' },
  { value: 'price-desc', label: 'сначала дороже' },
]

export const PRICE_RANGES = [
  { id: 'lt5', label: 'До 5 000 ₽', min: 0, max: 4999 },
  { id: '5-10', label: '5 000 — 10 000 ₽', min: 5000, max: 10000 },
  { id: 'gt10', label: 'От 10 000 ₽', min: 10001, max: Number.POSITIVE_INFINITY },
] as const

export interface CatalogFilters {
  colors: string[]
  prices: string[]
  categories: CategoryId[]
  sort: SortKey
}

const list = (params: URLSearchParams, key: string) =>
  params.get(key)?.split(',').filter(Boolean) ?? []

export function parseFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get('sort')
  return {
    colors: list(params, 'color'),
    prices: list(params, 'price'),
    categories: list(params, 'category') as CategoryId[],
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortKey) : 'default',
  }
}

export function filtersToParams(f: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.colors.length) params.set('color', f.colors.join(','))
  if (f.prices.length) params.set('price', f.prices.join(','))
  if (f.categories.length) params.set('category', f.categories.join(','))
  if (f.sort !== 'default') params.set('sort', f.sort)
  return params
}

export const hasActiveFilters = (f: CatalogFilters) =>
  f.colors.length + f.prices.length + f.categories.length > 0

/** Все цвета каталога без повторов — варианты для фильтра «Цвет». */
export function colorFacets(products: Product[]): Pick<ProductColor, 'id' | 'name' | 'hex'>[] {
  const seen = new Map<string, Pick<ProductColor, 'id' | 'name' | 'hex'>>()
  for (const p of products) for (const c of p.colors) if (!seen.has(c.id)) seen.set(c.id, c)
  return [...seen.values()].map(({ id, name, hex }) => ({ id, name, hex }))
}

/** Цвет, который показывать в карточке: первый из выбранных в фильтре, иначе основной. */
export const preferredColor = (product: Product, colors: string[]): ProductColor =>
  product.colors.find((c) => colors.includes(c.id)) ?? product.colors[0]

const inPriceRange = (price: number, ids: string[]) =>
  PRICE_RANGES.some((r) => ids.includes(r.id) && price >= r.min && price <= r.max)

export function applyFilters(products: Product[], f: CatalogFilters): Product[] {
  const result = products.filter(
    (p) =>
      (!f.categories.length || f.categories.includes(p.category)) &&
      (!f.colors.length || p.colors.some((c) => f.colors.includes(c.id))) &&
      (!f.prices.length || inPriceRange(p.price, f.prices)),
  )
  switch (f.sort) {
    case 'price-asc':
      return result.toSorted((a, b) => a.price - b.price)
    case 'price-desc':
      return result.toSorted((a, b) => b.price - a.price)
    case 'new':
      return result.toSorted((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)))
    default:
      return result
  }
}
