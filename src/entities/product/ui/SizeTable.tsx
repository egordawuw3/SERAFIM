import type { Measurement } from '../model/types'

/*
 * Размерная сетка таблицей, а не картинкой: читается скринридером, индексируется поиском,
 * не мылится на ретине и меняется правкой цифр в каталоге.
 */
export function SizeTable({ measurements, caption }: { measurements: Measurement[]; caption: string }) {
  return (
    <table className="w-full max-w-[340px] border-collapse text-left">
      <caption className="mb-2 text-left font-medium uppercase tracking-[0.12em] text-ink">{caption}</caption>
      <thead>
        <tr className="border-b border-ink/20 text-ink/70">
          <th scope="col" className="py-1.5 font-normal">Размер</th>
          <th scope="col" className="py-1.5 font-normal">Длина, см</th>
          <th scope="col" className="py-1.5 font-normal">Ширина, см</th>
        </tr>
      </thead>
      <tbody>
        {measurements.map((m) => (
          <tr key={m.size} className="border-b border-ink/10">
            <th scope="row" className="py-1.5 font-normal text-ink">{m.size}</th>
            <td className="py-1.5 text-ink">{m.length}</td>
            <td className="py-1.5 text-ink">{m.width}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
