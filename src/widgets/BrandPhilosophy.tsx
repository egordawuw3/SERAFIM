import { Link } from 'react-router'
import { ArrowRight } from '@/shared/ui/icons'

/*
 * Фото природы. TODO: заменить на собственные снимки бренда
 * (положить в public/images и поменять пути).
 */
const PHOTOS = {
  main: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1400&auto=format&fit=crop',
  second: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=1000&auto=format&fit=crop',
  third: 'https://images.unsplash.com/photo-1418065460487-3e41a6c8e182?q=80&w=1000&auto=format&fit=crop',
}

const PRINCIPLES = [
  {
    n: '01',
    title: 'Природа',
    text: 'Плотный хлопок, водные краски и спокойные природные оттенки. Вещи, в которых комфортно и в городе, и в лесу.',
  },
  {
    n: '02',
    title: 'Тишина',
    text: 'Никаких кричащих логотипов. Чистый крой, продуманные детали и качество, которое чувствуешь руками.',
  },
  {
    n: '03',
    title: 'Архив',
    text: 'Каждая коллекция выходит ограниченным тиражом и не повторяется. Каждая вещь становится частью архива.',
  },
]

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-paper-deep ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[2.5s] hover:scale-[1.04]"
      />
    </div>
  )
}

export function BrandPhilosophy() {
  return (
    <section id="philosophy" className="w-full scroll-mt-8 px-4 py-24 md:px-12 md:py-32">
      <div className="mb-16 flex items-end justify-between border-b border-ink/10 pb-8">
        <div>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">О бренде</p>
          <h2 className="text-3xl font-light uppercase tracking-widest md:text-4xl">Философия</h2>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <Photo src={PHOTOS.main} alt="Лес в утреннем свете" className="aspect-[4/5] lg:col-span-6 lg:aspect-auto lg:min-h-[640px]" />

        <div className="flex flex-col justify-between gap-12 lg:col-span-6">
          <div className="max-w-xl">
            <p className="text-xl font-light leading-relaxed md:text-2xl">
              SERAFIM — одежда, рождённая тишиной. Мы снимаем коллекции не в студиях и не на бетоне, а
              там, где свет проходит сквозь листву, а время идёт медленнее.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Нам важно, из чего сделана вещь, кто её шьёт и сколько она прослужит. Поэтому мы выпускаем
              немного, но каждую модель доводим до состояния, в котором её хочется носить годами.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.n} className="border-t border-ink/15 pt-5">
                <p className="font-mono text-[11px] text-muted">{p.n}</p>
                <h3 className="mt-3 text-xs font-medium uppercase tracking-[0.2em]">{p.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <Photo src={PHOTOS.second} alt="Солнечные листья" className="aspect-[3/4]" />
            <Photo src={PHOTOS.third} alt="Деревья в тумане" className="aspect-[3/4]" />
          </div>

          <Link
            to="/catalog"
            className="group flex w-fit items-center gap-4 text-[10px] font-medium uppercase tracking-[0.25em]"
          >
            <span className="link-hover">Смотреть коллекцию</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
          </Link>
        </div>
      </div>
    </section>
  )
}
