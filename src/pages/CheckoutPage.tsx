import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  DeliveryUnavailableError,
  fetchCities,
  fetchPoints,
  fetchQuote,
  type City,
  type DeliveryQuote,
  type PickupPoint,
} from '@/entities/order/api/deliveryApi'
import { OrderSubmitError, submitOrder } from '@/entities/order/api/orderApi'
import { MAX_ITEM_QTY } from '@/entities/order/model/limits'
import { orderTotals } from '@/entities/order/model/pricing'
import { MANUAL_POINT, orderRequestSchema, type OrderRequest } from '@/entities/order/model/schema'
import { getProductBySlug } from '@/entities/product/api/productApi'
import { findColor, isSizeAvailable } from '@/entities/product/lib/availability'
import type { Size } from '@/entities/product/model/types'
import { ProductPhoto } from '@/entities/product/ui/ProductPhoto'
import { SizePicker } from '@/entities/product/ui/SizePicker'
import { site } from '@/shared/config/site'
import { cn } from '@/shared/lib/cn'
import { formatPrice } from '@/shared/lib/format'
import { formatPhoneInput } from '@/shared/lib/phone'
import { useIsClient } from '@/shared/lib/useIsClient'
import { Field, Input, Textarea } from '@/shared/ui/Field'

const PickupPointMap = lazy(() => import('@/widgets/PickupPointMap'))

type FieldKey =
  | 'size'
  | 'cityCode'
  | 'pointCode'
  | 'deliveryNote'
  | 'name'
  | 'phone'
  | 'telegram'
  | 'comment'
  | 'offerAccepted'
  | 'consent'
  | 'form'
type FieldErrors = Partial<Record<FieldKey, string>>

const linkCls = 'underline underline-offset-2 hover:text-ink'

/*
 * Оформление заказа: один товар (размер из карточки или из ссылки /p/<id>?size=M&order=1), доставка СДЭК до пункта
 * выдачи, оплата при получении. Город и пункт — из API СДЭК через наш сервер (ключи только там). Если СДЭК не отвечает,
 * форма переходит в ручной режим: покупатель пишет город и пункт сам, заказ уходит продавцу и не теряется.
 */
