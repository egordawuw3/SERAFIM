import { useSearchParams } from 'react-router'
import { getProducts } from '@/entities/product/api/productApi'
import { categories } from '@/entities/product/model/catalog'
import type { CategoryId } from '@/entities/product/model/types'
import { cn } from '@/shared/lib/cn'
import { plural } from '@/shared/lib/format'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { ProductCard } from '@/widgets/ProductCard'

export function CatalogPage() {
  useDocumentTitle('Каталог')
  const [params, setParams] = useSearchParams()
  const all = getProducts()
  const active = params.get('category') as CategoryId | null
  const visibleCategories = categories.filter((c) => all.some((p) => p.category === c.id))
  const list = active ? all.filter((p) => p.category === active) : all

  const tabCls = (on: boolean) =>
    cn('whitespace-nowrap transition-colors hover:text-ink', on ? 'text-ink underline underline-offset-[6px]' : 'text-ink/45')

  return (
    <section className="w-full px-4 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12">
      <div className="mb-10 flex flex-col gap-6 border-b border-ink/10 pb-6 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-light uppercase tracking-widest md:text-4xl">Каталог</h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            {list.length} {plural(list.length, ['модель', 'модели', 'моделей'])}
          </p>
        </div>
        <nav className="-mx-4 flex gap-6 overflow-x-auto px-4 font-mono text-[12px] md:mx-0 md:px-0" aria-label="Категории">
          <button type="button" className={tabCls(!active)} onClick={() => setParams({})}>
            Все
          </button>
          {visibleCategories.map((c) => (
            <button key={c.id} type="button" className={tabCls(active === c.id)} onClick={() => setParams({ category: c.id })}>
              {c.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-12 md:gap-x-6 lg:grid-cols-4 lg:gap-y-16">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
