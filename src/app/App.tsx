import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation, type Location } from 'react-router'
import { useCart } from '@/features/cart/model/store'
import { CatalogPage } from '@/pages/CatalogPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { registerPrefetch } from '@/shared/lib/prefetch'
import { loadCartPanel } from '@/widgets/cartPanelLoader'
import { ErrorBoundary } from './ErrorBoundary'
import { Layout } from './Layout'
import { ScrollManager } from './ScrollManager'
import { RouteMeta } from './seo/RouteMeta'

/*
 * Код-сплиттинг: в стартовом бандле — только главная и каталог (первый экран).
 * Карточка товара (модалка, страница, галерея), корзина, оформление, «О бренде», документы — отдельные чанки.
 * Карточку и корзину догружаем заранее при наведении (prefetch), так что клик открывает их без задержки.
 */
const loadProduct = () => Promise.all([import('@/pages/ProductModal'), import('@/pages/ProductPage')])
registerPrefetch('product', loadProduct)
registerPrefetch('cart', loadCartPanel)

const ProductModal = lazy(() => import('@/pages/ProductModal').then((m) => ({ default: m.ProductModal })))
const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const InfoPage = lazy(() => import('@/pages/InfoPage').then((m) => ({ default: m.InfoPage })))

export function App() {
  const location = useLocation()
  // Если товар открыт из каталога, каталог остаётся на фоне, а карточка показывается модальным окном.
  const background = (location.state as { background?: Location } | null)?.background

  // Корзина из localStorage подхватывается после гидратации: в готовом HTML из сборки она пустая,
  // и первый рендер в браузере должен с ним совпасть (иначе React перерисует страницу целиком).
  useEffect(() => {
    void useCart.persist.rehydrate()
  }, [])

  return (
    <ErrorBoundary>
      <RouteMeta />
      <ScrollManager backgroundPath={background?.pathname} />
      <Routes location={background ?? location}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<OrderSuccessPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="info/:slug" element={<InfoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      {background && (
        <Suspense fallback={null}>
          <Routes>
            <Route path="product/:slug" element={<ProductModal />} />
          </Routes>
        </Suspense>
      )}
    </ErrorBoundary>
  )
}
