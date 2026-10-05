import { useParams } from 'react-router'
import { site } from '@/shared/config/site'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'
import { NotFoundPage } from './NotFoundPage'

interface Section {
  title: string
  body: string[]
}

/* TODO: тексты-заглушки. Заменить юридически выверенными текстами клиента. */
const PAGES: Record<string, { title: string; sections: Section[] }> = {
  'payment-and-returns': {
    title: 'Оплата и возврат',
    sections: [
      {
        title: 'Оплата',
        body: [
          'Вы оставляете заявку на сайте, мы связываемся с вами, подтверждаем наличие, размер и доставку.',
          'Оплата — банковской картой или через СБП по ссылке, которую мы присылаем после подтверждения заказа.',
        ],
      },
      {
        title: 'Доставка',
        body: [
          'Отправляем СДЭК и Почтой России по всей России. Стоимость и сроки зависят от города — мы рассчитаем их, когда свяжемся с вами по заявке.',
          'Товары в наличии отправляем за 3–5 рабочих дней, товары по предзаказу — в дату, указанную в карточке товара.',
        ],
      },
      {
        title: 'Обмен и возврат',
        body: [
          'Вернуть или обменять товар надлежащего качества можно в течение 14 дней с момента получения, если сохранены его товарный вид и бирки.',
          `Чтобы оформить возврат, напишите нам на ${site.contacts.supportEmail} или в Telegram поддержки — укажите номер заказа.`,
          'Деньги возвращаются на карту, с которой была оплата, в течение 10 дней после получения нами товара.',
        ],
      },
    ],
  },
  documents: {
    title: 'Документы',
    sections: [
      { title: 'Публичная оферта', body: ['Текст договора публичной оферты будет размещён здесь.'] },
      { title: 'Политика обработки персональных данных', body: ['Текст политики будет размещён здесь.'] },
      { title: 'Реквизиты', body: ['ИП / самозанятый, ИНН, ОГРНИП — будут указаны здесь.'] },
    ],
  },
}

export function InfoPage() {
  const { slug = '' } = useParams()
  const page = PAGES[slug]
  useDocumentTitle(page?.title)
  if (!page) return <NotFoundPage />

  return (
    <section className="w-full px-4 pb-24 pt-8 md:px-12 md:pt-12">
      <h1 className="mb-12 border-b border-ink/10 pb-6 text-3xl font-light uppercase tracking-widest md:text-4xl">{page.title}</h1>
      <div className="max-w-2xl space-y-12 font-mono text-[13px] leading-relaxed">
        {page.sections.map((s) => (
          <div key={s.title} id={s.title}>
            <h2 className="mb-4 uppercase tracking-[0.12em]">{s.title}</h2>
            <div className="space-y-3 text-ink/70">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
