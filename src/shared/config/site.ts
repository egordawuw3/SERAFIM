/*
 * Контакты, реквизиты и условия продажи. Используются в футере и на страницах /info/*.
 * Всё, что помечено TODO, — заглушки: заменить на реальные данные перед запуском.
 */
export const site = {
  name: 'SERAFIM',
  tagline: 'Pure Nature',
  year: 2026,
  contacts: {
    telegramChannel: 'https://t.me/serafim6s',
    phone: '+7 920 182-53-11',
    email: 'serafimsafronov09@gmail.com',
  },
  /** Продавец — самозанятый (плательщик НПД). */
  seller: {
    name: 'Сафронов Серафим Александрович',
    status: 'Плательщик налога на профессиональный доход (самозанятый)',
    inn: '691407405140',
  },
  terms: {
    /** Срок возврата товара надлежащего качества. По ст. 26.1 ЗоЗПП — не меньше 7 дней, короче ставить нельзя. */
    returnDays: 7,
    shipInStockDays: 5,
    shipPreorderDays: 30,
    /** Дата редакции юридических текстов. */
    documentsDate: '8 октября 2026 г.',
  },
} as const

export const phoneHref = `tel:${site.contacts.phone.replace(/[^\d+]/g, '')}`
