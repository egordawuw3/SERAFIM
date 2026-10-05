import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-ink/60">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[11px] text-red-700">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-[11px] text-ink/40">{hint}</span>
      )}
    </label>
  )
}

const control = (invalid?: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 transition-colors placeholder:text-ink/30 focus:outline-none',
    invalid ? 'border-red-700' : 'border-ink/15 hover:border-ink/30 focus:border-ink',
  )

type InputProps = ComponentProps<'input'> & { invalid?: boolean }

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn(control(invalid), 'h-11', className)} {...rest} />
}

type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean }

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return <textarea aria-invalid={invalid || undefined} className={cn(control(invalid), 'resize-y py-2.5', className)} {...rest} />
}
