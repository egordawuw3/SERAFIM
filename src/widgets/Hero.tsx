import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from '@/shared/ui/icons'

/* Главное фото лежит в public/images/hero-bg.jpg */
const HERO_IMAGE = '/images/hero-bg.jpg'

export function Hero() {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <section className="mt-1 flex h-[82svh] w-full flex-col px-3 pb-6 md:h-[88vh] md:px-8 md:pb-8">
      <div className="group relative h-full w-full overflow-hidden rounded-[2px] bg-gradient-to-br from-[#2b3a25] via-[#1c2618] to-[#0f140d] shadow-sm">
        {!imageFailed && (
          <img
            src={HERO_IMAGE}
            alt="Коллекция SERAFIM на природе"
            fetchPriority="high"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover brightness-[0.85] contrast-110 saturate-[1.05] transition-transform duration-[20s] ease-out group-hover:scale-[1.03]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60" />

        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-12">
          <div className="w-fit border border-white/20 bg-black/30 px-5 py-2.5 text-[9px] font-medium uppercase tracking-[0.3em] text-white/90 backdrop-blur-md">
            Предзаказ открыт
          </div>

          <div className="flex justify-center sm:justify-end">
            <Link
              to="/catalog"
              className="group/btn flex items-center gap-4 border border-white/30 bg-white/10 px-8 py-4 text-[10px] font-medium uppercase tracking-[0.25em] text-white backdrop-blur-md transition-all duration-500 hover:bg-white hover:text-ink md:px-10"
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
