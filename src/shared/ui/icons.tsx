import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

export const ArrowRight = (p: IconProps) => (
  <svg {...base} {...p}>
    <path strokeLinecap="square" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

export const ArrowLeft = (p: IconProps) => (
  <svg {...base} {...p}>
    <path strokeLinecap="square" d="M7 8l-4 4m0 0l4 4m-4-4h18" />
  </svg>
)

export const Close = (p: IconProps) => (
  <svg {...base} strokeWidth={1.5} {...p}>
    <path strokeLinecap="square" d="M5 5l14 14M19 5L5 19" />
  </svg>
)

export const ChevronLeft = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 4l-8 8 8 8" />
  </svg>
)

export const ChevronRight = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 4l8 8-8 8" />
  </svg>
)

export const Caret = (p: IconProps) => (
  <svg viewBox="0 0 10 6" aria-hidden {...p}>
    <path d="M0 0h10L5 6z" fill="currentColor" />
  </svg>
)

export const ChevronDown = (p: IconProps) => (
  <svg {...base} strokeWidth={1.5} {...p}>
    <path d="M5 9l7 7 7-7" />
  </svg>
)
