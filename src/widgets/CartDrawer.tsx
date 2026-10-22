import { lazy, Suspense } from 'react'
import { useCart } from '@/features/cart/model/store'

import { loadCartPanel } from './cartPanelLoader'

const CartPanel = lazy(() => loadCartPanel().then((m) => ({ default: m.CartPanel })))

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen)
  if (!isOpen) return null
  return (
    <Suspense fallback={null}>
      <CartPanel />
    </Suspense>
  )
}
