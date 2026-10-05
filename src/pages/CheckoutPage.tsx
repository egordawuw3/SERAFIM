import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { submitOrder } from '@/entities/order/api/orderApi'
import { deliveryCost, deliveryOptions } from '@/entities/order/model/delivery'
import { subtotal as calcSubtotal } from '@/features/cart/model/cart'
import { useCart } from '@/features/cart/model/store'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'
import { useDocumentTitle } from '@/shared/lib/useDocumentTitle'

interface FormState {
  name: string
  phone: string
  email: string
  telegram: string
  deliveryId: string
  address: string
  comment: string
  consent: boolean
}

type Errors = Partial<Record<keyof FormState, string>>

const initial: FormState = {
  name: '',
  phone: '',
  email: '',
  telegram: '',
  deliveryId: deliveryOptions[0].id,
  address: '',
  comment: '',
  consent: false,
}

function validate(f: FormState): Errors {
  const e: Errors = {}
  if (f.name.trim().length < 2) e.name = 'Укажите имя и фамилию'
  if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Укажите номер телефона'
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Укажите корректный e-mail'
  const delivery = deliveryOptions.find((d) => d.id === f.deliveryId)
  if (delivery?.needsAddress && f.address.trim().length < 5) e.address = 'Укажите адрес доставки'
  if (!f.consent) e.consent = 'Нужно согласие на обработку персональных данных'
  return e
}

export function CheckoutPage() {
  useDocumentTitle('Оформление заказа')
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const clear = useCart((s) => s.clear)
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const delivery = deliveryOptions.find((d) => d.id === form.deliveryId) ?? deliveryOptions[0]
  const subtotal = calcSubtotal(items)
  const shipping = deliveryCost(delivery, subtotal)
  const total = subtotal + shipping

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const order = await submitOrder({
        customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), telegram: form.telegram.trim() || undefined },
        deliveryId: form.deliveryId,
        address: form.address.trim(),
        comment: form.comment.trim() || undefined,
        items: items.map((i) => ({ productId: i.productId, colorId: i.colorId, size: i.size, qty: i.qty })),
      })
      clear()
      navigate('/checkout/success', { replace: true, state: { order } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось оформить заказ. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center font-mono">
        <h1 className="font-sans text-2xl font-light uppercase tracking-widest">Корзина пуста</h1>
        <Link to="/catalog" className="link-hover text-[12px] uppercase tracking-[0.15em]">
          Перейти в каталог →
        </Link>
      </section>
    )
  }

  return (
    <section className="w-full px-4 pb-24 pt-8 md:px-12 md:pt-12">
      <h1 className="mb-10 border-b border-ink/10 pb-6 text-3xl font-light uppercase tracking-widest md:mb-14 md:text-4xl">
        Оформление заказа
      </h1>

      <form onSubmit={onSubmit} noValidate className="grid gap-12 font-mono text-[12px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
        <div className="space-y-12">
          <Fieldset title="Покупатель">
            <Field label="Имя и фамилия" error={errors.name}>
              <Input autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Телефон" error={errors.phone}>
                <Input type="tel" autoComplete="tel" placeholder="+7" value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} />
              </Field>
              <Field label="E-mail" error={errors.email}>
                <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} />
              </Field>
            </div>
            <Field label="Telegram (необязательно)" hint="Чтобы мы могли быстро связаться по заказу">
              <Input placeholder="@username" value={form.telegram} onChange={(e) => set('telegram', e.target.value)} />
            </Field>
          </Fieldset>

          <Fieldset title="Доставка">
            <div className="space-y-2" role="radiogroup" aria-label="Способ доставки">
              {deliveryOptions.map((d) => {
                const cost = deliveryCost(d, subtotal)
                const checked = d.id === form.deliveryId
                return (
                  <label
                    key={d.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3.5 transition-colors',
                      checked ? 'border-ink' : 'border-ink/15 hover:border-ink/40',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="delivery" className="accent-ink" checked={checked} onChange={() => set('deliveryId', d.id)} />
                      <span>
                        {d.name}
                        <span className="block text-[11px] text-ink/45">{d.term}</span>
                      </span>
                    </span>
                    <span className="shrink-0">{cost === 0 ? 'Бесплатно' : formatPrice(cost)}</span>
                  </label>
                )
              })}
            </div>
            {delivery.needsAddress && (
              <Field label="Адрес" hint={delivery.addressHint} error={errors.address}>
                <Input autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} invalid={!!errors.address} />
              </Field>
            )}
            <Field label="Комментарий к заказу (необязательно)">
              <textarea
                rows={3}
                value={form.comment}
                onChange={(e) => set('comment', e.target.value)}
                className="w-full resize-y rounded-lg border border-ink/15 bg-white px-3 py-2.5 focus:border-ink focus:outline-none"
              />
            </Field>
          </Fieldset>

          <Fieldset title="Оплата">
            <p className="leading-relaxed text-ink/60">
              После оформления мы свяжемся с вами, чтобы подтвердить заказ, и пришлём ссылку на оплату картой или через СБП.
            </p>
          </Fieldset>
        </div>

        <aside className="h-fit rounded-lg bg-white p-6 lg:sticky lg:top-8">
          <p className="mb-5 uppercase tracking-[0.12em]">Ваш заказ</p>
          <ul className="space-y-4 border-b border-ink/10 pb-5">
            {items.map((i) => (
              <li key={`${i.productId}:${i.colorId}:${i.size}`} className="flex gap-3">
                <img src={i.image} alt="" className="h-[70px] w-14 shrink-0 bg-paper-deep object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{i.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink/50">
                    {i.colorName} · {i.size} · {i.qty} шт.
                  </p>
                </div>
                <p className="shrink-0">{formatPrice(i.price * i.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-b border-ink/10 py-5">
            <div className="flex justify-between">
              <dt className="text-ink/60">Товары</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/60">Доставка</dt>
              <dd>{shipping === 0 ? 'Бесплатно' : formatPrice(shipping)}</dd>
            </div>
          </dl>
          <div className="flex justify-between py-5 text-[14px]">
            <span>Итого</span>
            <span>{formatPrice(total)}</span>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-ink/60">
            <input
              type="checkbox"
              className="mt-0.5 accent-ink"
              checked={form.consent}
              onChange={(e) => set('consent', e.target.checked)}
              aria-invalid={!!errors.consent}
            />
            <span>
              Я соглашаюсь с{' '}
              <Link to="/info/documents" target="_blank" className="underline underline-offset-2 hover:text-ink">
                офертой и политикой обработки персональных данных
              </Link>
            </span>
          </label>
          {errors.consent && <p className="mt-2 text-[11px] text-red-700">{errors.consent}</p>}

          {submitError && <p className="mt-4 text-[11px] text-red-700">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 h-11 w-full rounded-lg bg-ink uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? 'Оформляем…' : 'Оформить заказ'}
          </button>
        </aside>
      </form>
    </section>
  )
}

function Fieldset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 uppercase tracking-[0.12em]">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-ink/60">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11px] text-red-700">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-[11px] text-ink/40">{hint}</span>
      )}
    </label>
  )
}

function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded-lg border bg-white px-3 focus:outline-none',
        invalid ? 'border-red-700' : 'border-ink/15 focus:border-ink',
        className,
      )}
      {...rest}
    />
  )
}
