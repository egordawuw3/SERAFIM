import { useSyncExternalStore } from 'react'

/*
 * Виден ли баннер бренда (огромное SERAFIM на главной). Пока он на экране, логотип в шапке спрятан —
 * чтобы название не стояло дважды подряд; при прокрутке логотип плавно появляется.
 * Баннер сообщает о себе через IntersectionObserver, шапка подписывается. По умолчанию «виден» —
 * так готовый HTML главной сразу без дубля, а на других страницах шапка этот флаг не учитывает.
 */
let inView = true
const listeners = new Set<() => void>()

export function setBannerInView(value: boolean) {
  if (value === inView) return
  inView = value
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useBannerInView = () => useSyncExternalStore(subscribe, () => inView, () => true)
