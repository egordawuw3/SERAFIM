import { site } from '../../../shared/config/site.ts'

/*
 * Лист ожидания: покупатель открывает бота по ссылке с кодом размера (t.me/<бот>?start=w_p2_grey_M), бот запоминает
 * его и пишет, когда размер снова появится (server/bot.ts). Код — только латиница, цифры и _ (ограничение Telegram).
 */
export const waitlistToken = (productId: string, colorId: string, size: string) => `w_${productId}_${colorId}_${size.replace(/\W/g, '')}`

export const waitlistLink = (productId: string, colorId: string, size: string) =>
  `https://t.me/${site.contacts.ordersBot}?start=${waitlistToken(productId, colorId, size)}`