export function CheckoutPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Параметры адреса читаем после гидратации: готовый HTML страницы собран без них.
  const isClient = useIsClient()
  const product = isClient ? getProductBySlug(params.get('product') ?? '') : undefined
  const color = product ? findColor(product, params.get('color')) : undefined

  const initialSize = (() => {
    if (!product || !color) return undefined
    if (product.sizes.length === 1) return isSizeAvailable(color, product.sizes[0]) ? product.sizes[0] : undefined
    const s = params.get('size')?.toUpperCase() as Size | undefined
    return s && product.sizes.includes(s) && isSizeAvailable(color, s) ? s : undefined
  })()

  const [size, setSize] = useState<Size | undefined>()
  const [sizeTouched, setSizeTouched] = useState(false)
  const effectiveSize = sizeTouched ? size : initialSize
  const [qty, setQty] = useState(1)

  const [city, setCity] = useState<City | null>(null)
  // Ответы привязаны к запросу (город, количество): пока ключ не совпал с текущим — идёт загрузка.
  const [pointsFor, setPointsFor] = useState<{ city: number; points: PickupPoint[] } | null>(null)
  const [pointCode, setPointCode] = useState<string | null>(null)
  const [quoteFor, setQuoteFor] = useState<{ key: string; quote: DeliveryQuote | null } | null>(null)
  // СДЭК не ответил — покупатель описывает пункт сам.
  const [manual, setManual] = useState(false)
  const [deliveryNote, setDeliveryNote] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [comment, setComment] = useState('')
  const [offerAccepted, setOfferAccepted] = useState(false)
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const clearError = (key: FieldKey) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))

  // Пункты выдачи города.
  useEffect(() => {
    if (!city) return
    const ctrl = new AbortController()
    fetchPoints(city.code, ctrl.signal)
      .then((points) => setPointsFor({ city: city.code, points }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        if (err instanceof DeliveryUnavailableError) setManual(true)
        else setPointsFor({ city: city.code, points: [] })
      })
    return () => ctrl.abort()
  }, [city])

  // Доставка: зависит от города и количества (вес посылки).
  const productId = product?.id
  const quoteKey = city && productId ? `${productId}:${city.code}:${qty}` : null
  useEffect(() => {
    if (!city || !productId || !quoteKey) return
    const ctrl = new AbortController()
    fetchQuote(productId, qty, city.code, ctrl.signal)
      .then((d) => setQuoteFor({ key: quoteKey, quote: d.quote }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setQuoteFor({ key: quoteKey, quote: null })
      })
    return () => ctrl.abort()
  }, [city, qty, productId, quoteKey])

  const points = city && pointsFor?.city === city.code ? pointsFor.points : null
  const quoteLoading = quoteKey !== null && quoteFor?.key !== quoteKey
  const quote = !quoteLoading && quoteFor ? quoteFor.quote : null

  if (isClient && (!product || !color)) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center font-mono">
        <h1 className="font-sans text-2xl font-light uppercase tracking-widest">Выберите вещь</h1>
        <p className="max-w-md text-[12px] text-ink/70">Откройте карточку товара, выберите размер и нажмите «Оформить заказ».</p>
        <Link to="/#catalog" className="link-hover text-[12px] uppercase tracking-[0.15em]">
          Перейти в каталог →
        </Link>
      </section>
    )
  }
  if (!product || !color) return <section className="flex-1" />

  const totals = orderTotals(product.price, qty, quote?.sum ?? 0, site.shipping.prepaymentAmount)
  const selectedPoint = points?.find((p) => p.code === pointCode) ?? null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !product || !color) return

    const payload: OrderRequest = {
      productId: product.id,
      colorId: color.id,
      size: effectiveSize ?? '',
      qty,
      cityCode: manual ? 0 : (city?.code ?? 0),
      pointCode: manual ? MANUAL_POINT : (pointCode ?? ''),
      deliveryNote: manual ? deliveryNote : '',
      name,
      phone,
      telegram,
      comment,
      // Отправится только при отмеченных галочках: без них форма останавливается ниже, до запроса.
      offerAccepted: true,
      consent: true,
    }
    const found: FieldErrors = {}
    const parsed = orderRequestSchema.safeParse(payload)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as FieldKey
        found[key in FIELD_ORDER ? key : 'form'] ??= issue.message
      }
    }
    if (!manual && !city) found.cityCode = 'Выберите город'
    if (!manual && city && !pointCode) found.pointCode = 'Выберите пункт выдачи'
    if (!offerAccepted) found.offerAccepted = 'Нужно принять условия оферты'
    if (!consent) found.consent = 'Нужно согласие на обработку персональных данных'
    if (Object.keys(found).length) {
      setErrors(found)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting(true)
    setErrors({})
    try {
      const order = await submitOrder(payload, honeypot)
      navigate('/checkout/success', { replace: true, state: { order } })
    } catch (err) {
      const fields = err instanceof OrderSubmitError ? err.fields : {}
      const message = err instanceof Error ? err.message : 'Не удалось оформить заказ'
      setErrors({ ...fields, form: message })
    } finally {
      setSubmitting(false)
    }
  }

  const front = color.images[0]

  return (
    <section className="w-full px-4 pb-24 pt-6 md:px-12 md:pt-10">
      <h1 className="mb-8 border-b border-ink/10 pb-6 text-3xl font-light uppercase tracking-widest md:mb-12 md:text-4xl">
        Оформление заказа
      </h1>

      <form onSubmit={onSubmit} noValidate className="grid gap-12 font-mono text-[12px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
        <div className="max-w-2xl space-y-12">
          {/* Товар */}
          <fieldset className="space-y-5">
            <legend className="mb-5 uppercase tracking-[0.12em]">Товар</legend>
            <div className="flex gap-4">
              <div className="h-[100px] w-20 shrink-0 overflow-hidden bg-paper-deep">
                <ProductPhoto image={front} alt="" sizes="80px" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[18px] font-light leading-snug text-ink">{product.name}</p>
                <p className="mt-1 text-ink/70">{color.name}</p>
                <p className="mt-1 text-ink">{formatPrice(product.price)}</p>
              </div>
            </div>
            {product.sizes.length > 1 ? (
              <div>
                <SizePicker
                  product={product}
                  color={color}
                  value={effectiveSize}
                  onChange={(s) => {
                    setSize(s)
                    setSizeTouched(true)
                    clearError('size')
                  }}
                />
                {errors.size && <p role="alert" className="mt-1.5 text-[11px] text-red-700">{errors.size}</p>}
              </div>
            ) : (
              <p>
                <span className="text-ink/70">Размер: </span>единый
              </p>
            )}
            <QtyStepper value={qty} onChange={setQty} />
          </fieldset>

          {/* Доставка */}
          <fieldset className="space-y-5">
            <legend className="mb-5 uppercase tracking-[0.12em]">Доставка СДЭК до пункта выдачи</legend>
            {manual ? (
              <Field
                label="Город и адрес удобного пункта СДЭК"
                hint="Сервис СДЭК сейчас не ответил — напишите, куда доставить, мы оформим доставку сами и сообщим стоимость"
                error={errors.deliveryNote}
              >
                <Input
                  value={deliveryNote}
                  onChange={(e) => {
                    setDeliveryNote(e.target.value)
                    clearError('deliveryNote')
                  }}
                  invalid={!!errors.deliveryNote}
                />
              </Field>
            ) : (
              <>
                <CityField
                  value={city}
                  error={errors.cityCode}
                  onUnavailable={() => setManual(true)}
                  onChange={(c) => {
                    setCity(c)
                    setPointCode(null)
                    clearError('cityCode')
                  }}
                />
                {city && (
                  <PointPicker
                    points={points}
                    selected={pointCode}
                    error={errors.pointCode}
                    onSelect={(code) => {
                      setPointCode(code)
                      clearError('pointCode')
                    }}
                  />
                )}
                {city && (
                  <p className="text-ink/85" aria-live="polite">
                    {quoteLoading
                      ? 'Считаем доставку…'
                      : quote
                        ? `Доставка: ${formatPrice(quote.sum)}, ${periodText(quote)}`
                        : 'Стоимость доставки уточним после оформления'}
                  </p>
                )}
              </>
            )}
          </fieldset>

          {/* Получатель */}
          <fieldset className="space-y-5">
            <legend className="mb-5 uppercase tracking-[0.12em]">Получатель</legend>
            <Field label="Имя и фамилия" hint="Как в паспорте — СДЭК выдаёт посылку по документу" error={errors.name}>
              <Input
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearError('name')
                }}
                invalid={!!errors.name}
              />
            </Field>
            <Field label="Телефон" hint="На него придёт смс от СДЭК с трек-номером" error={errors.phone}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (900) 000-00-00"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhoneInput(e.target.value))
                  clearError('phone')
                }}
                invalid={!!errors.phone}
              />
            </Field>
            <Field label="Ник в Telegram (необязательно)" error={errors.telegram}>
              <Input
                placeholder="@username"
                autoCapitalize="off"
                value={telegram}
                onChange={(e) => {
                  setTelegram(e.target.value)
                  clearError('telegram')
                }}
                invalid={!!errors.telegram}
              />
            </Field>
            <Field label="Комментарий (необязательно)" error={errors.comment}>
              <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} invalid={!!errors.comment} />
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
          <dl className="space-y-2 border-b border-ink/10 pb-5">
            <Row label={`${product.name}${effectiveSize ? `, ${effectiveSize}` : ''} × ${qty}`} value={formatPrice(totals.goods)} />
            <Row label="Доставка СДЭК" value={quote ? formatPrice(quote.sum) : '—'} />
            {selectedPoint && <p className="text-[11px] leading-relaxed text-ink/70">Пункт: {selectedPoint.address}</p>}
          </dl>
          <div className="flex justify-between pt-5 text-[14px]">
            <span>Итого</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
          <p className="mt-2 pb-5 text-[11px] leading-relaxed text-ink/70">
            {totals.prepayment
              ? `Предоплата ${formatPrice(totals.prepayment)}, остальное — ${formatPrice(totals.payOnPickup)} при получении в пункте СДЭК.`
              : 'Оплата при получении в пункте СДЭК: товар и доставка. Можно осмотреть вещь до оплаты.'}
            {!quote && ' Доставка добавится после выбора города.'}
          </p>

          {/*
           * Согласие на обработку персональных данных — отдельной галочкой со ссылкой на отдельный документ:
           * с 01.09.2025 его нельзя совмещать с офертой или политикой в одном чекбоксе (156-ФЗ).
           */}
          <div className="space-y-3">
            <Consent
              checked={offerAccepted}
              error={errors.offerAccepted}
              onChange={(v) => {
                setOfferAccepted(v)
                clearError('offerAccepted')
              }}
            >
              Принимаю условия{' '}
              <Link to="/info/offer" target="_blank" className={linkCls}>
                публичной оферты
              </Link>
            </Consent>
            <Consent
              checked={consent}
              error={errors.consent}
              onChange={(v) => {
                setConsent(v)
                clearError('consent')
              }}
            >
              Даю{' '}
              <Link to="/info/consent" target="_blank" className={linkCls}>
                согласие на обработку персональных данных
              </Link>{' '}
              в соответствии с{' '}
              <Link to="/info/privacy" target="_blank" className={linkCls}>
                политикой конфиденциальности
              </Link>
            </Consent>
          </div>
          {errors.form && <p role="alert" className="mt-4 text-[11px] text-red-700">{errors.form}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 h-12 w-full rounded-lg bg-ink uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? 'Оформляем…' : 'Подтвердить заказ'}
          </button>
        </aside>
      </form>
    </section>
  )
}

