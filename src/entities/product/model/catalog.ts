import { PHOTO_FORMATS, PHOTO_RATIO, PHOTO_WIDTHS, photoFile } from './photoSizes.ts'
import { productPhotos } from './photos.generated.ts'
import type { Category, ImageView, Measurement, Product, ProductColor, ProductImage, Size } from './types.ts'

/*
 * Каталог SERAFIM (данные от клиента, 10.10.2026). Когда появится бэкенд, этот файл заменяется
 * запросом к API в ../api/productApi.ts — компоненты менять не придётся.
 *
 * TODO(клиент): материал и уход рюкзака; вес посылки каждой вещи (для СДЭК, пока — значение по умолчанию); фото сзади.
 * Фото: настоящие — AVIF/WebP в нескольких ширинах из `npm run photos` (см. design/product-prompts.md),
 * для цветов без фото — SVG-заглушки из `npm run images`.
 */

export const categories: Category[] = [
  { id: 'hoodies', name: 'Худи' },
  { id: 'sweatshirts', name: 'Регбийки и лонгсливы' },
  { id: 'accessories', name: 'Аксессуары' },
]

const APPAREL_SIZES: Size[] = ['S', 'M', 'L', 'XL']

const SHIPPING_IN_STOCK = 'В наличии · отправка в течение 5 дней после оплаты'
const MADE_IN = 'Россия'
/** Все три худи — серый меланж (голубое у The only way — только принт и нашивки). */
const HOODIE_GREY = { id: 'grey', name: 'Серый меланж', hex: '#C9CAC5' }

export const MOCKUP_DISCLAIMER =
  'Цвет изделия на фото может немного отличаться от реального из-за освещения и настроек экрана.'

interface ColorInput {
  id: string
  name: string
  hex: string
  soldOut?: Size[]
}

/** SVG-заглушки нарисованы в 800×1000 — те же 4:5. */
const placeholder = (src: string, view: ImageView): ProductImage => ({ src, view, width: 800, height: 1000 })

const photo = (slug: string, colorId: string, view: ImageView): ProductImage => ({
  src: photoFile(slug, colorId, view, 800, 'webp'),
  view,
  ...PHOTO_RATIO,
  sources: PHOTO_FORMATS.map(({ ext, type }) => ({
    type,
    srcSet: PHOTO_WIDTHS.map((w) => `${photoFile(slug, colorId, view, w, ext)} ${w}w`).join(', '),
  })),
})

function productImages(slug: string, colorId: string): ProductImage[] {
  const views = productPhotos[`${slug}/${colorId}`] as ImageView[] | undefined
  if (views) return views.map((view) => photo(slug, colorId, view))
  return (['front', 'back', 'detail'] as const).map((view) => placeholder(`/products/${slug}/${colorId}-${view}.svg`, view))
}


function makeColors(slug: string, skuBase: string, colors: ColorInput[]): ProductColor[] {
  return colors.map((c) => ({
    ...c,
    sku: `${skuBase}/${c.id.toUpperCase()}`,
    images: productImages(slug, c.id),
  }))
}

interface ProductInput extends Omit<Product, 'colors'> {
  skuBase: string
  colorList: ColorInput[]
}

function defineProduct({ skuBase, colorList, ...p }: ProductInput): Product {
  return { ...p, colors: makeColors(p.slug, skuBase, colorList) }
}

/** Замеры одинаковые у всех трёх худи (подтверждено клиентом). */
const HOODIE_MEASUREMENTS: Measurement[] = [
  { size: 'S', length: 61, width: 44 },
  { size: 'M', length: 63, width: 48 },
  { size: 'L', length: 65, width: 52 },
  { size: 'XL', length: 67, width: 57 },
]

const HOODIE_COMMON = {
  kind: 'hoodie',
  category: 'hoodies',
  price: 4500,
  sizes: APPAREL_SIZES,
  measurements: HOODIE_MEASUREMENTS,
  composition: '90% хлопок, 10% полиэстер',
  care: [
    'Стирка при 30 °C, деликатный режим',
    'Отжим не выше 800 об/мин',
    'Перед стиркой вывернуть наизнанку',
    'Не сушить в сушильной машине',
    'Гладить с изнанки при температуре до 110 °C, не гладить по принту',
  ],
  country: MADE_IN,
  shippingNote: SHIPPING_IN_STOCK,
  details: ['Крой: кроп-фит', 'Капюшон, карман-кенгуру, без молнии', 'Принт'],
} as const satisfies Partial<ProductInput>

export const products: Product[] = [
  defineProduct({
    id: 'p1',
    slug: 'i-will-attract-rugby',
    name: 'Регбийка I will attract',
    kind: 'rugby',
    category: 'sweatshirts',
    price: 3900,
    skuBase: 'SRF/RG/IWILL',
    colorList: [{ id: 'blue', name: 'Синий', hex: '#2A3FD0', soldOut: ['L', 'XL'] }],
    sizes: APPAREL_SIZES,
    measurements: [
      { size: 'S', length: 62, width: 48 },
      { size: 'M', length: 64, width: 50 },
      { size: 'L', length: 66, width: 52 },
      { size: 'XL', length: 68, width: 54 },
    ],
    composition: '75% хлопок, 20% полиэстер, 5% эластан',
    care: [
      'Стирка при 30 °C, минимальные обороты',
      'Перед стиркой вывернуть наизнанку',
      'Не отжимать и не сушить в сушильной машине',
      'Гладить с изнанки при умеренном нагреве — 110–150 °C',
    ],
    country: MADE_IN,
    shippingNote: SHIPPING_IN_STOCK,
    details: ['Крой: кроп-фит', 'Принт'],
  }),
  defineProduct({
    ...HOODIE_COMMON,
    id: 'p2',
    slug: 'the-only-way-hoodie',
    name: 'Худи The only way',
    skuBase: 'SRF/HD/ONLYWAY',
    colorList: [HOODIE_GREY],
  }),
  defineProduct({
    ...HOODIE_COMMON,
    id: 'p3',
    slug: 'if-she-not-from-god-hoodie',
    name: 'Худи If she not from God',
    skuBase: 'SRF/HD/FROMGOD',
    colorList: [HOODIE_GREY],
  }),
  defineProduct({
    ...HOODIE_COMMON,
    id: 'p4',
    slug: 'salvation-hoodie',
    name: 'Худи Salvation',
    skuBase: 'SRF/HD/SALVATION',
    colorList: [HOODIE_GREY],
  }),
  defineProduct({
    id: 'p5',
    slug: 'jesus-backpack',
    name: 'Рюкзак Jesus',
    kind: 'backpack',
    category: 'accessories',
    price: 3900,
    skuBase: 'SRF/BP/JESUS',
    colorList: [{ id: 'black', name: 'Чёрный', hex: '#1B1C1A' }],
    sizes: ['ONE SIZE'],
    country: MADE_IN,
    shippingNote: SHIPPING_IN_STOCK,
    details: ['Размер: 30 × 40 × 13 см', 'Принт'],
    dimsCm: [40, 30, 13],
  }),
]
