import type { Category, Product, ProductColor, Size } from './types.ts'

/*
 * Временные данные каталога. Когда появится бэкенд, этот файл заменяется
 * запросом к API в ../api/productApi.ts — компоненты менять не придётся.
 * Фото — плейсхолдеры из public/products (генерируются `npm run images`).
 */

export const categories: Category[] = [
  { id: 'hoodies', name: 'Худи и зипки' },
  { id: 'sweatshirts', name: 'Свитшоты и лонгсливы' },
  { id: 'tees', name: 'Футболки' },
  { id: 'bottoms', name: 'Штаны' },
  { id: 'accessories', name: 'Аксессуары' },
]

const APPAREL_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL']

const SHIPPING_PREORDER = 'Предзаказ · отправка с 20 ноября'
const SHIPPING_IN_STOCK = 'Отправка 3–5 рабочих дней'

export const MOCKUP_DISCLAIMER =
  'Изображения товара представлены в виде макета. Фактические оттенки изделия и принта могут незначительно отличаться от представленных на изображении.'

interface ColorInput {
  id: string
  name: string
  hex: string
  soldOut?: Size[]
}

export const productImages = (slug: string, colorId: string) => [
  `/products/${slug}/${colorId}-front.svg`,
  `/products/${slug}/${colorId}-back.svg`,
  `/products/${slug}/${colorId}-detail.svg`,
]

const sizeChartPath = (slug: string) => `/products/${slug}/size-chart.svg`

function makeColors(slug: string, skuBase: string, colors: ColorInput[]): ProductColor[] {
  return colors.map((c) => ({
    ...c,
    sku: `${skuBase}/${c.id.toUpperCase()}`,
    images: productImages(slug, c.id),
  }))
}

interface ProductInput extends Omit<Product, 'colors' | 'sizeChart'> {
  skuBase: string
  colorList: ColorInput[]
}

function defineProduct({ skuBase, colorList, ...p }: ProductInput): Product {
  return {
    ...p,
    colors: makeColors(p.slug, skuBase, colorList),
    sizeChart: p.kind === 'cap' ? undefined : sizeChartPath(p.slug),
  }
}

