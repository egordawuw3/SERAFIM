import { Link } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { ArrowRight } from '@/shared/ui/icons'

/*
 * TODO: заменить на собственные кадры бренда (положить в public/images).
 * Сейчас — фото леса с Unsplash из исходного макета.
 */
const PHOTOS = {
  forest: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1600&auto=format&fit=crop',
  leaves: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=900&auto=format&fit=crop',
  trees: 'https://images.unsplash.com/photo-1418065460487-3e41a6c8e182?q=80&w=2400&auto=format&fit=crop',
}

interface PhotoProps {
  src: string
  alt: string
  caption: [string, string]
  /** Пропорции кадра, например aspect-[4/5]. */
  frame: string
  className?: string
}

function Photo({ src, alt, caption, frame, className }: PhotoProps) {
  return (
    <figure className={className}>
      <div className={cn('overflow-hidden bg-paper-deep', frame)}>
        <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
      <figcaption className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        <span>{caption[0]}</span>
        <span>{caption[1]}</span>
      </figcaption>
    </figure>
  )
}

export function About() {
  return (
    <section id="about" className="w-full scroll-mt-20 px-4 pb-28 pt-28 md:px-12 md:pb-40 md:pt-40">
      <div className="grid gap-y-8 md:grid-cols-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted md:col-span-3 md:pt-3">(О бренде)</p>
        <h2 className="text-[clamp(2rem,5vw,4.5rem)] font-light leading-[1.06] tracking-[-0.02em] md:col-span-9">
          Мы делаем вещи медленно — так же, как растёт лес.
        </h2>
      </div>

      <div className="mt-20 grid gap-x-8 gap-y-14 md:mt-32 md:grid-cols-12">
        <Photo src={PHOTOS.forest} alt="Сосновый лес в утреннем свете" caption={['01 — Лес', 'Раннее утро']} frame="aspect-[4/5]" className="md:col-span-7" />

        <div className="flex flex-col justify-end gap-12 md:col-span-4 md:col-start-9">
          <Photo src={PHOTOS.leaves} alt="Солнце сквозь листья" caption={['02 — Листва', 'Полдень']} frame="aspect-[3/4]" />
          <p className="max-w-sm text-[15px] leading-[1.7] text-ink/80">
            Каждую коллекцию мы снимаем не в студии, а там, где она должна жить: на лесных тропах, у воды, в
            утреннем тумане. Если вещь хорошо выглядит там — она будет хорошо выглядеть где угодно.
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-24 md:mx-0 md:mt-36">
        <Photo src={PHOTOS.trees} alt="Деревья в тумане" caption={['03 — Туман', 'MMXXVI']} frame="aspect-[4/3] md:aspect-[21/9]" />
      </div>

      <div className="mt-12 grid gap-y-10 md:grid-cols-12">
        <p className="max-w-md text-[15px] leading-[1.7] text-ink/80 md:col-span-5 md:col-start-8">
          Плотный хлопок, водные краски, металлическая фурнитура. Каждая модель выходит небольшим тиражом и больше не
          повторяется — поэтому любая вещь SERAFIM со временем становится частью архива.
        </p>
        <Link
          to="/catalog"
          className="group flex w-fit items-center gap-4 text-[10px] font-medium uppercase tracking-[0.25em] md:col-span-5 md:col-start-8"
        >
          <span className="link-hover">Смотреть коллекцию</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
        </Link>
      </div>
    </section>
  )
}
