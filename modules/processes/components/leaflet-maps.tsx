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
import type { ProcessStatus } from "@/lib/db/enums"
import { statusPinColor } from "./map-pin-color"

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

// A colored teardrop map-pin built as an inline SVG `divIcon`. Filling the pin
// with the status hex (white stroke + soft drop shadow) lets a marker carry its
// status at a glance. The 24x36 viewBox tip sits at the bottom-center, so the
// anchor is (12, 36) and the popup opens just above the tip.
const ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"

function coloredPinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24c0-6.6-5.4-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="2" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35));"/>
    <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
  })
}

interface SingleMarkerMapProps {
  lat: number
  lng: number
  label: string
  /** When provided, the marker uses a status-colored pin instead of the default. */
  status?: ProcessStatus
}

export function SingleMarkerMap({
  lat,
  lng,
  label,
  status,
}: SingleMarkerMapProps) {
  useEffect(() => {
    fixDefaultIcon()
  }, [])

  const icon = useMemo(
    () => (status ? coloredPinIcon(statusPinColor(status)) : undefined),
    [status],
  )

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
            attribution={ESRI_ATTRIBUTION}
            url={ESRI_TILE_URL}
          />
          <Marker position={[lat, lng]} {...(icon ? { icon } : {})}>
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
            attribution={ESRI_ATTRIBUTION}
            url={ESRI_TILE_URL}
          />
          {points.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={coloredPinIcon(statusPinColor(p.status))}
            >
              <Popup>{p.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </MapShell>
  )
}
