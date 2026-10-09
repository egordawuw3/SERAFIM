export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'ONE SIZE'

export type GarmentKind =
  | 'zip-hoodie'
  | 'hoodie'
  | 'sweatshirt'
  | 'longsleeve'
  | 'tee'
  | 'pants'
  | 'cap'

export type CategoryId = 'hoodies' | 'sweatshirts' | 'tees' | 'bottoms' | 'accessories'

export interface Category {
  id: CategoryId
  name: string
}

/** Ракурс фото — из него собирается alt («вид спереди», «размерная сетка»…). */
export type ImageView = 'front' | 'back' | 'detail' | 'size-chart'

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

export interface Product {
  id: string
  slug: string
  name: string
  kind: GarmentKind
  category: CategoryId
  price: number
  colors: ProductColor[]
  sizes: Size[]
  /** Изображение размерной сетки — всегда последнее в галерее. */
  sizeChart?: ProductImage
  shippingNote: string
  details: string[]
  modelNotes?: string[]
  isPreorder?: boolean
  isNew?: boolean
}
