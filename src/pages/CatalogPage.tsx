import { useMemo, useState, useTransition } from 'react'
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
import { site } from '@/shared/config/site'
import { cn } from '@/shared/lib/cn'
import { plural } from '@/shared/lib/format'
import { useIsClient } from '@/shared/lib/useIsClient'
import { CheckOption, Dropdown } from '@/shared/ui/Dropdown'
import { Select } from '@/shared/ui/Select'
import { ProductCard } from '@/widgets/ProductCard'

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/** Сколько карточек показывать сразу и добавлять по «Показать ещё»: DOM и картинки не растут вместе с каталогом. */
const PAGE_SIZE = 24
/** Сколько первых карточек грузить с высоким приоритетом (видны без прокрутки на десктопе). */
const PRIORITY_CARDS = 4

const EMPTY_PARAMS = new URLSearchParams()

const NO_FILTERS: Pick<CatalogFilters, 'colors' | 'prices' | 'categories'> = { colors: [], prices: [], categories: [] }

interface Props {
  /** Каталог на главной: заголовок вкладки — название бренда, а не «Каталог». */
  home?: boolean
}

export function CatalogPage({ home = false }: Props) {
  const [params, setParams] = useSearchParams()
  // Фильтры из адреса применяем после гидратации: готовый HTML каталога собран без фильтров.
  const isClient = useIsClient()
  const filters = useMemo(() => parseFilters(isClient ? params : EMPTY_PARAMS), [isClient, params])
  const all = getProducts()
  const colors = useMemo(() => colorFacets(all), [all])
  const visibleCategories = categories.filter((c) => all.some((p) => p.category === c.id))
  const list = useMemo(() => applyFilters(all, filters), [all, filters])

  // Фильтры живут в адресе (?color=…&sort=…): ссылкой можно поделиться, «назад» работает.
  // startTransition — смена фильтра не блокирует ввод: React дорисует сетку в фоне, старая слегка тускнеет.
  const [isPending, startTransition] = useTransition()
  const update = (patch: Partial<CatalogFilters>) =>
    startTransition(() => setParams(filtersToParams({ ...filters, ...patch }), { replace: true, preventScrollReset: true }))

  // «Показать ещё»: при смене фильтров счётчик сбрасывается к первой странице.
  const filtersKey = params.toString()
  const [shown, setShown] = useState({ key: filtersKey, count: PAGE_SIZE })
  if (shown.key !== filtersKey) setShown({ key: filtersKey, count: PAGE_SIZE })
  const visible = list.slice(0, shown.count)
  const cardHeading = home ? 3 : 2

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
              onClick={() => update(NO_FILTERS)}
              className="font-mono text-[12px] text-ink/70 underline-offset-4 transition-colors hover:text-ink hover:underline"
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

      {/* Скринридер узнаёт о результате фильтрации, не перебирая карточки. */}
      <p className="sr-only" aria-live="polite">
        {all.length > 0 && `Найдено ${list.length} ${plural(list.length, ['товар', 'товара', 'товаров'])}`}
      </p>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-32 text-center font-mono text-[13px]">
          <p className="text-ink/70">Скоро здесь появятся вещи новой коллекции</p>
          <a className="link-hover uppercase tracking-[0.12em]" href={site.contacts.telegramChannel} target="_blank" rel="noreferrer">
            Следить в Telegram-канале
          </a>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-32 text-center font-mono text-[13px]">
          <p className="text-ink/70">По выбранным фильтрам ничего не нашлось</p>
          <button type="button" className="link-hover uppercase tracking-[0.12em]" onClick={() => update(NO_FILTERS)}>
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <>
          <ul
            role="list"
            aria-busy={isPending || undefined}
            className={cn(
              'grid grid-cols-2 gap-x-3 gap-y-16 transition-opacity md:gap-x-8 lg:grid-cols-4 lg:gap-y-20',
              isPending && 'opacity-60',
            )}
          >
            {visible.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  colorId={preferredColor(p, filters.colors).id}
                  priority={!home && i < PRIORITY_CARDS}
                  headingLevel={cardHeading}
                />
              </li>
            ))}
          </ul>
          {visible.length < list.length && (
            <div className="mt-16 flex flex-col items-center gap-3 font-mono text-[12px]">
              <p className="text-ink/70">
                Показано {visible.length} из {list.length}
              </p>
              <button
                type="button"
                onClick={() => setShown((s) => ({ ...s, count: s.count + PAGE_SIZE }))}
                className="min-h-11 rounded-lg border border-ink px-6 uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
              >
                Показать ещё
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
