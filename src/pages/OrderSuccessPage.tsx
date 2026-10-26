import { Link, useLocation } from 'react-router'
import type { OrderResponse } from '@/entities/order/model/schema'
import { formatPrice, formatTenge } from '@/shared/lib/format'

export function OrderSuccessPage() {
  const order = (useLocation().state as { order?: OrderResponse } | null)?.order
  // Прямой заход или обновление страницы — данных заказа нет (они живут в истории браузера). Без молчаливого
  // перенаправления: объясняем, что делать.
  if (!order) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center font-mono">
        <h1 className="font-sans text-2xl font-light uppercase tracking-widest">Заказ уже оформлен</h1>
        <p className="max-w-md text-[12px] leading-relaxed text-ink/70">
          Если вы оформили заказ — трек-номер придёт по смс от СДЭК, а если понадобится что-то уточнить, мы свяжемся с вами.
        </p>
        <Link to="/#catalog" className="link-hover text-[12px] uppercase tracking-[0.15em]">
          Перейти в каталог →
        </Link>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center font-mono">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Заказ {order.number}</p>
      <h1 className="mt-6 font-sans text-2xl font-light uppercase tracking-widest md:text-3xl">
        {order.cdekCreated ? 'Заказ оформлен' : 'Заказ принят'}
      </h1>
      <p className="mt-6 max-w-md text-[12px] leading-relaxed text-ink/70">
        {order.payment?.method === 'prepay' ? (
          <>
            Продавец напишет вам в Telegram с реквизитами для оплаты: {formatPrice(order.payment.amount)}. Посылку отправим после
            оплаты, трек-номер придёт по смс от СДЭК.
          </>
        ) : (
          <>
            {order.cdekCreated
              ? 'Трек-номер придёт по смс от СДЭК, когда посылку передадут в доставку.'
              : 'Мы свяжемся с вами, чтобы подтвердить доставку.'}{' '}
            Оплата при получении в пункте СДЭК:{' '}
            {order.payment?.currency === 'KZT' ? formatTenge(order.payment.amount) : formatPrice(order.payOnPickup)}.
          </>
        )}
      </p>
      <Link to="/#catalog" className="link-hover mt-10 text-[12px] uppercase tracking-[0.15em]">
        Вернуться в каталог →
      </Link>
    </section>
  )
}
