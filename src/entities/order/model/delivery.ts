export interface DeliveryOption {
  id: string
  name: string
  price: number
  /** Сумма заказа, от которой доставка бесплатна. */
  freeFrom?: number
  term: string
  needsAddress: boolean
  addressHint?: string
}

export const deliveryOptions: DeliveryOption[] = [
  {
    id: 'cdek-pvz',
    name: 'СДЭК — пункт выдачи',
    price: 450,
    freeFrom: 15000,
    term: '2–6 дней',
    needsAddress: true,
    addressHint: 'Город и адрес пункта выдачи СДЭК',
  },
  {
    id: 'cdek-courier',
    name: 'СДЭК — курьер',
    price: 750,
    term: '2–6 дней',
    needsAddress: true,
    addressHint: 'Город, улица, дом, квартира',
  },
  {
    id: 'post',
    name: 'Почта России',
    price: 400,
    freeFrom: 15000,
    term: '5–14 дней',
    needsAddress: true,
    addressHint: 'Индекс, город, улица, дом, квартира',
  },
]

export function deliveryCost(option: DeliveryOption, subtotal: number): number {
  if (option.freeFrom !== undefined && subtotal >= option.freeFrom) return 0
  return option.price
}
