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

export interface ProductColor {
  id: string
  name: string
  hex: string
  sku: string
  /** Фото по порядку: первое — основное, второе — показывается при наведении в каталоге. */
  images: string[]
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
  sizeChart?: string
  shippingNote: string
  details: string[]
  modelNotes?: string[]
  isPreorder?: boolean
}
