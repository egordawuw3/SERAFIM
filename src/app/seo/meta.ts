import { getProductBySlug, getProducts } from '@/entities/product/api/productApi'
import { isColorSoldOut } from '@/entities/product/lib/availability'
import type { Product, ProductImage } from '@/entities/product/model/types'
import { INFO_TITLES } from '@/pages/infoTitles'
import { site } from '@/shared/config/site'

/*
 * Метаданные страниц — единый источник и для браузера (RouteMeta обновляет <head> при переходах),
 * и для сборки (scripts/prerender.ts вписывает те же теги в готовый HTML каждой страницы).
 * Мессенджеры и часть поисковиков не выполняют JavaScript — для них важен именно HTML из сборки.
 */

/** Адрес сайта для canonical, og:url и абсолютных ссылок в микроразметке. Задаётся при сборке: VITE_SITE_URL. */
export const SITE_URL = String(import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '')

const origin = () => SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
const absUrl = (path: string) => `${origin()}${path}`

const BRAND = site.name
const DEFAULT_DESCRIPTION =
  'SERAFIM — одежда, рождённая природой: плотный хлопок, водные краски, малые тиражи. Худи, свитшоты, футболки. Доставка СДЭК по всей России.'
const DEFAULT_IMAGE = '/images/hero.jpg'

interface PageMeta {
  title: string
  description: string
  /** Путь для canonical без параметров фильтров (?color=…) — чтобы не плодить дубли в поиске. */
  path: string
  /** Картинка превью для Open Graph (JPEG/WebP/PNG — SVG мессенджеры не показывают). */
  image: string
  type: 'website' | 'product'
  /** Не индексировать: корзина, оформление, 404. */
  noindex?: boolean
  /** Цена для og-тегов product:price:*. */
  price?: number
  jsonLd: object[]
}

// ---------- Schema.org ----------

const organization = () => ({
  '@type': 'Organization',
  '@id': absUrl('/#organization'),
  name: BRAND,
  url: absUrl('/'),
  logo: absUrl('/favicon.svg'),
  email: site.contacts.email,
  telephone: site.contacts.phone,
  sameAs: [site.contacts.telegramChannel],
})

const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: absUrl(item.path) })),
})

/** Растровое фото для превью и микроразметки; у SVG-заглушек — нет (их не показывают ни мессенджеры, ни Google). */
const rasterImage = (img: ProductImage | undefined) => (img && !img.src.endsWith('.svg') ? img.src : undefined)

function productJsonLd(product: Product, path: string) {
  const images = product.colors.flatMap((c) => c.images.map(rasterImage)).filter((s): s is string => Boolean(s))
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productDescription(product),
    sku: product.colors[0].sku,
    brand: { '@type': 'Brand', name: BRAND },
    category: product.category,
    ...(images.length ? { image: images.map(absUrl) } : {}),
    // Отдельное предложение на каждый цвет: свой артикул и своё наличие.
    offers: product.colors.map((c) => ({
      '@type': 'Offer',
      sku: c.sku,
      url: absUrl(`${path}?color=${c.id}`),
      priceCurrency: 'RUB',
      price: String(product.price),
      itemCondition: 'https://schema.org/NewCondition',
      availability: isColorSoldOut(product, c)
        ? 'https://schema.org/OutOfStock'
        : product.isPreorder
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
      seller: { '@id': absUrl('/#organization') },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'RU',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: site.terms.returnDays,
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      },
    })),
    // AggregateRating намеренно нет: отзывов пока нет, а выдуманный рейтинг — нарушение правил Google и Яндекса.
  }
}

