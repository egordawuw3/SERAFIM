/* eslint-disable react/only-export-components -- точка входа сборки, не модуль для горячей перезагрузки */
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router'
import { App } from '@/app/App'

/*
 * Точка входа для пререндера (scripts/prerender.ts): при сборке каждая страница рендерится в готовый HTML.
 * prerender дожидается ленивых страниц (React.lazy), поэтому в HTML попадает весь текст —
 * его видят поисковики и мессенджеры без выполнения JavaScript, а покупатель видит страницу до загрузки бандла.
 */
export async function render(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
    // Без «прогрессивных кусков»: иначе React выносит крупные блоки (главная, каталог > ~12 КБ) в конец HTML
    // и вставляет их встроенным <script>, который блокирует наш CSP. Для готового HTML кусочная отдача не нужна.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  )
  return new Response(prelude).text()
}

export { renderHead, routeMeta, SITE_URL } from '@/app/seo/meta'
export { getProducts } from '@/entities/product/api/productApi'
export { INFO_TITLES } from '@/pages/infoTitles'
