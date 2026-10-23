export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'ONE SIZE'

/** Вид изделия — по нему рисуются SVG-заглушки, пока нет фото (scripts/generate-placeholders.ts). */
export type GarmentKind = 'hoodie' | 'rugby' | 'backpack'

export type CategoryId = 'hoodies' | 'sweatshirts' | 'tees' | 'bottoms' | 'accessories'

export interface Category {
  id: CategoryId
  name: string
}

/** Ракурс фото — из него собирается alt («вид спереди», «вид сзади»…). */
export type ImageView = 'front' | 'back' | 'detail' | 'model'

export interface ProductImage {
  /** Запасной адрес: SVG-заглушка или WebP 800 px для браузеров без <picture>. */
  src: string
  view: ImageView
  /** Настоящие размеры кадра — для width/height у <img>, чтобы браузер заранее занял место (нет сдвигов вёрстки). */
  width: number
  height: number
  /** Адаптивные версии реальных фото (AVIF, WebP в нескольких ширинах). У SVG-заглушек их нет — вектору не нужны. */
  sources?: { type: string; srcSet: string }[]
}

export interface ProductColor {
  id: string
  name: string
  hex: string
  sku: string
  /** Фото по порядку: первое — основное, второе — показывается при наведении в каталоге. */
  images: ProductImage[]
  /** Размеры, которых нет в наличии в этом цвете. */
  soldOut?: Size[]
}

export interface Measurement {
  size: Size
  /** Длина изделия, см. */
  length: number
  /** Ширина по груди, см. */
  width: number
}

export interface Product {
  id: string
  slug: string
  name: string
  kind: GarmentKind
  category: CategoryId
  price: number
  colors: ProductColor[]
  sizes: Size[]
  /** Замеры изделия в сантиметрах по размерам — выводятся таблицей «Размерная сетка». */
  measurements?: Measurement[]
  /** Состав ткани, например «90% хлопок, 10% полиэстер». */
  composition?: string
  /** Рекомендации по уходу — по закону о защите прав потребителей покупатель должен видеть их до покупки. */
  care?: string[]
  country?: string
  shippingNote: string
  /** Особенности кроя и деталей: «Кроп-фит», «Капюшон, карман-кенгуру»… */
  details: string[]
  modelNotes?: string[]
  isPreorder?: boolean
  isNew?: boolean
  /** Ссылка на этот товар на Авито. Нет — кнопка ведёт на профиль (site.avitoProfileUrl), нет и его — кнопки нет. */
  avitoUrl?: string
  /** Вес посылки с упаковкой, г — для расчёта доставки СДЭК. Нет — site.shipping.defaultPackage. */
  weightG?: number
  /** Габариты посылки, см: длина × ширина × высота. */
  dimsCm?: [number, number, number]
}
