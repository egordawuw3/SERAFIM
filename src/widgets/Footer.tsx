import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { site } from '@/shared/config/site'
import { Logo } from '@/shared/ui/Logo'

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
    <footer className="mt-auto w-full border-t border-ink/10 bg-paper px-4 pb-10 pt-16 font-mono md:px-12 md:pt-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-x-16 lg:max-w-3xl">
          <Group title="Контакты">
            <a className={linkCls} href={contacts.telegramChannel} target="_blank" rel="noreferrer">
              Telegram-канал
            </a>
            <a className={linkCls} href={contacts.vk} target="_blank" rel="noreferrer">
              ВКонтакте
            </a>
          </Group>
          <Group title="Покупателям">
            <Link className={linkCls} to="/info/payment-and-returns">
              Оплата и возврат
            </Link>
            <Link className={linkCls} to="/info/documents">
              Документы
            </Link>
          </Group>
          <Group title="Сотрудничество">
            <a className={linkCls} href={`mailto:${contacts.workEmail}`}>
              {contacts.workEmail}
            </a>
          </Group>
          <Group title="Поддержка">
            <a className={linkCls} href={contacts.supportTelegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <a className={linkCls} href={`mailto:${contacts.supportEmail}`}>
              {contacts.supportEmail}
            </a>
          </Group>
        </div>

        <p className="text-[12px] uppercase leading-relaxed tracking-[0.08em] text-ink/30 lg:text-right">
          {site.name} © {site.year}
          <br />
          Все права защищены
        </p>
      </div>

      <div className="mt-16 overflow-hidden md:mt-24">
        <Logo className="block select-none whitespace-nowrap text-center font-sans text-[15vw] leading-none tracking-[0.18em] text-ink/90 md:text-[13vw]" />
      </div>
    </footer>
  )
}
