/*
 * Размеры фото товаров. Без зависимостей: используется и в каталоге (браузер), и в scripts/import-photos.ts (Node).
 * Фото готовятся в нескольких ширинах, браузер по srcset/sizes берёт ближайшую к реальному размеру на экране:
 * телефону в сетке 2 колонки хватает 480 px, ретина-ноутбуку в галерее — 1200–1600 px.
 */
export const PHOTO_WIDTHS = [480, 800, 1200, 1600] as const
/** Пропорции кадра 4:5 — те же, что у рамки карточки, поэтому место под фото резервируется заранее (нет CLS). */
export const PHOTO_RATIO = { width: 1600, height: 2000 } as const
/** AVIF первым: он на 20–30% легче WebP; браузер без AVIF возьмёт WebP. */
export const PHOTO_FORMATS = [
  { ext: 'avif', type: 'image/avif' },
  { ext: 'webp', type: 'image/webp' },
] as const

export const photoFile = (slug: string, colorId: string, view: string, width: number, ext: string) =>
  `/products/${slug}/${colorId}-${view}-${width}.${ext}`
