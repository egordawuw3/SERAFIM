import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { site } from '@/shared/config/site'
import { cn } from '@/shared/lib/cn'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[12px] uppercase tracking-[0.1em] text-ink/70">{title} →</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-ink md:text-[16px]">{children}</div>
    </div>
  )
}

// min-h-6 — зона касания не меньше 24 px (WCAG 2.5.8).
const linkCls = 'link-hover inline-flex min-h-6 items-center transition-opacity hover:opacity-60'

export function Footer() {
  const { contacts, seller } = site
  // Фото леса в буквах (45 КБ) качаем, только когда футер почти доскроллили: на первом экране оно не видно,
  // а раньше грузилось на каждой странице вместе с главными картинками. До этого буквы просто тёмные.
  const wordmarkRef = useRef<HTMLAnchorElement>(null)
  const [nearWordmark, setNearWordmark] = useState(false)
  useEffect(() => {
    const el = wordmarkRef.current
    if (!el || !('IntersectionObserver' in window)) return setNearWordmark(true)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setNearWordmark(true)
        io.disconnect()
      },
      { rootMargin: '800px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <footer className="mt-auto w-full overflow-hidden border-t border-ink/10 pt-16 font-mono md:pt-24">
      {/*
       * Слева — ссылки по группам в две колонки (как у брендов одежды: всё по категориям, а не россыпью),
       * справа — копирайт и реквизиты продавца (обязательны для интернет-магазина и проверки ЮKassa).
       */}
      <div className="grid gap-12 px-4 md:px-12 lg:grid-cols-[1fr_auto] lg:gap-24">
        <div className="grid gap-x-24 gap-y-10 sm:grid-cols-2 lg:max-w-3xl">
          <Group title="Контакты">
            <a className={linkCls} href={contacts.telegramChannel} target="_blank" rel="noreferrer">
              Наш канал
            </a>
          </Group>
          <Group title="Покупателям">
            <Link className={linkCls} to="/info/payment-and-returns">
              Оплата и возврат
            </Link>
            <Link className={linkCls} to="/info/offer">
              Оферта
            </Link>
            <Link className={linkCls} to="/info/privacy">
              Конфиденциальность
            </Link>
          </Group>
          <Group title="Поддержка">
            <a className={linkCls} href={contacts.supportTelegram} target="_blank" rel="noreferrer">
              Написать нам
            </a>
          </Group>
        </div>

        <div className="space-y-6 text-[12px] uppercase leading-relaxed tracking-[0.08em] text-ink/70 lg:text-right">
          <p>
            {site.name} © {site.year}
            <br />
            Все права защищены
          </p>
          <p className="text-[11px] normal-case tracking-normal">
            {seller.name}
            <br />
            Самозанятый · ИНН {seller.inn}
          </p>
        </div>
      </div>

      {/*
       * Вордмарк во всю ширину — тем же узким Times, что в шапке и на баннере (единый логотип).
       * Сквозь буквы виден лес из фотосессии бренда; если браузер не умеет background-clip: text — буквы просто тёмные.
       * Сжатие по горизонтали (wordmark = scaleX) не уменьшает ширину блока, поэтому центрируем флексом —
       * он делит «лишнюю» ширину поровну, и после сжатия от центра надпись встаёт ровно посередине.
       */}
      <Link
        ref={wordmarkRef}
        to="/"
        aria-label={`${site.name} — на главную`}
        className="mt-10 flex select-none justify-center overflow-hidden px-4 pb-6 md:mt-14 md:px-12 md:pb-10"
      >
        <span
          aria-hidden
          className={cn(
            'wordmark whitespace-nowrap font-logo text-[26vw] font-bold uppercase leading-[0.85] text-ink',
            nearWordmark &&
              'supports-[background-clip:text]:bg-[url(/images/footer-forest.webp)] supports-[background-clip:text]:bg-cover supports-[background-clip:text]:bg-center supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent',
          )}
        >
          {site.name}
        </span>
      </Link>
    </footer>
  )
}
