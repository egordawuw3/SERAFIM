import { Link, Navigate, useLocation } from 'react-router'
import type { OrderResult } from '@/entities/order/model/types'
import { formatPrice } from '@/shared/lib/format'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'

export function OrderSuccessPage() {
  useDocumentTitle('Заказ оформлен')
  const order = (useLocation().state as { order?: OrderResult } | null)?.order
  if (!order) return <Navigate to="/" replace />

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center font-mono">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Заказ {order.number}</p>
      <h1 className="mt-6 font-sans text-2xl font-light uppercase tracking-widest md:text-3xl">Спасибо, заказ принят</h1>
      <p className="mt-6 max-w-md text-[12px] leading-relaxed text-ink/60">
        Сумма заказа — {formatPrice(order.total)}. Мы свяжемся с вами в течение рабочего дня, чтобы подтвердить
        заказ и отправить ссылку на оплату.
      </p>
      <Link to="/catalog" className="link-hover mt-10 text-[12px] uppercase tracking-[0.15em]">
        Вернуться в каталог →
      </Link>
    </section>
  )
}
