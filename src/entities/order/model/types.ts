export interface OrderCustomer {
  name: string
  phone: string
  email: string
  telegram?: string
}

export interface OrderItemInput {
  productId: string
  colorId: string
  size: string
  qty: number
}

export interface OrderInput {
  customer: OrderCustomer
  deliveryId: string
  address: string
  comment?: string
  items: OrderItemInput[]
}

export interface OrderResult {
  number: string
  total: number
}
