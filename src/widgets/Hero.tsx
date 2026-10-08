import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from '@/shared/ui/icons'

/*
 * Главное фото: исходник — design/hero-new-source.jpg, на сайт идут сжатые public/images/hero.webp и hero.jpg.
 * Замена: положить новый исходник и пересобрать обе версии (WebP + JPEG-запасной вариант).
 */
const HERO = {
  webp: '/images/hero.webp',
  fallback: '/images/hero.jpg',
}

export function Hero() {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <section className="mt-1 flex h-[86svh] w-full flex-col px-3 pb-6 md:h-[90vh] md:px-8 md:pb-8">
      <div className="grain group relative h-full w-full overflow-hidden rounded-[2px] bg-gradient-to-br from-[#2b3a25] via-[#1c2618] to-[#0f140d] shadow-sm">
        {!imageFailed && (
          <picture>
            <source type="image/webp" srcSet={HERO.webp} />
            <img
              src={HERO.fallback}
              alt="Солнечный свет над цветущей лесной поляной"
              fetchPriority="high"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full animate-[hero-zoom_14s_ease-out_both] object-cover"
            />
          </picture>
        )}

        <div className="absolute inset-0 z-[2] flex flex-col justify-between p-5 text-white md:p-12">
          <h1 className="sr-only">SERAFIM — одежда, рождённая природой</h1>
          <div className="w-fit border border-white/20 bg-black/30 px-5 py-2.5 text-[9px] font-medium uppercase tracking-[0.3em] text-white/90 backdrop-blur-md">
            Предзаказ открыт
          </div>

          <div className="flex justify-center sm:justify-end">
            <Link
              to="/catalog"
              className="group/btn flex w-fit items-center gap-4 self-center border border-white/30 bg-white/10 px-8 py-4 text-[10px] font-medium uppercase tracking-[0.25em] text-white backdrop-blur-md transition-all duration-500 hover:bg-white hover:text-ink sm:self-auto md:px-10"
            >
              <span>Перейти в каталог</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
