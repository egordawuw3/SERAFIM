import { describe, expect, it } from 'vitest'
import { products } from '../model/catalog'
import { applyFilters, filtersToParams, parseFilters, preferredColor, type CatalogFilters } from './filters'

const none: CatalogFilters = { colors: [], prices: [], categories: [], sort: 'default' }

describe('catalog filters', () => {
  it('round-trips through URL params and ignores unknown sort', () => {
    const f: CatalogFilters = { colors: ['blue', 'moss'], prices: ['lt5'], categories: ['tees'], sort: 'price-asc' }
    expect(parseFilters(filtersToParams(f))).toEqual(f)
    expect(parseFilters(new URLSearchParams('sort=hack')).sort).toBe('default')
  })

  it('returns everything without filters, in catalog order', () => {
    expect(applyFilters(products, none)).toEqual(products)
  })

  it('combines filters with AND between groups and OR inside a group', () => {
    const res = applyFilters(products, { ...none, colors: ['moss'], categories: ['tees', 'bottoms'] })
    expect(res.map((p) => p.slug)).toEqual(['ethereal-tee', 'archive-pants'])
  })

  it('filters by price range', () => {
    const res = applyFilters(products, { ...none, prices: ['lt5'] })
    expect(res.length).toBeGreaterThan(0)
    expect(res.every((p) => p.price < 5000)).toBe(true)
  })

  it('sorts by price without mutating the source', () => {
    const before = [...products]
    const res = applyFilters(products, { ...none, sort: 'price-desc' })
    expect(res.map((p) => p.price)).toEqual([...res.map((p) => p.price)].sort((a, b) => b - a))
    expect(products).toEqual(before)
  })

  it('shows the filtered color first on the card', () => {
    const hoodie = products.find((p) => p.slug === 'seraph-zip-hoodie')!
    expect(preferredColor(hoodie, ['milk']).id).toBe('milk')
    expect(preferredColor(hoodie, []).id).toBe(hoodie.colors[0].id)
  })
})
