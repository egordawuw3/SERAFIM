import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { OrderSubmitError, submitOrder } from '@/entities/order/api/orderApi'
import {
  CONTACT_METHODS,
  orderRequestSchema,
  type ContactMethod,
  type OrderRequest,
} from '@/entities/order/model/schema'
import { itemKey, subtotal } from '@/features/cart/model/cart'
import { useCart } from '@/features/cart/model/store'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'
import { Field, Input, Textarea } from '@/shared/ui/Field'

type FormValues = Omit<OrderRequest, 'items' | 'consent'>
type FieldErrors = Partial<Record<keyof FormValues | 'consent' | 'form', string>>

const initialValues: FormValues = {
  name: '',
  phone: '',
  telegram: '',
  contactMethod: 'telegram',
  city: '',
  comment: '',
}

const STEPS = [
  'Вы оставляете заявку — это бесплатно и ни к чему не обязывает.',
  'В течение дня мы связываемся с вами, уточняем размеры и доставку.',
  'Вы оплачиваете заказ по ссылке, мы отправляем его и присылаем трек-номер.',
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clear)

  const [values, setValues] = useState(initialValues)
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const total = subtotal(items)

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    const payload: OrderRequest = {
      ...values,
      // Отправится только при отмеченной галочке: без неё форма останавливается ниже, до запроса.
      consent: true,
      items: items.map(({ productId, colorId, size, qty }) => ({ productId, colorId, size, qty })),
    }
    const parsed = orderRequestSchema.safeParse(payload)
    const found: FieldErrors = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0])
        const key = (field in initialValues || field === 'consent' ? field : 'form') as keyof FieldErrors
        found[key] ??= issue.message
      }
    }
    if (!consent) found.consent = 'Нужно согласие с офертой и на обработку персональных данных'
    if (Object.keys(found).length) {
      setErrors(found)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      const order = await submitOrder(payload, honeypot)
      clearCart()
      navigate('/checkout/success', { replace: true, state: { order } })
    } catch (err) {
      const fields = err instanceof OrderSubmitError ? err.fields : {}
      const message = err instanceof Error ? err.message : 'Не удалось отправить заявку'
      setErrors({ ...fields, form: message })
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
    <section className="w-full px-4 pb-24 pt-6 md:px-12 md:pt-10">
      <h1 className="mb-10 border-b border-ink/10 pb-6 text-3xl font-light uppercase tracking-widest md:mb-14 md:text-4xl">
        Оформление заказа
      </h1>

      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-12 font-mono text-[12px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20"
      >
        <div className="max-w-2xl space-y-12">
          <ol className="space-y-2 leading-relaxed text-ink/70">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="text-ink">0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <fieldset className="space-y-5">
            <legend className="mb-5 uppercase tracking-[0.12em]">Контакты</legend>
            <Field label="Имя" error={errors.name}>
              <Input autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} />
            </Field>
            <Field label="Телефон" error={errors.phone}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 900 000-00-00"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
                invalid={!!errors.phone}
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-[11px] text-ink/70">Как удобнее связаться</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Способ связи">
                {(Object.keys(CONTACT_METHODS) as ContactMethod[]).map((m) => (
                  <label
                    key={m}
                    className={cn(
                      'flex h-11 cursor-pointer items-center justify-center rounded-lg border transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2',
                      values.contactMethod === m ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white hover:border-ink/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="contactMethod"
                      value={m}
                      className="sr-only"
                      checked={values.contactMethod === m}
                      onChange={() => set('contactMethod', m)}
                    />
                    {CONTACT_METHODS[m]}
                  </label>
                ))}
              </div>
            </div>

            <Field
              label={values.contactMethod === 'telegram' ? 'Ник в Telegram' : 'Ник в Telegram (необязательно)'}
              error={errors.telegram}
            >
              <Input placeholder="@username" autoCapitalize="off" value={values.telegram} onChange={(e) => set('telegram', e.target.value)} invalid={!!errors.telegram} />
            </Field>
            <Field label="Город (необязательно)" hint="Чтобы сразу подсказать варианты и сроки доставки" error={errors.city}>
              <Input autoComplete="address-level2" value={values.city} onChange={(e) => set('city', e.target.value)} invalid={!!errors.city} />
            </Field>
            <Field label="Комментарий (необязательно)" error={errors.comment}>
              <Textarea rows={3} value={values.comment} onChange={(e) => set('comment', e.target.value)} invalid={!!errors.comment} />
            </Field>

            {/* Ловушка для ботов: поле скрыто от людей и от скринридеров. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
          </fieldset>
        </div>

        <aside className="h-fit rounded-lg bg-white p-6 lg:sticky lg:top-24">
          <p className="mb-5 uppercase tracking-[0.12em]">Ваш заказ</p>
          <ul className="space-y-4 border-b border-ink/10 pb-5">
            {items.map((i) => (
              <li key={itemKey(i)} className="flex gap-3">
                <img src={i.image} alt="" width={56} height={70} className="h-[70px] w-14 shrink-0 bg-paper-deep object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{i.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink/70">
                    {i.colorName} · {i.size} · {i.qty} шт.
                  </p>
                </div>
                <p className="shrink-0">{formatPrice(i.price * i.qty)}</p>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-5 text-[14px]">
            <span>Итого</span>
            <span>{formatPrice(total)}</span>
          </div>
          <p className="mt-1 pb-5 text-[11px] text-ink/70">Доставку рассчитаем и согласуем с вами отдельно</p>

          <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-ink/70">
            <input
              type="checkbox"
              className="mt-0.5 accent-ink"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked)
                setErrors((er) => ({ ...er, consent: undefined }))
              }}
              aria-invalid={!!errors.consent || undefined}
            />
            <span>
              Соглашаюсь с{' '}
              <Link to="/info/offer" target="_blank" className="underline underline-offset-2 hover:text-ink">
                офертой
              </Link>{' '}
              и{' '}
              <Link to="/info/privacy" target="_blank" className="underline underline-offset-2 hover:text-ink">
                политикой обработки персональных данных
              </Link>
            </span>
          </label>
          {errors.consent && <p role="alert" className="mt-2 text-[11px] text-red-700">{errors.consent}</p>}
          {errors.form && <p role="alert" className="mt-4 text-[11px] text-red-700">{errors.form}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 h-11 w-full rounded-lg bg-ink uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </aside>
      </form>
    </section>
  )
}
