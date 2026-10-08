import { Link } from 'react-router'
import { getProducts } from '@/entities/product/api/productApi'
import { ArrowRight } from '@/shared/ui/icons'
import { Reveal } from '@/shared/ui/Reveal'
import { ProductCard } from './ProductCard'

const LIMIT = 4

/* Новинки на главной: чтобы до товара был один клик, а не только через каталог. */
export function NewArrivals() {
  const items = getProducts()
    .filter((p) => p.isNew)
    .slice(0, LIMIT)
  if (items.length === 0) return null

  return (
    <section className="w-full px-4 pt-24 md:px-12 md:pt-32" aria-labelledby="new-arrivals">
      <Reveal className="mb-12 flex items-end justify-between gap-6 md:mb-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">(Новинки)</p>
          <h2 id="new-arrivals" className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-light leading-none tracking-[-0.035em]">
            Новое в коллекции
          </h2>
        </div>
        <Link
          to="/catalog?sort=new"
          className="group hidden items-center gap-3 text-[10px] font-medium uppercase tracking-[0.25em] sm:flex"
        >
          <span className="link-hover">Весь каталог</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
        </Link>
      </Reveal>

      <div className="grid grid-cols-2 gap-x-3 gap-y-16 md:gap-x-8 lg:grid-cols-4">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={i * 120}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>

      <Link
        to="/catalog?sort=new"
        className="mx-auto mt-14 flex w-fit items-center gap-3 text-[10px] font-medium uppercase tracking-[0.25em] sm:hidden"
      >
        Весь каталог <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  )
}
