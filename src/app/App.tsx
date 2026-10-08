import { lazy } from 'react'
import { Route, Routes, useLocation, type Location } from 'react-router'
import { CatalogPage } from '@/pages/CatalogPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProductModal } from '@/pages/ProductModal'
import { ProductPage } from '@/pages/ProductPage'
import { ErrorBoundary } from './ErrorBoundary'
import { Layout } from './Layout'
import { ScrollManager } from './ScrollManager'

// Редко посещаемые страницы (и валидация формы на zod) — отдельными чанками.
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage })))
const InfoPage = lazy(() => import('@/pages/InfoPage').then((m) => ({ default: m.InfoPage })))

export function App() {
  const location = useLocation()
  // Если товар открыт из каталога, каталог остаётся на фоне, а карточка показывается модальным окном.
  const background = (location.state as { background?: Location } | null)?.background

  return (
    <ErrorBoundary>
      <ScrollManager backgroundPath={background?.pathname} />
      <Routes location={background ?? location}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<OrderSuccessPage />} />
          <Route path="info/:slug" element={<InfoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      {background && (
        <Routes>
          <Route path="product/:slug" element={<ProductModal />} />
        </Routes>
      )}
    </ErrorBoundary>
  )
}
