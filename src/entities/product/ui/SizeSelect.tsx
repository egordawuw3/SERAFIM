import { Select } from '@/shared/ui/Select'
import { isSizeAvailable } from '../lib/availability'
import type { Product, ProductColor, Size } from '../model/types'

interface Props {
  product: Product
  color: ProductColor
  value: Size | undefined
  onChange: (size: Size) => void
  className?: string
}

export function SizeSelect({ product, color, value, onChange, className }: Props) {
  return (
    <Select
      label="Размер"
      className={className}
      value={value ?? ''}
      onChange={(v) => onChange(v as Size)}
      options={product.sizes.map((s) => {
        const available = isSizeAvailable(color, s)
        return { value: s, label: available ? s : `${s} — нет`, disabled: !available }
      })}
    />
  )
}
