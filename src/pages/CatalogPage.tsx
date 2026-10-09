import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { getProducts } from '@/entities/product/api/productApi'
import {
  applyFilters,
  colorFacets,
  filtersToParams,
  hasActiveFilters,
  parseFilters,
  preferredColor,
  PRICE_RANGES,
  SORT_OPTIONS,
  type CatalogFilters,
  type SortKey,
} from '@/entities/product/lib/filters'
import { categories } from '@/entities/product/model/catalog'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { CheckOption, Dropdown } from '@/shared/ui/Dropdown'
import { Select } from '@/shared/ui/Select'
import { ProductCard } from '@/widgets/ProductCard'

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

interface Props {
  /** Каталог на главной: заголовок вкладки — название бренда, а не «Каталог». */
  home?: boolean
}

export function CatalogPage({ home = false }: Props) {
  useDocumentTitle(home ? undefined : 'Каталог')
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const all = getProducts()
  const colors = useMemo(() => colorFacets(all), [all])
  const visibleCategories = categories.filter((c) => all.some((p) => p.category === c.id))
  const list = useMemo(() => applyFilters(all, filters), [all, filters])

  const update = (patch: Partial<CatalogFilters>) =>
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true, preventScrollReset: true })

  return (
    <section className="w-full px-4 pb-24 pt-4 md:px-12 md:pb-32 md:pt-6">
      {home ? (
        <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted md:mb-8">(Каталог)</h2>
      ) : (
        <h1 className="sr-only">Каталог</h1>
      )}

      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
          <Dropdown label="Цвет" count={filters.colors.length}>
            {colors.map((c) => (
              <CheckOption key={c.id} checked={filters.colors.includes(c.id)} onChange={() => update({ colors: toggle(filters.colors, c.id) })}>
                <span className="h-3 w-3 rounded-full border border-ink/15" style={{ background: c.hex }} aria-hidden />
                {c.name}
              </CheckOption>
            ))}
          </Dropdown>
          <Dropdown label="Цена" count={filters.prices.length}>
            {PRICE_RANGES.map((r) => (
              <CheckOption key={r.id} checked={filters.prices.includes(r.id)} onChange={() => update({ prices: toggle(filters.prices, r.id) })}>
                {r.label}
              </CheckOption>
            ))}
          </Dropdown>
          <Dropdown label="Категории" count={filters.categories.length}>
            {visibleCategories.map((c) => (
              <CheckOption
                key={c.id}
                checked={filters.categories.includes(c.id)}
                onChange={() => update({ categories: toggle(filters.categories, c.id) })}
              >
                {c.name}
              </CheckOption>
            ))}
          </Dropdown>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => update({ colors: [], prices: [], categories: [] })}
              className="font-mono text-[12px] text-ink/45 underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Сбросить
            </button>
          )}
        </div>

        <Select
          label="Порядок сортировки"
          className="w-full md:w-60"
          value={filters.sort}
          onChange={(v) => update({ sort: v as SortKey })}
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: `Порядок: ${o.label}` }))}
        />
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-32 text-center font-mono text-[13px]">
          <p className="text-ink/50">По выбранным фильтрам ничего не нашлось</p>
          <button type="button" className="link-hover uppercase tracking-[0.12em]" onClick={() => update({ colors: [], prices: [], categories: [] })}>
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-16 md:gap-x-8 lg:grid-cols-4 lg:gap-y-20">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} colorId={preferredColor(p, filters.colors).id} eager={i < 4} />
          ))}
        </div>
      )}
    </section>
  )
}
