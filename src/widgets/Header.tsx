import { NavLink, useLocation } from 'react-router'
import { countItems } from '@/features/cart/model/cart'
import { useCart } from '@/features/cart/model/store'
import { cn } from '@/shared/lib/cn'
import { prefetch } from '@/shared/lib/prefetch'
import { useScrolled } from '@/shared/lib/useScrolled'
import { Logo } from '@/shared/ui/Logo'
import { useBannerInView } from '@/shared/lib/bannerVisibility'

// min-h-6 — зона касания не меньше 24 px (WCAG 2.5.8).
const linkCls = 'link-hover tap-target inline-flex min-h-6 items-center transition-colors duration-300 hover:text-ink'

export function Header() {
  const count = useCart((s) => countItems(s.items))
  const openCart = useCart((s) => s.open)
  const scrolled = useScrolled()
  // На главной, пока виден баннер с огромным SERAFIM, логотип в шапке прячем — без двойного названия подряд.
  const isHome = useLocation().pathname === '/'
  const bannerInView = useBannerInView()
  const hideLogo = isHome && bannerInView

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-[background-color,border-color,padding] duration-500',
        scrolled ? 'border-ink/10 bg-paper/85 py-4 backdrop-blur-md md:py-5' : 'border-transparent py-6 md:py-8',
      )}
    >
      <div className="relative flex items-center justify-between px-4 md:px-12">
        {/* Каталог — на главной (туда ведёт логотип), поэтому в меню только «О бренде». */}
        <nav className="flex items-center text-[10px] font-medium uppercase tracking-[0.2em] text-ink/70" aria-label="Основное меню">
          <NavLink to="/about" className={({ isActive }) => cn(linkCls, isActive && 'text-ink')}>
            О бренде
          </NavLink>
        </nav>

        <Logo
          hidden={hideLogo}
          className={cn(
            // py — зона нажатия до 44 px по высоте; логотип по центру шапки остаётся там же.
            'absolute left-1/2 -translate-x-1/2 py-[5px] text-[1.4rem] text-ink transition-[opacity,translate] duration-500 sm:text-[1.6rem] md:text-[2.4rem]',
            hideLogo && 'pointer-events-none -translate-y-2 opacity-0',
          )}
        />

        <button
          type="button"
          onClick={openCart}
          onPointerEnter={() => prefetch('cart')}
          onFocus={() => prefetch('cart')}
          aria-haspopup="dialog"
          // Без aria-label: доступное имя = видимый текст «Корзина (N)» (WCAG 2.5.3 Label in Name).
          className={cn(linkCls, 'min-h-6 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/70')}
        >
          Корзина ({count})
        </button>
      </div>
    </header>
  )
}
