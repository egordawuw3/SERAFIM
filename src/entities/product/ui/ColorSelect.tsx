import { Select } from '@/shared/ui/Select'
import type { Product, ProductColor } from '../model/types'

interface Props {
  product: Product
  value: ProductColor
  onChange: (colorId: string) => void
  className?: string
}

export function ColorSelect({ product, value, onChange, className }: Props) {
  return (
    <Select
      label="Цвет"
      className={className}
      value={value.id}
      onChange={onChange}
      options={product.colors.map((c) => ({ value: c.id, label: c.name }))}
    />
  )
}
