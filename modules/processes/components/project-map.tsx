"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import type { ProcessStatus } from "@/lib/db/enums"

interface ProjectMapProps {
  latitude: string | number | null
  longitude: string | number | null
  /** Optional label shown on the popup. Defaults to the i18n map title. */
  label?: string | null
  /** The process status — colors the marker pin when provided. */
  status?: ProcessStatus
}

function parseCoord(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

// Leaflet pokes at `window` on import. `next/dynamic` with `ssr: false` is
// the standard escape hatch — keep the inner component in a separate
// dynamic-imported module so SSR never tries to evaluate it.
const SingleMarkerMap = dynamic(
  () => import("./leaflet-maps").then((m) => m.SingleMarkerMap),
  { ssr: false },
)

export function ProjectMap({
  latitude,
  longitude,
  label,
  status,
}: ProjectMapProps) {
  const { t } = useLanguage()
  const lat = parseCoord(latitude)
  const lng = parseCoord(longitude)

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide">
          {t("portal.map.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lat === null || lng === null ? (
          <div className="text-center py-10 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("portal.map.noCoordinates")}</p>
          </div>
        ) : (
          <div className="h-72 rounded-lg overflow-hidden border border-gray-100">
            <SingleMarkerMap
              lat={lat}
              lng={lng}
              label={label ?? t("portal.map.title")}
              status={status}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
