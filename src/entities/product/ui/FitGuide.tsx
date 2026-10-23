import { site } from '@/shared/config/site'
import type { Product } from '../model/types'

/*
 * «Как сидит»: кто на фото и какой размер подобрать по росту и весу. Только для одежды с размерами —
 * у рюкзака (ONE SIZE) блока нет. Данные — site.fit (от клиента), фраза про модель — только если есть фото на модели.
 */
export function FitGuide({ product }: { product: Product }) {
  if (product.sizes.length < 2) return null
  const { model, guide, note } = site.fit
  const hasModelPhoto = product.colors.some((c) => c.images.some((img) => img.view === 'model'))

  return (
    <section aria-labelledby="product-fit">
      <h2 id="product-fit" className="mb-2 font-medium uppercase tracking-[0.12em] text-ink">Как сидит</h2>
      {hasModelPhoto && (
        <p className="mb-3">
          На фото Серафим: рост {model.heightCm} см, вес {model.weightKg} кг
          {model.sizeOnPhoto && <>, размер {model.sizeOnPhoto}</>}.
        </p>
      )}
      <table className="w-full max-w-[340px] border-collapse text-left">
        <caption className="sr-only">Подбор размера по росту и весу</caption>
        <thead>
          <tr className="border-b border-ink/20 text-ink/70">
            <th scope="col" className="py-1.5 font-normal">Размер</th>
            <th scope="col" className="py-1.5 font-normal">Рост, см</th>
            <th scope="col" className="py-1.5 font-normal">Вес, кг</th>
          </tr>
        </thead>
        <tbody>
          {guide
            .filter((g) => product.sizes.some((s) => s === g.size))
            .map((g) => (
              <tr key={g.size} className="border-b border-ink/10">
                <th scope="row" className="py-1.5 font-normal text-ink">{g.size}</th>
                <td className="py-1.5 text-ink">{g.height}</td>
                <td className="py-1.5 text-ink">{g.weight}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="mt-2 text-ink/70">{note}</p>
    </section>
  )
}
