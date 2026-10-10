import { describe, expect, it } from 'vitest'
import type { Product } from '../model/types'
import { applyFilters, filtersToParams, parseFilters, preferredColor, type CatalogFilters } from './filters'

// Свои тестовые товары, а не реальный каталог: тесты проверяют логику фильтров и не ломаются при смене ассортимента.
const color = (id: string) => ({ id, name: id, hex: '#000000', sku: id, images: [] })
const product = (slug: string, over: Partial<Product>): Product => ({
  id: slug,
  slug,
  name: slug,
  kind: 'hoodie',
  category: 'hoodies',
  price: 4500,
  colors: [color('black')],
  sizes: ['M'],
  shippingNote: '',
  details: [],
  ...over,
})

const items = [
  product('hoodie-black', { price: 4500 }),
  product('hoodie-blue', { price: 6000, colors: [color('blue'), color('milk')], isNew: true }),
  product('rugby-blue', { category: 'sweatshirts', price: 3900, colors: [color('blue')] }),
  product('backpack', { category: 'accessories', price: 12000, kind: 'backpack' }),
]

const none: CatalogFilters = { colors: [], prices: [], categories: [], sort: 'default' }
const slugs = (list: Product[]) => list.map((p) => p.slug)

describe('catalog filters', () => {
  it('round-trips through URL params and ignores unknown sort', () => {
    const f: CatalogFilters = { colors: ['blue', 'milk'], prices: ['lt5'], categories: ['hoodies'], sort: 'price-asc' }
    expect(parseFilters(filtersToParams(f))).toEqual(f)
    expect(parseFilters(new URLSearchParams('sort=hack')).sort).toBe('default')
  })

  it('returns everything without filters, in catalog order', () => {
    expect(applyFilters(items, none)).toEqual(items)
  })

  it('combines filters with AND between groups and OR inside a group', () => {
    expect(slugs(applyFilters(items, { ...none, colors: ['blue'], categories: ['hoodies', 'sweatshirts'] }))).toEqual([
      'hoodie-blue',
      'rugby-blue',
    ])
  })

  it('filters by price range', () => {
    expect(slugs(applyFilters(items, { ...none, prices: ['lt5'] }))).toEqual(['hoodie-black', 'rugby-blue'])
    expect(slugs(applyFilters(items, { ...none, prices: ['gt10'] }))).toEqual(['backpack'])
  })

  it('sorts by price and novelty without mutating the source', () => {
    const before = [...items]
    expect(applyFilters(items, { ...none, sort: 'price-desc' }).map((p) => p.price)).toEqual([12000, 6000, 4500, 3900])
    expect(applyFilters(items, { ...none, sort: 'new' })[0].slug).toBe('hoodie-blue')
    expect(items).toEqual(before)
  })

  it('shows the filtered color first on the card', () => {
    const hoodie = items[1]
    expect(preferredColor(hoodie, ['milk']).id).toBe('milk')
    expect(preferredColor(hoodie, []).id).toBe('blue')
  })
})