export const products: Product[] = [
  defineProduct({
    id: 'p1',
    slug: 'seraph-zip-hoodie',
    isNew: true,
    name: 'Зип-худи Seraph',
    kind: 'zip-hoodie',
    category: 'hoodies',
    price: 11990,
    skuBase: 'SRF/FW26/ZH/SERAPH',
    colorList: [
      { id: 'blue', name: 'Глубокий синий', hex: '#22406E' },
      { id: 'moss', name: 'Мох', hex: '#4D5B3C', soldOut: ['XS'] },
      { id: 'milk', name: 'Молочный', hex: '#E6E0D2' },
    ],
    sizes: APPAREL_SIZES,
    isPreorder: true,
    shippingNote: SHIPPING_PREORDER,
    details: [
      'Крой: оверсайз',
      'Материал: футер 3-нитка, 400 г/м², 100% хлопок',
      'Печать водными красками',
      'Молния: металлическая YKK с двумя бегунками',
    ],
    modelNotes: ['Рост девушки 172 см, размер S', 'Рост парня 186 см, размер L'],
  }),
  defineProduct({
    id: 'p2',
    slug: 'raised-hoodie',
    isNew: true,
    name: 'Худи Raised',
    kind: 'hoodie',
    category: 'hoodies',
    price: 9990,
    skuBase: 'SRF/FW26/HD/RAISED',
    colorList: [
      { id: 'graphite', name: 'Графит', hex: '#2C2F31' },
      { id: 'blue', name: 'Глубокий синий', hex: '#22406E' },
    ],
    sizes: APPAREL_SIZES,
    isPreorder: true,
    shippingNote: SHIPPING_PREORDER,
    details: [
      'Крой: оверсайз, спущенное плечо',
      'Материал: футер 3-нитка, 380 г/м², 100% хлопок',
      'Двойной капюшон без шнурков',
      'Вышивка на груди',
    ],
    modelNotes: ['Рост парня 186 см, размер L'],
  }),
  defineProduct({
    id: 'p3',
    slug: 'pure-nature-sweatshirt',
    name: 'Свитшот Pure Nature',
    kind: 'sweatshirt',
    category: 'sweatshirts',
    price: 8490,
    skuBase: 'SRF/FW26/SW/PURE',
    colorList: [
      { id: 'grey', name: 'Серый меланж', hex: '#9C9C95' },
      { id: 'milk', name: 'Молочный', hex: '#E6E0D2' },
    ],
    sizes: APPAREL_SIZES,
    shippingNote: SHIPPING_IN_STOCK,
    details: [
      'Крой: свободный',
      'Материал: футер 3-нитка, 360 г/м², 100% хлопок',
      'Кашкорсе на манжетах и низе',
      'Печать водными красками',
    ],
    modelNotes: ['Рост девушки 172 см, размер M'],
  }),
  defineProduct({
    id: 'p4',
    slug: 'earth-born-longsleeve',
    name: 'Лонгслив Earth Born',
    kind: 'longsleeve',
    category: 'sweatshirts',
    price: 6490,
    skuBase: 'SRF/FW26/LS/EARTH',
    colorList: [
      { id: 'milk', name: 'Молочный', hex: '#E6E0D2' },
      { id: 'black', name: 'Чёрный', hex: '#1B1C1A', soldOut: ['XL'] },
    ],
    sizes: APPAREL_SIZES,
    shippingNote: SHIPPING_IN_STOCK,
    details: [
      'Крой: прямой, удлинённый рукав',
      'Материал: кулирная гладь, 220 г/м², 100% хлопок',
      'Печать водными красками',
    ],
    modelNotes: ['Рост парня 186 см, размер L'],
  }),
  defineProduct({
    id: 'p5',
    slug: 'ethereal-tee',
    name: 'Футболка Ethereal',
    kind: 'tee',
    category: 'tees',
    price: 4490,
    skuBase: 'SRF/FW26/TS/ETHEREAL',
    colorList: [
      { id: 'white', name: 'Белый', hex: '#F2F1EC' },
      { id: 'moss', name: 'Мох', hex: '#4D5B3C' },
    ],
    sizes: APPAREL_SIZES,
    shippingNote: SHIPPING_IN_STOCK,
    details: [
      'Крой: оверсайз',
      'Материал: кулирная гладь, 240 г/м², 100% хлопок',
      'Плотная горловина 3 см',
      'Печать водными красками',
    ],
    modelNotes: ['Рост девушки 172 см, размер S'],
  }),
  defineProduct({
    id: 'p6',
    slug: 'halo-tee',
    name: 'Футболка Halo',
    kind: 'tee',
    category: 'tees',
    price: 4490,
    skuBase: 'SRF/FW26/TS/HALO',
    colorList: [
      { id: 'black', name: 'Чёрный', hex: '#1B1C1A' },
      { id: 'blue', name: 'Глубокий синий', hex: '#22406E', soldOut: ['XS', 'XL'] },
    ],
    sizes: APPAREL_SIZES,
    shippingNote: SHIPPING_IN_STOCK,
    details: [
      'Крой: оверсайз',
      'Материал: кулирная гладь, 240 г/м², 100% хлопок',
      'Принт на спине',
    ],
  }),
  defineProduct({
    id: 'p7',
    slug: 'archive-pants',
    isNew: true,
    name: 'Штаны Archive',
    kind: 'pants',
    category: 'bottoms',
    price: 8990,
    skuBase: 'SRF/FW26/PT/ARCHIVE',
    colorList: [
      { id: 'graphite', name: 'Графит', hex: '#2C2F31' },
      { id: 'moss', name: 'Мох', hex: '#4D5B3C' },
    ],
    sizes: APPAREL_SIZES,
    isPreorder: true,
    shippingNote: SHIPPING_PREORDER,
    details: [
      'Крой: широкий, прямой',
      'Материал: футер 3-нитка, 380 г/м², 100% хлопок',
      'Пояс на резинке со шнурком',
      'Боковые карманы',
    ],
    modelNotes: ['Рост парня 186 см, размер L'],
  }),
  defineProduct({
    id: 'p8',
    slug: 'seraph-cap',
    isNew: true,
    name: 'Кепка Seraph',
    kind: 'cap',
    category: 'accessories',
    price: 3490,
    skuBase: 'SRF/FW26/CP/SERAPH',
    colorList: [
      { id: 'blue', name: 'Глубокий синий', hex: '#22406E' },
      { id: 'black', name: 'Чёрный', hex: '#1B1C1A' },
    ],
    sizes: ['ONE SIZE'],
    shippingNote: SHIPPING_IN_STOCK,
    details: ['Материал: 100% хлопок, твил', 'Регулируемый ремешок с металлической пряжкой', 'Вышивка спереди'],
  }),
]
