import { Link, useLocation } from 'react-router'
import { getProducts } from '@/entities/product/api/productApi'
import type { Product } from '@/entities/product/model/types'
import { ProductBadges } from '@/entities/product/ui/ProductBadges'
import { formatPrice } from '@/shared/lib/format'

/** Минимум карточек в одной «половине» ленты, чтобы она закрывала широкий экран без пустот. */
const MIN_PER_LOOP = 8
/** Секунд на одну карточку — скорость прокрутки не зависит от количества товаров. */
const SECONDS_PER_ITEM = 5

/*
 * Лента новинок между шапкой и каталогом: прокручивается сама, на наведении останавливается.
 * Бесконечность — две одинаковые половины и сдвиг на -50% (как бегущая строка).
 * При «уменьшить движение» в системе анимации нет — ленту можно листать пальцем.
 */
export function NewArrivals() {
  const location = useLocation()
  const all = getProducts()
  const fresh = all.filter((p) => p.isNew)
  const items = fresh.length ? fresh : all
  if (items.length === 0) return null

  const loop: Product[] = []
  while (loop.length < MIN_PER_LOOP) loop.push(...items)

  return (
    <section className="w-full pb-14 pt-4 md:pb-20 md:pt-6" aria-labelledby="new-arrivals">
      <div className="mb-6 flex items-baseline justify-between px-4 md:mb-8 md:px-12">
        <h2 id="new-arrivals" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          (Новинки)
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{items.length} шт.</p>
      </div>

      {/* Края ленты растворяются маской прозрачности, а не заливкой — фон с листьями под ними не перекрывается. */}
      <div className="group/rail relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto">

        <div
          className="flex w-max animate-marquee group-hover/rail:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: `${loop.length * SECONDS_PER_ITEM}s` }}
        >
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 gap-3 pr-3 md:gap-6 md:pr-6" aria-hidden={copy === 1 || undefined}>
              {loop.map((p, i) => (
                <li key={`${p.id}-${i}`} className="w-[44vw] shrink-0 sm:w-[30vw] md:w-[22vw] lg:w-[17vw]">
                  <Link
                    to={`/product/${p.slug}`}
                    state={{ background: location }}
                    tabIndex={copy === 1 || i >= items.length ? -1 : undefined}
                    className="group/item block"
                  >
                    <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-paper-deep">
                      <ProductBadges product={p} />
                      <img
                        src={p.colors[0].images[0]}
                        alt={copy === 1 || i >= items.length ? '' : p.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover/item:scale-[1.03]"
                      />
                    </div>
                    <p className="font-mono text-[13px] leading-snug md:text-[14px]">{p.name}</p>
                    <p className="mt-1 font-mono text-[15px] font-medium md:text-[16px]">{formatPrice(p.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
