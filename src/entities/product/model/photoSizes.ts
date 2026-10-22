/*
 * Размеры фото товаров. Без зависимостей: используется и в каталоге (браузер), и в scripts/import-photos.ts (Node).
 * Фото готовятся в нескольких ширинах, браузер по srcset/sizes берёт ближайшую к реальному размеру на экране:
 * миниатюрам (галерея, корзина) — 240 px, телефону в сетке 2 колонки — 480 px, ретина-ноутбуку в галерее — 1200–1600 px.
 */
export const PHOTO_WIDTHS = [240, 480, 800, 1200, 1600] as const
/** Пропорции кадра 4:5 — те же, что у рамки карточки, поэтому место под фото резервируется заранее (нет CLS). */
export const PHOTO_RATIO = { width: 1600, height: 2000 } as const
/** AVIF первым: он на 20–30% легче WebP; браузер без AVIF возьмёт WebP. */
export const PHOTO_FORMATS = [
  { ext: 'avif', type: 'image/avif' },
  { ext: 'webp', type: 'image/webp' },
] as const

export const photoFile = (slug: string, colorId: string, view: string, width: number, ext: string) =>
  `/products/${slug}/${colorId}-${view}-${width}.${ext}`

/**
 * Картинка для превью ссылок (Telegram, VK, поисковики): JPEG — его понимают все, квадрат 1200 — крупное превью,
 * вещь целиком на крафтовом фоне сайта (без обрезки капюшона, как было бы при кадрировании 4:5 в квадрат).
 */
export const OG_IMAGE = { width: 1200, height: 1200, background: '#ece4d4' } as const
export const ogImageFile = (slug: string, colorId: string) => `/products/${slug}/${colorId}-og.jpg`

/** Миниатюра (корзина, оформление — кадр 80 px): WebP 240 px вместо запасного 800 px. У SVG-заглушек — как есть. */
export const thumbnailSrc = (img: { src: string; sources?: unknown[] }) =>
  img.sources ? img.src.replace(/-\d+\.webp$/, '-240.webp') : img.src
