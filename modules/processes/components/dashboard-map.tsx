"use client"

import dynamic from "next/dynamic"
import type { ProcessRow } from "@/modules/processes/processes.repo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { ProcessStatus } from "@/lib/db/enums"
import { statusPinColor } from "./map-pin-color"

interface DashboardMapProps {
  processes: ProcessRow[]
}

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  status: ProcessStatus
}

/** The statuses plotted on the dashboard map, in legend order. */
const LEGEND_STATUSES: ProcessStatus[] = [
  ProcessStatus.Andamento,
  ProcessStatus.Acompanhamento,
]

function parseCoord(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

const MultiMarkerMap = dynamic(
  () => import("./leaflet-maps").then((m) => m.MultiMarkerMap),
  { ssr: false },
)

/**
 * Dashboard map — plots all of a client's `andamento` / `acompanhamento`
 * projects with coordinates. Finalized projects are hidden so the map stays
 * focused on what's actually active.
 */
export function DashboardMap({ processes }: DashboardMapProps) {
  const { t } = useLanguage()

  const points: MapPoint[] = processes
    .filter(
      (p) =>
        p.status === ProcessStatus.Andamento ||
        p.status === ProcessStatus.Acompanhamento,
    )
    .map((p) => {
      const lat = parseCoord(p.latitude)
      const lng = parseCoord(p.longitude)
      if (lat === null || lng === null) return null
      return {
        id: p.id,
        lat,
        lng,
        label: p.name ?? p.code ?? p.id,
        status: p.status,
      }
    })
    .filter((pt): pt is MapPoint => pt !== null)

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide">
          {t("portal.map.dashboardTitle")}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {LEGEND_STATUSES.map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: statusPinColor(status) }}
                aria-hidden
              />
              {t(`portal.map.legend.${status}`)}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("portal.map.noCoordinates")}</p>
          </div>
        ) : (
          <div className="h-96 rounded-lg overflow-hidden border border-gray-100">
            <MultiMarkerMap points={points} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
