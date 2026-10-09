import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { CartDrawer } from '@/widgets/CartDrawer'
import { Footer } from '@/widgets/Footer'
import { Header } from '@/widgets/Header'
import { PageFallback } from '@/shared/ui/PageFallback'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      {/* Для клавиатуры: первым же Tab — сразу к содержимому, минуя шапку. */}
      <a
        href="#main"
        className="sr-only z-[80] rounded-lg bg-ink px-4 py-2 font-mono text-[12px] text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Перейти к содержимому
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
