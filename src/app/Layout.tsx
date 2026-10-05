import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { CartDrawer } from '@/widgets/CartDrawer'
import { Footer } from '@/widgets/Footer'
import { Header } from '@/widgets/Header'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Header />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
