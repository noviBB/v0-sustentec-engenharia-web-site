"use client"

import { Award, FileCheck, MapPin, Users } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function StatsSection() {
  const { t } = useLanguage()

  const stats = [
    {
      icon: Award,
      value: "+10",
      label: t("stats.years"),
      description: t("stats.yearsDesc"),
    },
    {
      icon: FileCheck,
      value: "+1.000",
      label: t("stats.processes"),
      description: t("stats.processesDesc"),
    },
    {
      icon: MapPin,
      value: "RJ",
      label: t("stats.coverage"),
      description: t("stats.coverageDesc"),
    },
    {
      icon: Users,
      value: "",
      label: t("stats.team"),
      description: t("stats.teamDesc"),
    },
  ]

  return (
    <section className="py-16 bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                {stat.value && (
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                )}
                <div className="text-sm font-semibold text-sidebar-foreground mb-1">
                  {stat.label}
                </div>
                <p className="text-xs text-sidebar-foreground/70">
                  {stat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
