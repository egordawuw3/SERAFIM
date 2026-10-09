/*
 * Пререндер (SSG): после `vite build` превращает каждую страницу сайта в готовый HTML с контентом и метатегами.
 * Зачем:
 *  - SEO: Яндекс, Google и мессенджеры (превью ссылок в Telegram/VK) видят текст, цены, Open Graph и Schema.org
 *    без выполнения JavaScript — у каждого товара своё превью;
 *  - скорость: контент и главное фото видны сразу из HTML, до загрузки бандла (лучше FCP/LCP).
 * Потом React «оживляет» этот HTML (hydrateRoot в main.tsx).
 *
 * Запускается из `npm run build`. Адрес сайта для canonical/og:url/sitemap — переменная VITE_SITE_URL.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

interface ServerEntry {
  render(url: string): Promise<string>
  renderHead(meta: ReturnType<ServerEntry['routeMeta']>): string
  routeMeta(path: string): { noindex?: boolean; path: string }
  SITE_URL: string
  getProducts(): { slug: string }[]
  INFO_TITLES: Record<string, string>
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const entryUrl = pathToFileURL(join(ROOT, 'dist-ssr', 'entry-server.js')).href
const entry = (await import(entryUrl)) as ServerEntry

const routes = [
  '/',
  '/catalog',
  '/about',
  '/checkout',
  '/checkout/success',
  ...Object.keys(entry.INFO_TITLES).map((slug) => `/info/${slug}`),
  ...entry.getProducts().map((p) => `/product/${p.slug}`),
]

const rawTemplate = readFileSync(join(DIST, 'index.html'), 'utf8')
// Критический CSS прямо в HTML: без отдельного запроса браузер рисует страницу сразу (FCP/LCP), не дожидаясь
// стилей. 10 КБ в gzip — дешевле лишнего сетевого круга; переходы внутри сайта идут без перезагрузки HTML.
const template = rawTemplate.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/, (_tag, href: string) => {
  const css = readFileSync(join(DIST, href), 'utf8')
  return `<style>${css}</style>`
})
// Из шаблона убираем общие теги — у каждой страницы будут свои (заголовок, описание, OG).
const baseTemplate = template
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta (?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>\s*/g, '')
  .replace(/<!--[^>]*og:image[^>]*-->\s*/g, '')

async function renderPage(url: string, file: string) {
  const html = await entry.render(url)
  const head = entry.renderHead(entry.routeMeta(url))
  const page = baseTemplate
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page)
}

for (const route of routes) {
  await renderPage(route, route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html'))
}
// Страница 404 — сервер отдаёт её с кодом 404 для всех неизвестных адресов.
await renderPage('/404', join(DIST, '404.html'))

// robots.txt и sitemap.xml
const site = entry.SITE_URL
const indexable = routes.filter((r) => !entry.routeMeta(r).noindex && r !== '/info/documents')
writeFileSync(
  join(DIST, 'robots.txt'),
  ['User-agent: *', 'Allow: /', 'Disallow: /checkout', 'Disallow: /api/', site && `\nSitemap: ${site}/sitemap.xml`]
    .filter(Boolean)
    .join('\n') + '\n',
)
if (site) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = indexable.map((r) => `  <url><loc>${site}${r === '/' ? '/' : r}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
} else {
  console.warn('[prerender] VITE_SITE_URL не задан: без canonical, og:url и sitemap.xml. Для продакшена задайте адрес сайта.')
}

console.info(`[prerender] страниц: ${routes.length + 1} (включая 404)`)
