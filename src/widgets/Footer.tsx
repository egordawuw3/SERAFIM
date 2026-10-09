import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { phoneHref, site } from '@/shared/config/site'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[12px] uppercase tracking-[0.08em] text-ink/30">{title} →</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink md:text-[15px]">{children}</div>
    </div>
  )
}

const linkCls = 'link-hover transition-opacity hover:opacity-60'

export function Footer() {
  const { contacts } = site
  return (
    <footer className="mt-auto w-full overflow-hidden border-t border-ink/10 pt-16 font-mono md:pt-20">
      <div className="grid gap-12 px-4 md:px-12 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-x-16 lg:max-w-3xl">
          <Group title="Бренд">
            <Link className={linkCls} to="/about">
              О бренде
            </Link>
          </Group>
          <Group title="Контакты">
            <a className={linkCls} href={contacts.telegramChannel} target="_blank" rel="noreferrer">
              Telegram-канал
            </a>
          </Group>
          <Group title="Поддержка">
            <a className={linkCls} href={phoneHref}>
              {contacts.phone}
            </a>
            <a className={linkCls} href={`mailto:${contacts.email}`}>
              {contacts.email}
            </a>
          </Group>
        </div>

        <p className="text-[12px] uppercase leading-relaxed tracking-[0.08em] text-ink/30 lg:text-right">
          {site.name} © {site.year}
          <br />
          Все права защищены
        </p>
      </div>

      {/* Реквизиты и документы — обязательны для интернет-магазина и проверки ЮKassa. Мелко, чтобы не спорить с дизайном. */}
      <div className="mt-14 flex flex-col gap-3 px-4 text-[11px] leading-relaxed text-ink/40 md:mt-16 md:flex-row md:items-center md:justify-between md:px-12">
        <p>
          {site.seller.name} · самозанятый · ИНН {site.seller.inn}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Документы">
          <Link className="hover:text-ink" to="/info/payment-and-returns">
            Оплата, доставка и возврат
          </Link>
          <Link className="hover:text-ink" to="/info/offer">
            Оферта
          </Link>
          <Link className="hover:text-ink" to="/info/privacy">
            Политика конфиденциальности
          </Link>
        </nav>
      </div>

      {/*
       * Вордмарк во всю ширину: сквозь буквы видно лес из фотосессии бренда.
       * Если браузер не умеет background-clip: text — буквы просто тёмные.
       */}
      <Link to="/" aria-label={`${site.name} — на главную`} className="mt-10 block select-none px-4 pb-6 md:mt-14 md:px-12 md:pb-10">
        <span
          aria-hidden
          className="block whitespace-nowrap text-center font-sans text-[21vw] font-semibold uppercase leading-[0.9] tracking-[-0.04em] text-ink supports-[background-clip:text]:bg-[url(/images/footer-forest.webp)] supports-[background-clip:text]:bg-cover supports-[background-clip:text]:bg-center supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent"
        >
          {site.name}
        </span>
      </Link>
    </footer>
  )
}
