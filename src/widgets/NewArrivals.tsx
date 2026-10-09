import { useState } from 'react'
import { getProducts } from '@/entities/product/api/productApi'
import type { Product } from '@/entities/product/model/types'
import { cn } from '@/shared/lib/cn'
import { ProductCard } from './ProductCard'

/** Минимум карточек в одной «половине» ленты, чтобы она закрывала широкий экран без пустот. */
const MIN_PER_LOOP = 8
/** Секунд на одну карточку — скорость прокрутки не зависит от количества товаров. */
const SECONDS_PER_ITEM = 5
/** Ширина карточки в ленте — совпадает с классами w-[…] у <li>. */
const RAIL_CARD_SIZES = '(min-width: 1024px) 17vw, (min-width: 768px) 22vw, (min-width: 640px) 30vw, 44vw'

/*
 * Лента новинок между шапкой и каталогом: прокручивается сама. Бесконечность — две одинаковые половины
 * и сдвиг на -50% (как бегущая строка). Вторая половина — визуальный дубль: скрыта от скринридеров и Tab.
 *
 * Доступность (WCAG 2.2.2): движущийся дольше 5 секунд контент должен останавливаться. Лента замирает при
 * наведении, при фокусе клавиатуры внутри и по кнопке «Пауза»; при «уменьшить движение» в системе не едет вовсе.
 */
export function NewArrivals() {
  const [paused, setPaused] = useState(false)
  const all = getProducts()
  const fresh = all.filter((p) => p.isNew)
  const items = fresh.length ? fresh : all
  if (items.length === 0) return null

  const loop: Product[] = []
  while (loop.length < MIN_PER_LOOP) loop.push(...items)

  return (
    <section className="w-full pb-14 pt-4 md:pb-20 md:pt-6" aria-labelledby="new-arrivals">
      <div className="mb-6 flex items-center justify-between gap-4 px-4 md:mb-8 md:px-12">
        <h2 id="new-arrivals" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          (Новинки)
        </h2>
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="min-h-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors hover:text-ink motion-reduce:hidden"
        >
          {paused ? 'Продолжить ▶' : 'Пауза ❚❚'}
        </button>
      </div>

      {/* Края ленты растворяются маской прозрачности, а не заливкой — фон с листьями под ними не перекрывается. */}
      <div className="group/rail relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto">
        <div
          className={cn(
            'flex w-max animate-marquee group-hover/rail:[animation-play-state:paused] group-focus-within/rail:[animation-play-state:paused] motion-reduce:animate-none',
            paused && '[animation-play-state:paused]',
          )}
          style={{ animationDuration: `${loop.length * SECONDS_PER_ITEM}s` }}
        >
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 gap-3 pr-3 md:gap-6 md:pr-6" aria-hidden={copy === 1 || undefined}>
              {loop.map((p, i) => (
                <li key={`${p.id}-${i}`} className="w-[44vw] shrink-0 sm:w-[30vw] md:w-[22vw] lg:w-[17vw]">
                  {/* Повторы внутри ленты и вся вторая половина — дубли: без Tab и без озвучки. */}
                  <ProductCard product={p} sizes={RAIL_CARD_SIZES} showColors={false} inert={copy === 1 || i >= items.length} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
