/*
 * Генерирует SVG-плейсхолдеры товаров в public/products/<slug>/.
 * Запуск: npm run images  (Node 22.18+ — TypeScript запускается напрямую)
 * Когда будут реальные фото — `npm run photos` (они автоматически заменят заглушки).
 * Размерная сетка — не картинка, а таблица из замеров в каталоге (ProductView).
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

  switch (kind) {
    case 'hoodie': {
      const torso = `<path d="${LONG_TORSO}" fill="${color}"/>`
      if (view === 'back') {
        return `${torso}<path d="M318 246 Q300 128 400 116 Q500 128 482 246 Q444 336 400 336 Q356 336 318 246 Z" fill="${dark}"/>
          <path d="M400 118 L400 334" ${stroke} opacity="0.4"/>
          <g transform="translate(0 70)">${backPrint}</g>${hem}${cuffs}`
      }
      const hood = `<path d="M314 250 Q296 126 400 112 Q504 126 486 250 L470 232 Q400 270 330 232 Z" fill="${darker}"/>
        <path d="M338 238 Q400 170 462 238 Q400 296 338 238 Z" fill="${shade(color, -0.32)}"/>`
      const pocket = `<path d="M296 590 L504 590 L534 712 L266 712 Z" ${stroke} opacity="0.7"/>`
      const strings = `<path d="M384 268 L380 360 M416 268 L420 360" stroke="#E9E5DA" stroke-width="4" stroke-linecap="round"/>`
      return `${torso}${hood}${pocket}${strings}<g transform="translate(0 30)">${chestLogo}</g>${hem}${cuffs}`
    }
    case 'rugby': {
      // Регбийка: длинный рукав, отложной воротник и планка с пуговицами.
      const torso = `<path d="${LONG_TORSO}" fill="${color}"/>`
      if (view === 'back') {
        return `${torso}<path d="M330 232 Q400 262 470 232 L462 252 Q400 282 338 252 Z" fill="${dark}"/>${backPrint}${hem}${cuffs}`
      }
      const collar = `<path d="M330 232 L400 300 L372 320 L316 254 Z M470 232 L400 300 L428 320 L484 254 Z" fill="${dark}"/>`
      const placket = `<rect x="388" y="298" width="24" height="96" fill="${shade(color, -0.06)}"/>
        <circle cx="400" cy="324" r="4" fill="#E9E5DA"/><circle cx="400" cy="352" r="4" fill="#E9E5DA"/><circle cx="400" cy="380" r="4" fill="#E9E5DA"/>`
      return `${torso}${collar}${placket}<g transform="translate(0 70)">${chestLogo}</g>${hem}${cuffs}`
    }
    case 'backpack': {
      const body = `<rect x="250" y="300" width="300" height="440" rx="70" fill="${color}"/>`
      const handle = `<path d="M350 300 Q350 236 400 236 Q450 236 450 300" fill="none" stroke="${dark}" stroke-width="14" stroke-linecap="round"/>`
      if (view === 'back') {
        return `${handle}${body}<path d="M305 330 Q284 520 314 720 M495 330 Q516 520 486 720" fill="none" stroke="${dark}" stroke-width="22" stroke-linecap="round"/>`
      }
      return `${handle}${body}<path d="M280 380 Q400 340 520 380" ${stroke}/>
        <rect x="295" y="520" width="210" height="170" rx="36" fill="${dark}"/>
        <text x="400" y="460" font-family="Georgia, serif" font-size="26" letter-spacing="8" fill="${print}" text-anchor="middle">SERAFIM</text>`
    }
  }
}

function shadow(kind: GarmentKind): string {
  const y = kind === 'backpack' ? 780 : 850
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
  const detailBox = p.kind === 'backpack' ? '220 300 360 450' : '200 220 400 500'
  return {
    [`${c.id}-front.svg`]: svg(`0 0 ${W} ${H}`, front),
    [`${c.id}-back.svg`]: svg(`0 0 ${W} ${H}`, back),
    [`${c.id}-detail.svg`]: svg(detailBox, front),
  }
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
}
console.log(`Сгенерировано ${count} изображений в ${OUT}`)
