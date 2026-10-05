/*
 * Генерирует SVG-плейсхолдеры товаров в public/products/<slug>/.
 * Запуск: npm run images  (Node 22.18+ — TypeScript запускается напрямую)
 * Когда будут реальные фото — просто замените файлы или пути в каталоге.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from '../src/entities/product/model/catalog.ts'
import type { GarmentKind, Product, ProductColor } from '../src/entities/product/model/types.ts'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'products')
const W = 800
const H = 1000
const BG = '#ECEBE4'

type View = 'front' | 'back'

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150
}

const LONG_TORSO =
  'M250 262 L330 232 Q400 266 470 232 L550 262 Q602 290 618 362 L662 760 L602 772 L560 446 L560 784 L240 784 L240 446 L198 772 L138 760 L182 362 Q198 290 250 262 Z'
const TEE =
  'M250 262 L330 232 Q400 266 470 232 L550 262 L664 344 L612 436 L560 404 L560 784 L240 784 L240 404 L188 436 L136 344 Z'

function garment(kind: GarmentKind, view: View, color: string): string {
  const dark = shade(color, -0.12)
  const darker = shade(color, -0.2)
  const line = shade(color, isLight(color) ? -0.25 : 0.12)
  const print = isLight(color) ? '#20261C' : '#F1EEE4'
  const stroke = `stroke="${line}" stroke-width="2" fill="none"`

  const chestLogo = `<text x="400" y="372" font-family="Georgia, serif" font-size="26" letter-spacing="10" fill="${print}" text-anchor="middle" opacity="0.9">SERAFIM</text>`
  const backPrint = `
    <text x="400" y="430" font-family="Georgia, serif" font-size="40" letter-spacing="12" fill="${print}" text-anchor="middle" opacity="0.92">SERAFIM</text>
    <text x="400" y="480" font-family="Georgia, serif" font-size="14" letter-spacing="8" fill="${print}" text-anchor="middle" opacity="0.7">PURE NATURE · MMXXVI</text>`

  const hem = `<path d="M240 752 L560 752" ${stroke} opacity="0.6"/>`
  const cuffs = `<path d="M204 742 L262 750 M596 750 L654 742" ${stroke} opacity="0.6"/>`
  const neckFront = `<path d="M330 232 Q400 300 470 232" ${stroke}/>`
  const neckBack = `<path d="M330 232 Q400 250 470 232" ${stroke}/>`

  switch (kind) {
    case 'tee':
      return `<path d="${TEE}" fill="${color}"/>${view === 'front' ? neckFront + chestLogo : neckBack + backPrint}
        <path d="M188 436 L240 404 M612 436 L560 404" ${stroke} opacity="0.5"/>`
    case 'longsleeve':
      return `<path d="${LONG_TORSO}" fill="${color}"/>${view === 'front' ? neckFront + chestLogo : neckBack + backPrint}${cuffs}`
    case 'sweatshirt':
      return `<path d="${LONG_TORSO}" fill="${color}"/>${view === 'front' ? neckFront + chestLogo : neckBack + backPrint}${hem}${cuffs}`
    case 'hoodie':
    case 'zip-hoodie': {
      const torso = `<path d="${LONG_TORSO}" fill="${color}"/>`
      if (view === 'back') {
        return `${torso}<path d="M318 246 Q300 128 400 116 Q500 128 482 246 Q444 336 400 336 Q356 336 318 246 Z" fill="${dark}"/>
          <path d="M400 118 L400 334" ${stroke} opacity="0.4"/>
          <g transform="translate(0 70)">${backPrint}</g>${hem}${cuffs}`
      }
      const hood = `<path d="M314 250 Q296 126 400 112 Q504 126 486 250 L470 232 Q400 270 330 232 Z" fill="${darker}"/>
        <path d="M338 238 Q400 170 462 238 Q400 296 338 238 Z" fill="${shade(color, -0.32)}"/>`
      const pocket = `<path d="M296 590 L504 590 L534 712 L266 712 Z" ${stroke} opacity="0.7"/>`
      const zip =
        kind === 'zip-hoodie'
          ? `<path d="M400 268 L400 784" stroke="${line}" stroke-width="5"/><rect x="393" y="282" width="14" height="26" rx="3" fill="#B9B6AC"/><rect x="393" y="740" width="14" height="26" rx="3" fill="#B9B6AC"/>`
          : `<path d="M384 268 L380 360 M416 268 L420 360" stroke="#E9E5DA" stroke-width="4" stroke-linecap="round"/>`
      const logo = kind === 'zip-hoodie' ? `<g transform="translate(-92 40)">${chestLogo}</g>` : `<g transform="translate(0 30)">${chestLogo}</g>`
      return `${torso}${hood}${pocket}${zip}${logo}${hem}${cuffs}`
    }
    case 'pants':
      return `<path d="M270 184 L530 184 L566 824 L444 824 L404 372 L396 372 L356 824 L234 824 Z" fill="${color}"/>
        <rect x="270" y="184" width="260" height="38" fill="${dark}"/>
        ${view === 'front' ? `<path d="M388 222 L398 222 M402 222 L412 222 M380 222 Q376 260 400 236" ${stroke}/><path d="M282 240 Q316 300 330 252 M518 240 Q484 300 470 252" ${stroke} opacity="0.6"/>` : `<path d="M300 300 L360 300 L360 360 L300 360 Z M440 300 L500 300 L500 360 L440 360 Z" ${stroke} opacity="0.6"/>`}
        <path d="M236 800 L356 800 M444 800 L564 800" ${stroke} opacity="0.5"/>
        <text x="${view === 'front' ? 310 : 400}" y="${view === 'front' ? 700 : 280}" font-family="Georgia, serif" font-size="16" letter-spacing="6" fill="${print}" text-anchor="middle" opacity="0.85">SERAFIM</text>`
    case 'cap':
      return view === 'front'
        ? `<path d="M240 560 Q240 340 400 330 Q560 340 560 560 Z" fill="${color}"/>
           <path d="M400 332 L400 560 M320 345 Q300 450 310 560 M480 345 Q500 450 490 560" ${stroke} opacity="0.5"/>
           <path d="M220 560 Q400 520 580 560 Q600 640 400 650 Q200 640 220 560 Z" fill="${dark}"/>
           <circle cx="400" cy="332" r="9" fill="${darker}"/>
           <text x="400" y="480" font-family="Georgia, serif" font-size="30" letter-spacing="10" fill="${print}" text-anchor="middle">SERAFIM</text>`
        : `<path d="M240 600 Q240 380 400 370 Q560 380 560 600 Z" fill="${color}"/>
           <path d="M340 600 Q340 520 400 520 Q460 520 460 600 Z" fill="${BG}"/>
           <rect x="352" y="560" width="96" height="14" fill="${darker}"/><rect x="430" y="555" width="22" height="24" fill="#B9B6AC"/>
           <path d="M400 372 L400 520" ${stroke} opacity="0.5"/>
           <circle cx="400" cy="372" r="9" fill="${darker}"/>`
  }
}

function shadow(kind: GarmentKind): string {
  const y = kind === 'cap' ? 680 : 850
  return `<ellipse cx="400" cy="${y}" rx="230" ry="18" fill="#000" opacity="0.07"/>`
}

function svg(viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<rect x="-1000" y="-1000" width="3000" height="3000" fill="${BG}"/>
${body}
</svg>
`
}

function productSvgs(p: Product, c: ProductColor): Record<string, string> {
  const front = shadow(p.kind) + garment(p.kind, 'front', c.hex)
  const back = shadow(p.kind) + garment(p.kind, 'back', c.hex)
  const detailBox = p.kind === 'cap' ? '220 330 360 450' : p.kind === 'pants' ? '220 150 360 450' : '200 220 400 500'
  return {
    [`${c.id}-front.svg`]: svg(`0 0 ${W} ${H}`, front),
    [`${c.id}-back.svg`]: svg(`0 0 ${W} ${H}`, back),
    [`${c.id}-detail.svg`]: svg(detailBox, front),
  }
}

const CHARTS: Partial<Record<GarmentKind, { cols: string[]; rows: (string | number)[][] }>> = {
  tee: { cols: ['Размер', 'Длина', 'Ширина', 'Рукав'], rows: [['XS', 68, 56, 22], ['S', 70, 58, 23], ['M', 72, 60, 24], ['L', 74, 62, 25], ['XL', 76, 64, 26]] },
  longsleeve: { cols: ['Размер', 'Длина', 'Ширина', 'Рукав'], rows: [['XS', 68, 52, 62], ['S', 70, 54, 63], ['M', 72, 56, 64], ['L', 74, 58, 65], ['XL', 76, 60, 66]] },
  sweatshirt: { cols: ['Размер', 'Длина', 'Ширина', 'Рукав'], rows: [['XS', 64, 58, 56], ['S', 66, 60, 57], ['M', 68, 62, 58], ['L', 70, 64, 59], ['XL', 72, 66, 60]] },
  hoodie: { cols: ['Размер', 'Длина', 'Ширина', 'Рукав'], rows: [['XS', 66, 60, 56], ['S', 68, 62, 57], ['M', 70, 64, 58], ['L', 72, 66, 59], ['XL', 74, 68, 60]] },
  'zip-hoodie': { cols: ['Размер', 'Длина', 'Ширина', 'Рукав'], rows: [['XS', 56, 60, 58], ['S', 58, 62, 59], ['M', 60, 64, 60], ['L', 62, 66, 61], ['XL', 64, 68, 62]] },
  pants: { cols: ['Размер', 'Длина', 'Талия', 'Бедро'], rows: [['XS', 100, 34, 56], ['S', 102, 36, 58], ['M', 104, 38, 60], ['L', 106, 40, 62], ['XL', 108, 42, 64]] },
}

function sizeChart(kind: GarmentKind): string | null {
  const chart = CHARTS[kind]
  if (!chart) return null
  const font = `font-family="ui-monospace, 'JetBrains Mono', monospace"`
  const colX = [130, 300, 470, 640]
  const head = chart.cols.map((c, i) => `<text x="${colX[i]}" y="330" ${font} font-size="22" fill="#6B7062" text-anchor="middle">${c}</text>`).join('')
  const rows = chart.rows
    .map((r, ri) => {
      const y = 410 + ri * 80
      const cells = r.map((v, i) => `<text x="${colX[i]}" y="${y}" ${font} font-size="26" fill="#20261C" text-anchor="middle">${v}</text>`).join('')
      return `${cells}<line x1="60" x2="740" y1="${y + 34}" y2="${y + 34}" stroke="#20261C" stroke-opacity="0.12"/>`
    })
    .join('')
  return svg(
    `0 0 ${W} ${H}`,
    `<text x="400" y="200" ${font} font-size="30" letter-spacing="8" fill="#20261C" text-anchor="middle">РАЗМЕРНАЯ СЕТКА</text>
     <text x="400" y="244" ${font} font-size="18" fill="#6B7062" text-anchor="middle">замеры изделия в сантиметрах</text>
     <line x1="60" x2="740" y1="362" y2="362" stroke="#20261C" stroke-opacity="0.3"/>${head}${rows}`,
  )
}

let count = 0
for (const p of products) {
  const dir = join(OUT, p.slug)
  mkdirSync(dir, { recursive: true })
  for (const c of p.colors) {
    for (const [file, content] of Object.entries(productSvgs(p, c))) {
      writeFileSync(join(dir, file), content)
      count++
    }
  }
  const chart = sizeChart(p.kind)
  if (chart) {
    writeFileSync(join(dir, 'size-chart.svg'), chart)
    count++
  }
}
console.log(`Сгенерировано ${count} изображений в ${OUT}`)
