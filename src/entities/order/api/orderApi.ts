import type { ApiError, OrderRequest, OrderResponse } from '../model/schema'

export class OrderSubmitError extends Error {
  readonly fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'OrderSubmitError'
    this.fields = fields
  }
}

/** Honeypot-поле передаётся отдельно, чтобы оно не попало в схему заявки. */
export async function submitOrder(order: OrderRequest, honeypot = ''): Promise<OrderResponse> {
  let res: Response
  try {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...order, website: honeypot }),
    })
  } catch {
    throw new OrderSubmitError('Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.')
  }

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>
    throw new OrderSubmitError(err.error ?? 'Не удалось отправить заявку. Попробуйте ещё раз.', err.fields)
  }
  return data as OrderResponse
}
