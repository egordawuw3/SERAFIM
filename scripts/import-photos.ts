/*
 * Импорт фото товаров: photos/<slug>/<цвет>-front.(png|jpg|webp) и -back → public/products/<slug>/<цвет>-front.webp.
 *
 * Фото можно класть прямо с телефона: фон вырезается локальной нейросетью (бесплатно, без интернета —
 * модель скачивается один раз при установке пакета), вещь ставится по центру на белый фон 4:5 (1600×2000)
 * с мягкой тенью. Сам товар и принт не перерисовываются — только вырезаются.
 *
 * Запуск: npm run photos            — обработать новые и изменённые фото
 *         npm run photos -- --all   — переобработать всё
 *         npm run photos -- --keep-bg — не вырезать фон (если фото уже готовые, на белом)
 */
import { removeBackground } from '@imgly/background-removal-node'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { products } from '../src/entities/product/model/catalog.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IN = join(ROOT, 'photos')
const OUT = join(ROOT, 'public', 'products')
const MANIFEST = join(ROOT, 'src', 'entities', 'product', 'model', 'photos.generated.ts')
const W = 1600
const H = 2000
/** Какую долю кадра может занять вещь — остальное поля. */
const FILL = { w: 0.84, h: 0.86 }
const VIEWS = ['front', 'back'] as const
const INPUT_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const FILE = /^([a-z0-9-]+)-(front|back)$/

// sharp объявлен через `export =`: его типы берём из самой функции.
type Image = ReturnType<typeof sharp>
type Overlay = NonNullable<Parameters<Image['composite']>[0]>[number]

const args = new Set(process.argv.slice(2))
const reprocessAll = args.has('--all')
const keepBackground = args.has('--keep-bg')

/** Вырезает вещь: RGBA с прозрачным фоном. Полупрозрачные «призраки» фона убираются, края остаются мягкими. */
async function cutout(file: string): Promise<Image> {
  // Поворот по EXIF делаем до нейросети, иначе фото с телефона может оказаться боком.
  const upright = await sharp(file).rotate().png().toBuffer()
  const blob = await removeBackground(new Blob([new Uint8Array(upright)], { type: MIME['.png'] }), {
    model: 'medium',
    output: { format: 'image/png' },
  })
  const { data, info } = await sharp(Buffer.from(await blob.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const LOW = 0.3 * 255
  const HIGH = 0.85 * 255
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]
    data[i] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255)
  }
  return sharp(data, { raw: info })
}

async function render(file: string): Promise<Image> {
  const source = keepBackground ? sharp(file).rotate().flatten({ background: '#ffffff' }) : await cutout(file)
  // Обрезаем пустые поля, затем вписываем вещь в кадр с одинаковыми отступами.
  const garment = await source
    .png()
    .toBuffer()
    .then((b) => sharp(b).trim({ background: keepBackground ? '#ffffff' : { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }))
    .then((s) => s.resize(Math.round(W * FILL.w), Math.round(H * FILL.h), { fit: 'inside' }).png().toBuffer({ resolveWithObject: true }))
  const { width, height } = garment.info
  const left = Math.round((W - width) / 2)
  const top = Math.round((H - height) / 2)

  const layers: Overlay[] = []
  if (!keepBackground) {
    // Мягкая контактная тень из силуэта вещи: вещь лежит на поверхности, а не висит в воздухе.
    const shadow = await sharp(garment.data)
      .extractChannel('alpha')
      .linear(0.14, 0)
      .toBuffer()
      .then((alpha) =>
        sharp({ create: { width, height, channels: 3, background: '#000000' } })
          .joinChannel(alpha)
          .png()
          .toBuffer(),
      )
      .then((b) => sharp(b).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(18).png().toBuffer())
    layers.push({ input: shadow, left: left - 40, top: top - 40 + 14 })
  }
  layers.push({ input: garment.data, left, top })

  return sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(layers)
}

let imported = 0
let skipped = 0
const problems: string[] = []

if (existsSync(IN)) {
  for (const slug of readdirSync(IN)) {
    if (slug.startsWith('.')) continue
    const dir = join(IN, slug)
    const product = products.find((p) => p.slug === slug)
    if (!product) {
      problems.push(`Папка photos/${slug}: такого товара нет в каталоге`)
      continue
    }
    for (const file of readdirSync(dir)) {
      const ext = extname(file).toLowerCase()
      if (!INPUT_EXT.has(ext)) continue
      const match = FILE.exec(file.slice(0, -ext.length).toLowerCase())
      const color = match && product.colors.find((c) => c.id === match[1])
      if (!match || !color) {
        problems.push(
          `photos/${slug}/${file}: ожидается <цвет>-front или <цвет>-back, цвета: ${product.colors.map((c) => c.id).join(', ')}`,
        )
        continue
      }
      const input = join(dir, file)
      const output = join(OUT, slug, `${color.id}-${match[2]}.webp`)
      if (!reprocessAll && existsSync(output) && statSync(output).mtimeMs > statSync(input).mtimeMs) {
        skipped++
        continue
      }
      process.stdout.write(`… ${slug}/${color.id}-${match[2]}`)
      try {
        mkdirSync(join(OUT, slug), { recursive: true })
        await (await render(input)).webp({ quality: 82 }).toFile(output)
        imported++
        process.stdout.write(` ✓\n`)
      } catch (err) {
        process.stdout.write(` ✗\n`)
        problems.push(`photos/${slug}/${file}: не удалось обработать — ${(err as Error).message}`)
      }
    }
  }
}

// Список по факту лежащих в public/products WebP — учитывает и ранее импортированные фото.
const manifest: Record<string, string[]> = {}
for (const p of products) {
  for (const c of p.colors) {
    const views = VIEWS.filter((v) => existsSync(join(OUT, p.slug, `${c.id}-${v}.webp`)))
    if (views.includes('front')) manifest[`${p.slug}/${c.id}`] = views
  }
}

const manifestSource =
  `// Сгенерировано scripts/import-photos.ts (npm run photos) — не редактировать вручную.\n` +
  `export const productPhotos: Record<string, string[]> = ${JSON.stringify(manifest, null, 2)}\n`
if (readFileSync(MANIFEST, 'utf8') !== manifestSource) writeFileSync(MANIFEST, manifestSource)

const missing = products.flatMap((p) => p.colors.filter((c) => !manifest[`${p.slug}/${c.id}`]).map((c) => `${p.slug}/${c.id}`))
console.info(
  `\nОбработано: ${imported}, без изменений: ${skipped}. С настоящими фото: ${Object.keys(manifest).length}, на заглушках: ${missing.length}.`,
)
if (missing.length) console.info(`Пока заглушки: ${missing.join(', ')}`)
for (const p of problems) console.warn(`⚠ ${p}`)
