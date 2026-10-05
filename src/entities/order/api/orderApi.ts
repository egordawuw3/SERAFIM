import { getProductById } from '@/entities/product/api/productApi'
import { deliveryCost, deliveryOptions } from '../model/delivery'
import type { OrderInput, OrderResult } from '../model/types'

/*
 * ВРЕМЕННАЯ реализация: заказ никуда не отправляется.
 * На этапе бэкенда здесь будет POST /api/orders, который проверит цены
 * и остатки на сервере и вернёт номер заказа / ссылку на оплату.
 */
export async function submitOrder(input: OrderInput): Promise<OrderResult> {
  await new Promise((r) => setTimeout(r, 700))

  const subtotal = input.items.reduce((sum, item) => {
    const product = getProductById(item.productId)
    if (!product) throw new Error('Товар больше недоступен')
    return sum + product.price * item.qty
  }, 0)

  const delivery = deliveryOptions.find((d) => d.id === input.deliveryId)
  if (!delivery) throw new Error('Выберите способ доставки')

  const number = `SRF-${Date.now().toString().slice(-6)}`
  return { number, total: subtotal + deliveryCost(delivery, subtotal) }
}
