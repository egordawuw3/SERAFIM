import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Caret } from './icons'

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Option[]
  onChange: (value: string) => void
  label: string
}

/* Нативный select (удобен на телефонах и доступен) в фирменном оформлении. */
export function Select({ options, onChange, label, className, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full appearance-none rounded-md border border-ink/15 bg-white pl-2.5 pr-8 font-mono text-[12px] text-ink transition-colors hover:border-ink/40 focus:border-ink focus:outline-none"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <Caret className="pointer-events-none absolute right-2.5 top-1/2 h-1.5 w-2.5 -translate-y-1/2 text-ink" />
    </div>
  )
}
