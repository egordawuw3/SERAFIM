import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { useClickOutside } from '@/shared/lib/useClickOutside'
import { useEscape } from '@/shared/lib/useEscape'
import { ChevronDown } from './icons'

interface Props {
  label: string
  /** Количество выбранных значений — показывается рядом с названием. */
  count?: number
  children: ReactNode
  align?: 'left' | 'right'
}

export function Dropdown({ label, count = 0, children, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)
  useEscape(close, open)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[13px] transition-opacity hover:opacity-60 md:text-[14px]"
      >
        {label}
        {count > 0 && <span className="text-ink/70">· {count}</span>}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={panelId}
          className={cn(
            'absolute top-full z-30 mt-3 min-w-[220px] animate-fade-in rounded-lg border border-ink/10 bg-white p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface CheckOptionProps {
  checked: boolean
  onChange: () => void
  children: ReactNode
}

export function CheckOption({ checked, onChange, children }: CheckOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 font-mono text-[12px] transition-colors hover:bg-ink/[0.04]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-ink" />
      {children}
    </label>
  )
}