/** Поля, ошибки которых показываются у самих полей (остальные — общей ошибкой формы). */
const FIELD_ORDER: Record<string, true> = {
  size: true,
  cityCode: true,
  pointCode: true,
  deliveryNote: true,
  name: true,
  phone: true,
  telegram: true,
  comment: true,
  offerAccepted: true,
  consent: true,
}

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней')

function periodText(q: DeliveryQuote): string {
  if (!q.periodMax) return 'срок уточним'
  return q.periodMin && q.periodMin !== q.periodMax
    ? `${q.periodMin}–${q.periodMax} ${plural(q.periodMax)}`
    : `${q.periodMax} ${plural(q.periodMax)}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/85">{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  )
}

function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = 'flex h-11 w-11 items-center justify-center rounded-lg border border-ink/15 bg-white transition-colors hover:border-ink/40 disabled:opacity-40'
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink/70">Количество</span>
      <button type="button" className={btn} aria-label="Меньше" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="w-6 text-center" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Больше" disabled={value >= MAX_ITEM_QTY} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

/*
 * Город с подсказками СДЭК: поле-комбобокс (ARIA combobox + listbox), стрелки и Enter работают с клавиатуры.
 */
function CityField({
  value,
  error,
  onChange,
  onUnavailable,
}: {
  value: City | null
  error?: string
  onChange: (c: City) => void
  onUnavailable: () => void
}) {
  const id = useId()
  const [query, setQuery] = useState(value?.name ?? '')
  const [options, setOptions] = useState<City[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const onUnavailableRef = useRef(onUnavailable)
  useEffect(() => {
    onUnavailableRef.current = onUnavailable
  })

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || q === value?.name) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetchCities(q, ctrl.signal)
        .then((list) => {
          setOptions(list)
          setActive(0)
          setOpen(true)
        })
        .catch((err: Error) => {
          if (err instanceof DeliveryUnavailableError) onUnavailableRef.current()
        })
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, value])

  const pick = (c: City) => {
    onChange(c)
    setQuery(c.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Field label="Город" error={error}>
        <Input
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Начните вводить: Москва, Казань…"
          value={query}
          invalid={!!error}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => options.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !options.length) return
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, options.length - 1))
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            else if (e.key === 'Enter') pick(options[active])
            else if (e.key === 'Escape') setOpen(false)
            else return
            e.preventDefault()
          }}
        />
      </Field>
      {open && options.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink/15 bg-white py-1 shadow-sm">
          {options.map((c, i) => (
            <li
              key={c.code}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              className={cn('cursor-pointer px-3 py-2 leading-snug', i === active && 'bg-paper')}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Пункты выдачи: карта (подсказка) + список с поиском (основной выбор, работает с клавиатуры). */
function PointPicker({
  points,
  selected,
  error,
  onSelect,
}: {
  points: PickupPoint[] | null
  selected: string | null
  error?: string
  onSelect: (code: string) => void
}) {
  const name = useId()
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (points ?? []).filter((p) => !q || `${p.address} ${p.name}`.toLowerCase().includes(q))
  }, [points, search])

  const select = (code: string) => {
    onSelect(code)
    listRef.current?.querySelector(`[data-code="${CSS.escape(code)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  if (points === null) return <p className="text-ink/70">Загружаем пункты выдачи…</p>
  if (points.length === 0) return <p className="text-ink/70">В этом городе нет пунктов СДЭК с оплатой при получении. Выберите соседний город.</p>

  return (
    <div className="space-y-3">
      <Suspense fallback={<div className="h-64 w-full rounded-lg bg-paper-deep md:h-80" />}>
        <PickupPointMap points={points} selected={selected} onSelect={select} />
      </Suspense>
      <Field label={`Пункт выдачи · ${points.length}`} error={error}>
        <Input placeholder="Поиск по адресу" value={search} onChange={(e) => setSearch(e.target.value)} invalid={!!error} />
      </Field>
      <div ref={listRef} role="radiogroup" aria-label="Пункты выдачи" className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {filtered.map((p) => (
          <label
            key={p.code}
            data-code={p.code}
            className={cn(
              'block cursor-pointer rounded-lg border bg-white px-3 py-2.5 leading-snug transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2',
              selected === p.code ? 'border-ink' : 'border-ink/15 hover:border-ink/40',
            )}
          >
            <input type="radio" name={name} value={p.code} checked={selected === p.code} onChange={() => select(p.code)} className="sr-only" />
            <span className="block text-ink">{p.address}</span>
            {p.workTime && <span className="mt-0.5 block text-[11px] text-ink/70">{p.workTime}</span>}
          </label>
        ))}
        {filtered.length === 0 && <p className="text-ink/70">Ничего не нашлось — измените запрос.</p>}
      </div>
    </div>
  )
}

function Consent({
  checked,
  error,
  onChange,
  children,
}: {
  checked: boolean
  error?: string
  onChange: (value: boolean) => void
  children: ReactNode
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-ink/70">
        <input
          type="checkbox"
          className="mt-0.5 accent-ink"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error || undefined}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