const itemList = (list: Product[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/product/${p.slug}`), name: p.name })),
})

// ---------- Страницы ----------

function productDescription(p: Product): string {
  const colors = p.colors.map((c) => c.name.toLowerCase()).join(', ')
  const raw = p.details.find((d) => d.startsWith('Материал'))?.replace('Материал: ', '')
  const material = raw && raw[0].toUpperCase() + raw.slice(1)
  return [`${p.name} от ${BRAND}`, material, `Цвета: ${colors}`, `Размеры: ${p.sizes.join(', ')}`, p.shippingNote]
    .filter(Boolean)
    .join('. ')
    .concat('.')
}

const base = (over: Partial<PageMeta> & Pick<PageMeta, 'title' | 'path'>): PageMeta => ({
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_IMAGE,
  type: 'website',
  jsonLd: [],
  ...over,
})

const notFound = (path: string): PageMeta =>
  base({ title: `Страница не найдена — ${BRAND}`, path, noindex: true })

export function routeMeta(pathname: string): PageMeta {
  const path = pathname.replace(/\/+$/, '') || '/'
  const home = { name: 'Главная', path: '/' }

  if (path === '/') {
    return base({
      title: `${BRAND} — одежда, рождённая природой`,
      path,
      jsonLd: [
        { '@context': 'https://schema.org', ...organization() },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: absUrl('/'), inLanguage: 'ru' },
        itemList(getProducts()),
      ],
    })
  }

  if (path === '/catalog') {
    return base({
      title: `Каталог — худи, свитшоты, футболки | ${BRAND}`,
      description: `Каталог ${BRAND}: худи, свитшоты, лонгсливы, футболки и штаны из плотного хлопка. Малые тиражи, доставка СДЭК по России.`,
      path,
      jsonLd: [breadcrumbs([home, { name: 'Каталог', path }]), itemList(getProducts())],
    })
  }

  const productSlug = path.match(/^\/product\/([^/]+)$/)?.[1]
  if (productSlug) {
    const product = getProductBySlug(productSlug)
    if (!product) return notFound(path)
    return base({
      title: `${product.name} — купить за ${product.price.toLocaleString('ru-RU')} ₽ | ${BRAND}`,
      description: productDescription(product),
      path,
      type: 'product',
      price: product.price,
      image: rasterImage(product.colors[0].images[0]) ?? DEFAULT_IMAGE,
      jsonLd: [
        productJsonLd(product, path),
        breadcrumbs([home, { name: 'Каталог', path: '/catalog' }, { name: product.name, path }]),
      ],
    })
  }

  if (path === '/about') {
    return base({
      title: `О бренде — ${BRAND}`,
      description: `${BRAND}: вещи из плотного хлопка с водными красками, которые выходят небольшим тиражом и не повторяются.`,
      path,
      jsonLd: [breadcrumbs([home, { name: 'О бренде', path }])],
    })
  }

  const infoSlug = path.match(/^\/info\/([^/]+)$/)?.[1]
  if (infoSlug) {
    const pageTitle = INFO_TITLES[infoSlug]
    if (!pageTitle) return notFound(path)
    // /info/documents — старый адрес оферты: canonical ведёт на основной.
    const canonical = infoSlug === 'documents' ? '/info/offer' : path
    return base({
      title: `${pageTitle} — ${BRAND}`,
      description: `${pageTitle} интернет-магазина ${BRAND}.`,
      path: canonical,
      jsonLd: [breadcrumbs([home, { name: pageTitle, path: canonical }])],
    })
  }

  if (path === '/checkout') return base({ title: `Оформление заказа — ${BRAND}`, path, noindex: true })
  if (path === '/checkout/success') return base({ title: `Заказ оформлен — ${BRAND}`, path, noindex: true })

  return notFound(path)
}

// ---------- Теги ----------

interface HeadTag {
  tag: 'meta' | 'link'
  /** Атрибут, по которому тег ищется для обновления: name / property / rel. */
  key: 'name' | 'property' | 'rel'
  attrs: Record<string, string>
}

export function headTags(meta: PageMeta): HeadTag[] {
  const url = absUrl(meta.path)
  const image = absUrl(meta.image)
  const name = (n: string, content: string): HeadTag => ({ tag: 'meta', key: 'name', attrs: { name: n, content } })
  const prop = (p: string, content: string): HeadTag => ({ tag: 'meta', key: 'property', attrs: { property: p, content } })
  return [
    name('description', meta.description),
    name('robots', meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
    ...(SITE_URL ? [{ tag: 'link', key: 'rel', attrs: { rel: 'canonical', href: url } } as HeadTag] : []),
    prop('og:type', meta.type),
    prop('og:site_name', BRAND),
    prop('og:locale', 'ru_RU'),
    prop('og:title', meta.title),
    prop('og:description', meta.description),
    ...(SITE_URL ? [prop('og:url', url)] : []),
    prop('og:image', image),
    ...(meta.price ? [prop('product:price:amount', String(meta.price)), prop('product:price:currency', 'RUB')] : []),
    name('twitter:card', 'summary_large_image'),
    name('twitter:title', meta.title),
    name('twitter:description', meta.description),
    name('twitter:image', image),
  ]
}

const escapeAttr = (v: string) => v.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
/** JSON-LD внутри <script>: экранируем «<», чтобы строка вида «</script>» не закрыла тег. */
export const jsonLdText = (data: object[]) => JSON.stringify(data.length === 1 ? data[0] : data).replaceAll('<', '\\u003c')

/** HTML для <head> при сборке (prerender). */
export function renderHead(meta: PageMeta): string {
  const tags = headTags(meta).map(
    (t) => `<${t.tag} ${Object.entries(t.attrs).map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ')} />`,
  )
  const ld = meta.jsonLd.length ? `<script type="application/ld+json" id="ld-json">${jsonLdText(meta.jsonLd)}</script>` : ''
  return [`<title>${escapeAttr(meta.title)}</title>`, ...tags, ld].filter(Boolean).join('\n    ')
}
