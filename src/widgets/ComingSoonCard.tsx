import type { COMING_SOON } from './comingSoon'
import { CATALOG_CARD_SIZES } from './ProductCard'

/*
 * Вещи следующего дропа: размытый тизер вместо фото, «Скоро» вместо названия, без цены и ссылки.
 * Картинки — public/images/soon/<id>-480|800.avif|webp (исходники в photos/soon/, кадр 4:5).
 * Когда вещь выходит, её убирают отсюда и добавляют в каталог как обычный товар.
 */
const srcSet = (id: string, ext: string) => [480, 800].map((w) => `/images/soon/${id}-${w}.${ext} ${w}w`).join(', ')

export function ComingSoonCard({ id, alt }: (typeof COMING_SOON)[number]) {
  return (
    <article className="flex flex-col items-center text-center">
      <div className="relative mb-5 aspect-[4/5] w-full overflow-hidden bg-paper-deep">
        <picture>
          <source type="image/avif" srcSet={srcSet(id, 'avif')} sizes={CATALOG_CARD_SIZES} />
          <source type="image/webp" srcSet={srcSet(id, 'webp')} sizes={CATALOG_CARD_SIZES} />
          <img
            src={`/images/soon/${id}-800.webp`}
            alt={alt}
            width={800}
            height={1000}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      </div>
      <h3 className="font-mono text-[14px] font-normal uppercase leading-snug tracking-[0.2em] text-ink/70 md:text-[15px]">Скоро</h3>
    </article>
  )
}
