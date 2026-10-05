import { Route, Routes, useLocation, type Location } from 'react-router'
import { CatalogPage } from '@/pages/CatalogPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { HomePage } from '@/pages/HomePage'
import { InfoPage } from '@/pages/InfoPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderSuccessPage } from '@/pages/OrderSuccessPage'
import { ProductModal } from '@/pages/ProductModal'
import { ProductPage } from '@/pages/ProductPage'
import { Layout } from './Layout'
import { ScrollManager } from './ScrollManager'

export function App() {
  const location = useLocation()
  // Если товар открыт из каталога, каталог остаётся на фоне, а карточка показывается модальным окном.
  const background = (location.state as { background?: Location } | null)?.background

  return (
    <>
      <ScrollManager skip={Boolean(background)} />
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
    </>
  )
}
