"use client"

/**
 * Inner leaflet renderers. This module is the one that actually imports
 * `leaflet` + `react-leaflet`, both of which touch `window` on import — so it
 * is ONLY loaded via `next/dynamic` with `{ ssr: false }` from
 * `project-map.tsx` / `dashboard-map.tsx`. Do not import it from anywhere
 * else.
 */

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import { useEffect, useId, useMemo, useState, type ReactNode } from "react"

import type { MapPoint } from "./dashboard-map"

// React StrictMode (dev) double-invokes mount effects, which makes react-leaflet
// try to initialize Leaflet twice on the same DOM node and throw "Map container
// is already initialized" — crashing the dashboard in `pnpm dev` (prod, with no
// double-invoke, is unaffected). `MapShell` defers the MapContainer to a
// post-mount render so it mounts exactly once on a fresh, uniquely-keyed node.
function MapShell({ children }: { children: (key: string) => ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const instanceKey = useId()
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) {
    return <div style={{ height: "100%", width: "100%" }} aria-hidden />
  }
  return <>{children(instanceKey)}</>
}

// The two private members we touch on Leaflet's default-icon prototype:
// `_getIconUrl` (the bundler-broken path resolver we delete) and our own
// idempotency flag. Typed precisely so we never reach for `any`.
interface LeafletIconProto {
  _getIconUrl?: unknown
  _sustentecIconFixed?: boolean
}

// Narrows the (loosely typed) Leaflet prototype to the private members we
// touch, via a structural type guard — no `as` needed. Both members are
// optional, so the guard verifies the shapes that are present and otherwise
// treats absent members as "not yet set" (the prototype is a fresh object).
function isLeafletIconProto(value: object): value is LeafletIconProto {
  // `_sustentecIconFixed` is our own optional flag; when present it must be a
  // boolean. When absent the prototype is fresh (not yet patched), which is
  // still a valid `LeafletIconProto` since the member is optional.
  if (!('_sustentecIconFixed' in value)) return true
  const flag: unknown = value._sustentecIconFixed
  return typeof flag === 'boolean'
}

// Leaflet's default icon paths break under bundlers. Re-point them at the
// public CDN once, on first import.
function fixDefaultIcon(): void {
  const proto: object = L.Icon.Default.prototype
  if (!isLeafletIconProto(proto)) return
  if (proto._sustentecIconFixed) return
  delete proto._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })
  proto._sustentecIconFixed = true
}

interface SingleMarkerMapProps {
  lat: number
  lng: number
  label: string
}

export function SingleMarkerMap({ lat, lng, label }: SingleMarkerMapProps) {
  useEffect(() => {
    fixDefaultIcon()
  }, [])

  return (
    <MapShell>
      {(mapKey) => (
        <MapContainer
          key={mapKey}
          center={[lat, lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>
            <Popup>{label}</Popup>
          </Marker>
        </MapContainer>
      )}
    </MapShell>
  )
}

interface MultiMarkerMapProps {
  points: MapPoint[]
}

export function MultiMarkerMap({ points }: MultiMarkerMapProps) {
  useEffect(() => {
    fixDefaultIcon()
  }, [])

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return [-23.55, -46.63] // São Paulo fallback
    const sumLat = points.reduce((acc, p) => acc + p.lat, 0)
    const sumLng = points.reduce((acc, p) => acc + p.lng, 0)
    return [sumLat / points.length, sumLng / points.length]
  }, [points])

  return (
    <MapShell>
      {(mapKey) => (
        <MapContainer
          key={mapKey}
          center={center}
          zoom={points.length === 1 ? 13 : 10}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup>{p.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </MapShell>
  )
}
