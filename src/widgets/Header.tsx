import { Link, NavLink } from 'react-router'
import { useCart } from '@/features/cart/model/store'
import { countItems } from '@/features/cart/model/cart'
import { cn } from '@/shared/lib/cn'
import { Logo } from '@/shared/ui/Logo'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('link-hover transition-colors duration-300 hover:text-ink', isActive && 'text-ink')

export function Header() {
  const count = useCart((s) => countItems(s.items))
  const openCart = useCart((s) => s.open)

  return (
    <header className="relative z-40 flex w-full items-center justify-between px-4 py-6 md:px-12 md:py-8">
      <nav className="flex items-center gap-6 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/70 md:gap-10">
        <NavLink to="/catalog" className={navClass}>
          Каталог
        </NavLink>
        <Link to="/#philosophy" className="link-hover hidden transition-colors duration-300 hover:text-ink sm:inline">
          О бренде
        </Link>
      </nav>

      <Logo className="absolute left-1/2 -translate-x-1/2 text-lg text-ink sm:text-xl md:text-3xl" />

      <button
        type="button"
        onClick={openCart}
        className="link-hover text-[10px] font-medium uppercase tracking-[0.2em] text-ink/70 transition-colors duration-300 hover:text-ink"
        aria-label={`Открыть корзину, товаров: ${count}`}
      >
        Корзина ({count})
      </button>
    </header>
  )
}
