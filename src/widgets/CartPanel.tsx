import { useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { countItems, itemKey, MAX_QTY, subtotal } from '@/features/cart/model/cart'
import { useCart } from '@/features/cart/model/store'
import { formatPrice, plural } from '@/shared/lib/format'
import { useEscape } from '@/shared/lib/useEscape'
import { useFocusTrap } from '@/shared/lib/useFocusTrap'
import { useLockBodyScroll } from '@/shared/lib/useLockBodyScroll'
import { Close } from '@/shared/ui/icons'

export function CartPanel() {
  const { items, close, setQty, remove } = useCart()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const onClose = useCallback(() => close(), [close])
  useEscape(onClose)
  useLockBodyScroll()
  useFocusTrap(ref)

  const count = countItems(items)

  return (
    <div ref={ref} className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Корзина">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[440px] animate-drawer-in flex-col bg-white font-mono text-[12px] text-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <p className="uppercase tracking-[0.12em]">
            Корзина {count > 0 && <span className="text-ink/70">· {count} {plural(count, ['товар', 'товара', 'товаров'])}</span>}
          </p>
          <button type="button" onClick={onClose} aria-label="Закрыть корзину" className="-m-2 p-2 hover:opacity-60">
            <Close className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="text-ink/70">В корзине пока пусто</p>
            <Link
              to="/catalog"
              onClick={onClose}
              className="rounded-lg border border-ink px-4 py-2 uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-6">
              {items.map((item) => {
                const key = itemKey(item)
                return (
                  <li key={key} className="flex gap-4 py-5">
                    <Link to={`/product/${item.slug}`} onClick={onClose} className="h-[100px] w-20 shrink-0 bg-paper-deep">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <Link to={`/product/${item.slug}`} onClick={onClose} className="leading-snug hover:opacity-60">
                          {item.name}
                        </Link>
                        <p className="shrink-0">{formatPrice(item.price * item.qty)}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-ink/70">
                        {item.colorName} · {item.size}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-md border border-ink/15">
                          <button type="button" aria-label="Уменьшить количество" className="h-7 w-7 hover:bg-ink/5" onClick={() => setQty(key, item.qty - 1)}>
                            −
                          </button>
                          <span className="w-6 text-center" aria-live="polite">{item.qty}</span>
                          <button
                            type="button"
                            aria-label="Увеличить количество"
                            className="h-7 w-7 hover:bg-ink/5 disabled:opacity-30"
                            disabled={item.qty >= MAX_QTY}
                            onClick={() => setQty(key, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button type="button" onClick={() => remove(key)} className="text-[11px] text-ink/70 underline-offset-4 hover:text-ink hover:underline">
                          Удалить
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-ink/10 px-6 py-6">
              <div className="flex justify-between text-[13px]">
                <span>Итого</span>
                <span>{formatPrice(subtotal(items))}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink/70">Стоимость доставки рассчитается при оформлении</p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/checkout')
                }}
                className="mt-5 h-11 w-full rounded-lg bg-ink uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85"
              >
                Оформить заказ
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
