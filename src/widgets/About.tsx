import { Link } from 'react-router'
import { ArrowRight } from '@/shared/ui/icons'
import { Reveal } from '@/shared/ui/Reveal'

/* Кадр — public/images/about.webp (исходник design/about-new-source.jpg). */
const PHOTO = '/images/about.webp'

const SPECS = ['100% хлопок', 'до 400 г/м²', 'Водные краски', 'Малый тираж']

export function About() {
  return (
    <section className="w-full px-4 py-16 md:px-12 md:py-24">
      <Reveal className="grid items-center gap-10 md:grid-cols-12 md:gap-8">
        <div className="grain overflow-hidden bg-paper-deep md:col-span-5">
          <img
            src={PHOTO}
            alt="Дерево на залитой солнцем поляне"
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] h-full w-full object-cover"
          />
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">(О бренде)</h1>
          <p className="mt-6 text-[clamp(1.9rem,3.6vw,3.25rem)] font-light leading-[1.08] tracking-[-0.035em]">
            Мы делаем вещи медленно — <span className="text-ink/40">так же, как растёт лес.</span>
          </p>
          <p className="mt-8 max-w-md text-[15px] leading-[1.75] text-ink/75">
            Плотный хлопок, водные краски, металлическая фурнитура. Каждая модель выходит небольшим тиражом и больше
            не повторяется.
          </p>

          <ul className="mt-10 flex flex-wrap gap-2">
            {SPECS.map((s) => (
              <li key={s} className="rounded-full border border-ink/15 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">
                {s}
              </li>
            ))}
          </ul>

          <Link to="/catalog" className="group mt-12 flex w-fit items-center gap-4 text-[10px] font-medium uppercase tracking-[0.25em]">
            <span className="link-hover">Смотреть коллекцию</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
