import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import type { PickupPoint } from '@/entities/order/api/deliveryApi'

interface Props {
  points: PickupPoint[]
  selected: string | null
  onSelect: (code: string) => void
}

const BASE_STYLE: L.CircleMarkerOptions = { radius: 7, color: '#20261c', weight: 1.5, fillColor: '#ece4d4', fillOpacity: 1 }
const SELECTED_STYLE: L.CircleMarkerOptions = { radius: 10, color: '#20261c', weight: 2, fillColor: '#20261c', fillOpacity: 1 }

/*
 * Карта пунктов выдачи СДЭК: Leaflet + OpenStreetMap, без ключей и сторонних скриптов (CSP разрешает только тайлы OSM).
 * Грузится отдельным чанком только на странице заказа. Маркеры — векторные кружки: без картинок-иконок.
 * Список пунктов под картой — основной способ выбора (и с клавиатуры), карта — наглядная подсказка.
 */
export default function PickupPointMap({ points, selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.CircleMarker>())
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    if (!box.current) return
    const markerMap = markers.current
    const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m)
    // Без префикса «Leaflet» с флажком: подпись OpenStreetMap (обязательна по лицензии) остаётся.
    m.attributionControl.setPrefix(false)
    map.current = m
    return () => {
      m.remove()
      map.current = null
      markerMap.clear()
    }
  }, [])

  // Новый город — новые маркеры и рамка карты по ним.
  useEffect(() => {
    const m = map.current
    if (!m) return
    for (const marker of markers.current.values()) marker.remove()
    markers.current.clear()
    for (const p of points) {
      const marker = L.circleMarker([p.lat, p.lon], BASE_STYLE)
        .bindTooltip(p.address, { direction: 'top', offset: [0, -6] })
        .on('click', () => onSelectRef.current(p.code))
        .addTo(m)
      markers.current.set(p.code, marker)
    }
    if (points.length) m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon] as L.LatLngTuple)), { padding: [24, 24], maxZoom: 15 })
  }, [points])

  // Выбранный пункт — тёмный кружок поверх остальных и в центре карты.
  useEffect(() => {
    for (const [code, marker] of markers.current) {
      const active = code === selected
      marker.setStyle(active ? SELECTED_STYLE : BASE_STYLE)
      if (active) {
        marker.bringToFront()
        map.current?.panTo(marker.getLatLng())
      }
    }
  }, [selected, points])

  return <div ref={box} className="h-64 w-full overflow-hidden rounded-lg border border-ink/15 md:h-80" aria-hidden />
}
